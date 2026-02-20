import type { Diff } from "diff-match-patch";
import { DIFF_DELETE, DIFF_INSERT, diff_match_patch } from "diff-match-patch";
import { DELETE_PLACEHOLDER, RANGE_START, RANGE_END } from "./constants";
import type { Change } from "./types";
import { splitTextByRangeMarkers, changesToDiffs, diffsToChanges, mergeAdjacentSegments, isRangeStart, isRangeEnd } from "./diff-utils";

/**
 * Layers new changes on top of an existing diff.
 *
 * Takes an existing paragraph expressed as a diff and computes the changes
 * needed to transform it to the target text. Already-deleted text cannot be
 * deleted again (it's replaced with placeholders during diff computation).
 *
 * The returned diff contains only the NEW changes to add on top of the existing
 * diff - it does not include the existing diff's operations.
 */
export function layerDiffs(
  existingDiff: Change[],
  targetText: string,
  id: string
): Change[] {
  // Step 1: Build string with placeholders for deleted text
  // - EQUAL text stays as-is
  // - INSERT text stays as-is (insertions can be deleted later)
  // - DELETE text is replaced with placeholder (one placeholder per deletion)
  let stringWithPlaceholders = "";
  const deletedTexts: string[] = [];
  for (const change of existingDiff) {
    if (change.op === "delete") {
      stringWithPlaceholders += DELETE_PLACEHOLDER;
      deletedTexts.push(change.text);
    } else {
      stringWithPlaceholders += change.text;
    }
  }

  // Step 2: Compute diff against target (without semantic cleanup to preserve placeholders)
  const dmp = new diff_match_patch();
  const rawDiffs: Diff[] = dmp.diff_main(stringWithPlaceholders, targetText);
  // Don't call diff_cleanupSemantic here - it rearranges the diff and corrupts placeholder handling

  // Step 3: Process placeholders in the diff result
  // - Placeholders in DELETE operations → restore as EQUAL (text exists in document, just marked deleted)
  // - Placeholders in EQUAL operations → restore as EQUAL
  // - Other text is processed normally
  const result: Change[] = [];
  let deletedIndex = 0;
  const placeholderDerivedIndices = new Set<number>();

  for (const [op, text] of rawDiffs) {
    // Process the text, handling placeholders
    let remaining = text;
    while (remaining.length > 0) {
      const placeholderIndex = remaining.indexOf(DELETE_PLACEHOLDER);

      if (placeholderIndex === -1) {
        // No placeholder in remaining text
        if (op === DIFF_INSERT) {
          result.push({ op: "insert", text: remaining, id });
        } else if (op === DIFF_DELETE) {
          result.push({ op: "delete", text: remaining, id });
        } else {
          result.push({ op: "equal", text: remaining });
        }
        break;
      }

      // Handle text before the placeholder
      if (placeholderIndex > 0) {
        const beforePlaceholder = remaining.slice(0, placeholderIndex);
        if (op === DIFF_INSERT) {
          result.push({ op: "insert", text: beforePlaceholder, id });
        } else if (op === DIFF_DELETE) {
          result.push({ op: "delete", text: beforePlaceholder, id });
        } else {
          result.push({ op: "equal", text: beforePlaceholder });
        }
      }

      // Restore the deleted text as EQUAL (it exists in the document)
      // Track this index as placeholder-derived for range expansion
      const deletedText = deletedTexts[deletedIndex++];
      if (deletedText) {
        placeholderDerivedIndices.add(result.length);
        result.push({ op: "equal", text: deletedText });
      }

      // Continue with text after the placeholder
      remaining = remaining.slice(placeholderIndex + 1);
    }
  }

  // Step 4: Split inserts containing range markers into separate inserts
  // This is needed so the expansion logic can identify isolated RANGE_START markers
  const splitResult: Change[] = [];
  const updatedPlaceholderIndices = new Set<number>();

  for (const [i, change] of result.entries()) {
    if (
      change.op === "insert" &&
      (change.text.includes(RANGE_START) || change.text.includes(RANGE_END))
    ) {
      // Split this insert by range markers
      const parts = splitTextByRangeMarkers(change.text);
      for (const part of parts) {
        if (part.length > 0) {
          splitResult.push({ op: "insert", text: part, id: change.id });
        }
      }
    } else {
      // Track placeholder-derived indices in the new array
      if (placeholderDerivedIndices.has(i)) {
        updatedPlaceholderIndices.add(splitResult.length);
      }
      splitResult.push(change);
    }
  }

  // Step 5: Expand empty ranges to include placeholder-derived equals to the left
  // Only expand when RANGE_START is immediately followed by RANGE_END (empty range).
  // This handles the "accept delete" case where the user places empty range markers
  // at the position of a delete. We don't expand when the range has content, as that
  // would override the user's explicit range placement.
  for (let i = splitResult.length - 1; i > 0; i--) {
    const change = splitResult[i];
    const nextChange = splitResult[i + 1];
    const prev = splitResult[i - 1];

    if (!change || !prev) continue;

    if (isRangeStart(change)) {
      // Only expand if this is an empty range (RANGE_START immediately followed by RANGE_END)
      if (!nextChange || !isRangeEnd(nextChange)) {
        continue;
      }

      // Check if previous element is a placeholder-derived equal
      if (updatedPlaceholderIndices.has(i - 1)) {
        // Don't swap if the element before that is RANGE_END (avoid disrupting other ranges)
        if (i > 1) {
          const beforePrev = splitResult[i - 2];
          if (beforePrev && isRangeEnd(beforePrev)) {
            continue;
          }
        }
        // Swap: move RANGE_START before the placeholder-derived equal
        splitResult[i - 1] = change;
        splitResult[i] = prev;
        // Update tracking set since indices shifted
        updatedPlaceholderIndices.delete(i - 1);
        updatedPlaceholderIndices.add(i);
      }
    }
  }

  // Step 6: Merge adjacent segments of the same type
  const merged = mergeAdjacentSegments(splitResult);

  // Step 7: Apply semantic cleanup on the cleaned result
  return applySemanticCleanup(merged, id);
}

function applySemanticCleanup(changes: Change[], id: string): Change[] {
  // Convert back to diff-match-patch format, apply semantic cleanup, then convert back
  const dmp = new diff_match_patch();
  const diffs = changesToDiffs(changes);
  dmp.diff_cleanupSemantic(diffs);
  return diffsToChanges(diffs, id);
}

