import type { Diff } from "diff-match-patch";
import { DIFF_DELETE, DIFF_INSERT, diff_match_patch } from "diff-match-patch";
import { DELETE_PLACEHOLDER } from "./constants";
import type { Change } from "./semanticDiff";

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
      const deletedText = deletedTexts[deletedIndex++];
      if (deletedText) {
        result.push({ op: "equal", text: deletedText });
      }

      // Continue with text after the placeholder
      remaining = remaining.slice(placeholderIndex + 1);
    }
  }

  // Step 4: Merge adjacent segments of the same type
  const merged = mergeAdjacentSegments(result);

  // Step 5: Apply semantic cleanup on the cleaned result
  return applySemanticCleanup(merged, id);
}

function mergeAdjacentSegments(changes: Change[]): Change[] {
  if (changes.length === 0) return changes;

  const result: Change[] = [];
  for (const change of changes) {
    const last = result[result.length - 1];
    // Merge adjacent segments of the same operation type (and same id for insert/delete)
    if (last && last.op === change.op) {
      if (change.op === "equal") {
        last.text += change.text;
        continue;
      }
      if (
        last.op !== "equal" &&
        (change.op === "insert" || change.op === "delete") &&
        last.id === change.id
      ) {
        last.text += change.text;
        continue;
      }
    }
    // Create new segment
    if (change.op === "equal") {
      result.push({ op: "equal", text: change.text });
    } else if (change.op === "insert") {
      result.push({ op: "insert", text: change.text, id: change.id });
    } else {
      result.push({ op: "delete", text: change.text, id: change.id });
    }
  }
  return result;
}

function applySemanticCleanup(changes: Change[], id: string): Change[] {
  // Convert back to diff-match-patch format, apply semantic cleanup, then convert back
  const dmp = new diff_match_patch();
  const diffs: Diff[] = changes.map((change) => {
    if (change.op === "equal") {
      return [0, change.text] as Diff;
    } else if (change.op === "insert") {
      return [1, change.text] as Diff;
    } else {
      return [-1, change.text] as Diff;
    }
  });

  dmp.diff_cleanupSemantic(diffs);

  return diffs.map(([op, text]) => {
    if (op === DIFF_INSERT) {
      return { op: "insert", text, id } as Change;
    } else if (op === DIFF_DELETE) {
      return { op: "delete", text, id } as Change;
    } else {
      return { op: "equal", text } as Change;
    }
  });
}
