import { layerDiffs } from "./layerDiffs";
import { mergeDiffs } from "./mergeDiffs";
import { normalizeRangeInDiff } from "./normalizeRangeInDiff";
import type { Change } from "./semanticDiff";

/**
 * Represents a single edit to apply to a paragraph.
 * The targetText should contain RANGE_START and RANGE_END markers from constants.ts
 * to indicate the semantic range of the edit.
 */
export type DiffEdit = {
  /** The target text with RANGE_START and RANGE_END markers embedded */
  targetText: string;
  /** Unique identifier for this edit */
  id: string;
};

/**
 * Restores DELETE operations from the original diff into a merged diff.
 *
 * When layerDiffs processes deleted text, it outputs it as EQUAL (because the text
 * exists in the document). This function walks through the merged result and
 * restores the original DELETE operations.
 */
function restoreOriginalDeletions(
  mergedDiff: Change[],
  existingDiff: Change[]
): Change[] {
  // Build a map of character positions that are deleted in existingDiff
  const deletedPositions = new Map<number, { id: string }>();
  let pos = 0;
  for (const change of existingDiff) {
    if (change.op === "delete") {
      for (let i = 0; i < change.text.length; i++) {
        deletedPositions.set(pos + i, { id: change.id });
      }
    }
    if (change.op !== "insert") {
      pos += change.text.length;
    }
  }

  // Walk through merged diff and restore deletions
  const result: Change[] = [];
  let docPos = 0;

  for (const change of mergedDiff) {
    if (change.op === "insert") {
      // Inserts don't correspond to document positions, just add them
      result.push(change);
      continue;
    }

    // For equal and delete, check if any part should be marked as deleted
    const text = change.text;
    let currentStart = 0;
    let currentOp: "equal" | "delete" = change.op;
    let currentId = change.op === "delete" ? change.id : "";

    for (let i = 0; i < text.length; i++) {
      const charPos = docPos + i;
      const deletedInfo = deletedPositions.get(charPos);
      const shouldBeDeleted = !!deletedInfo;
      const deleteId = deletedInfo?.id ?? "";

      // Determine what operation this character should have
      let charOp: "equal" | "delete";
      let charId: string;
      if (change.op === "delete") {
        // Already a delete in merged result, keep it
        charOp = "delete";
        charId = change.id;
      } else if (shouldBeDeleted) {
        // Was EQUAL in merged but should be DELETE (from original)
        charOp = "delete";
        charId = deleteId;
      } else {
        charOp = "equal";
        charId = "";
      }

      // Check if we need to start a new segment
      if (charOp !== currentOp || (charOp === "delete" && charId !== currentId)) {
        // Flush current segment
        if (i > currentStart) {
          const segmentText = text.slice(currentStart, i);
          if (currentOp === "equal") {
            result.push({ op: "equal", text: segmentText });
          } else {
            result.push({ op: "delete", text: segmentText, id: currentId });
          }
        }
        currentStart = i;
        currentOp = charOp;
        currentId = charId;
      }
    }

    // Flush final segment
    if (text.length > currentStart) {
      const segmentText = text.slice(currentStart);
      if (currentOp === "equal") {
        result.push({ op: "equal", text: segmentText });
      } else {
        result.push({ op: "delete", text: segmentText, id: currentId });
      }
    }

    docPos += text.length;
  }

  // Merge adjacent segments of same type
  const merged: Change[] = [];
  for (const change of result) {
    const last = merged[merged.length - 1];
    if (last && last.op === change.op) {
      if (change.op === "equal") {
        last.text += change.text;
        continue;
      }
      if (last.op !== "equal" && "id" in last && "id" in change && last.id === change.id) {
        last.text += change.text;
        continue;
      }
    }
    if (change.op === "equal") {
      merged.push({ op: "equal", text: change.text });
    } else if (change.op === "delete") {
      merged.push({ op: "delete", text: change.text, id: change.id });
    } else {
      merged.push(change);
    }
  }

  return merged;
}

/**
 * Applies multiple edits to an existing diff and merges them together.
 *
 * Takes an existing paragraph (represented as a diff with potential edits) and
 * applies multiple new edits to it. Each edit:
 * - Has range markers (RANGE_START/RANGE_END) inserted at the specified positions
 * - Is created using layerDiffs against the original
 * - Is merged with the other edits
 *
 * The final result includes both the original deletions from existingDiff and
 * all new changes from the edits.
 *
 * @param existingDiff - The starting paragraph with existing edits
 * @param edits - Array of edits to apply, each with targetText, id, and range positions
 * @returns The merged diff with all edits applied, or null if merge fails
 */
export function applyAndMergeDiffs(
  existingDiff: Change[],
  edits: DiffEdit[]
): Change[] | null {
  if (edits.length === 0) {
    return existingDiff;
  }

  // Create a layered diff for each edit
  const layeredDiffs: Change[][] = [];

  for (const edit of edits) {
    // Layer the new changes on top of the existing diff
    // The targetText already contains RANGE_START and RANGE_END markers
    const layeredDiff = layerDiffs(existingDiff, edit.targetText, edit.id);

    // Normalize range markers to ensure they're in separate inserts
    const normalizedDiff = normalizeRangeInDiff(layeredDiff);

    layeredDiffs.push(normalizedDiff);
  }

  // Merge all the layered diffs together
  const merged = mergeDiffs(...layeredDiffs);

  if (merged === null) {
    return null;
  }

  // Restore the original deletions from existingDiff
  const withDeletions = restoreOriginalDeletions(merged, existingDiff);

  // Normalize range markers to ensure they're in separate inserts
  return normalizeRangeInDiff(withDeletions);
}
