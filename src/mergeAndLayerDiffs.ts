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
export function mergeAndLayerDiffs(
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

  // Normalize range markers to ensure they're in separate inserts
  return normalizeRangeInDiff(merged);
}
