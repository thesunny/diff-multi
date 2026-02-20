import { RANGE_START, RANGE_END } from './constants';
import type { Change } from './semanticDiff';
import { splitRangeMarkersInDiff, isRangeMarker } from './diff-utils';

/**
 * Normalizes range markers (RANGE_START and RANGE_END) in a diff.
 *
 * Guarantees:
 * - Range markers (RANGE_START and RANGE_END) always appear in their own
 *   separate insert operations, never combined with other text. This makes
 *   it easy to identify and process range boundaries.
 *
 * Rules:
 * - RANGE_START must appear before all content edits for its id
 * - RANGE_END must appear after all content edits for its id
 * - If already in valid position, leave it alone
 * - If in invalid position, move to closest valid position
 */
export function normalizeRangeInDiff(diff: Change[]): Change[] {
  // Step 1: Split inserts that contain RANGE_START or RANGE_END mixed with other text
  let result = splitRangeMarkersInDiff(diff);

  // Step 2: Get all unique ids
  const ids = getUniqueIds(result);

  // Step 3: For each id, ensure proper ordering of range markers
  for (const id of ids) {
    result = normalizeRangeForId(result, id);
  }

  return result;
}

/**
 * Gets all unique ids from the diff (excluding equal operations).
 */
function getUniqueIds(diff: Change[]): Set<string> {
  const ids = new Set<string>();
  for (const change of diff) {
    if (change.op !== 'equal' && 'id' in change) {
      ids.add(change.id);
    }
  }
  return ids;
}

/**
 * Normalizes range markers for a specific id.
 */
function normalizeRangeForId(diff: Change[], targetId: string): Change[] {
  // Find indices of RANGE_START, RANGE_END, and content edits for this id
  let rangeStartIdx = -1;
  let rangeEndIdx = -1;
  let firstContentEditIdx = -1;
  let lastContentEditIdx = -1;

  for (const [i, change] of diff.entries()) {
    if (change.op === 'equal') continue;
    if (!('id' in change) || change.id !== targetId) continue;

    if (change.op === 'insert' && change.text === RANGE_START) {
      rangeStartIdx = i;
    } else if (change.op === 'insert' && change.text === RANGE_END) {
      rangeEndIdx = i;
    } else if (!isRangeMarker(change)) {
      // This is a content edit (not a range marker)
      if (firstContentEditIdx === -1) {
        firstContentEditIdx = i;
      }
      lastContentEditIdx = i;
    }
  }

  // No content edits for this id - nothing to normalize
  if (firstContentEditIdx === -1) {
    return diff;
  }

  let result = [...diff];

  // Handle RANGE_START: move it to just before first content edit if needed
  if (rangeStartIdx !== -1 && rangeStartIdx > firstContentEditIdx) {
    const [rangeStartChange] = result.splice(rangeStartIdx, 1);
    if (rangeStartChange) {
      result.splice(firstContentEditIdx, 0, rangeStartChange);
    }

    // Recalculate indices after modification
    rangeEndIdx = findRangeEndIdx(result, targetId);
    lastContentEditIdx = findLastContentEditIdx(result, targetId);
  }

  // Handle RANGE_END: move it to just after last content edit if needed
  if (rangeEndIdx !== -1 && rangeEndIdx < lastContentEditIdx) {
    const [rangeEndChange] = result.splice(rangeEndIdx, 1);
    if (rangeEndChange) {
      // After removal, lastContentEditIdx shifts down by 1 if it was after rangeEndIdx
      const adjustedLastIdx = rangeEndIdx < lastContentEditIdx ? lastContentEditIdx - 1 : lastContentEditIdx;
      result.splice(adjustedLastIdx + 1, 0, rangeEndChange);
    }
  }

  return result;
}

/**
 * Finds the index of RANGE_END for a given id.
 */
function findRangeEndIdx(diff: Change[], targetId: string): number {
  for (const [i, change] of diff.entries()) {
    if (change.op === 'insert' && 'id' in change && change.id === targetId && change.text === RANGE_END) {
      return i;
    }
  }
  return -1;
}

/**
 * Finds the index of the last content edit for a given id.
 */
function findLastContentEditIdx(diff: Change[], targetId: string): number {
  let lastIdx = -1;
  for (const [i, change] of diff.entries()) {
    if (change.op !== 'equal' && 'id' in change && change.id === targetId && !isRangeMarker(change)) {
      lastIdx = i;
    }
  }
  return lastIdx;
}
