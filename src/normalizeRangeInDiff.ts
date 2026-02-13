import { RANGE_START, RANGE_END } from './constants';
import type { Change } from './semanticDiff';

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
  let result = splitRangeMarkers(diff);

  // Step 2: Get all unique ids
  const ids = getUniqueIds(result);

  // Step 3: For each id, ensure proper ordering of range markers
  for (const id of ids) {
    result = normalizeRangeForId(result, id);
  }

  return result;
}

/**
 * Splits inserts containing range markers into separate insert operations.
 * e.g., "hello⟦world" becomes ["hello", "⟦", "world"]
 */
function splitRangeMarkers(diff: Change[]): Change[] {
  const result: Change[] = [];

  for (const change of diff) {
    if (change.op === 'insert' && (change.text.includes(RANGE_START) || change.text.includes(RANGE_END))) {
      const parts = splitTextByRangeMarkers(change.text);
      for (const part of parts) {
        if (part.length > 0) {
          result.push({ op: 'insert', text: part, id: change.id });
        }
      }
    } else {
      result.push(change);
    }
  }

  return result;
}

/**
 * Splits text by range markers, keeping the markers as separate items.
 */
function splitTextByRangeMarkers(text: string): string[] {
  const result: string[] = [];
  let current = '';

  for (const char of text) {
    if (char === RANGE_START || char === RANGE_END) {
      if (current.length > 0) {
        result.push(current);
        current = '';
      }
      result.push(char);
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    result.push(current);
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
 * Checks if a change is a range marker (RANGE_START or RANGE_END insert).
 */
function isRangeMarker(change: Change): boolean {
  return change.op === 'insert' && (change.text === RANGE_START || change.text === RANGE_END);
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

  for (let i = 0; i < diff.length; i++) {
    const change = diff[i];
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
    result.splice(firstContentEditIdx, 0, rangeStartChange);

    // Recalculate indices after modification
    rangeEndIdx = findRangeEndIdx(result, targetId);
    lastContentEditIdx = findLastContentEditIdx(result, targetId);
  }

  // Handle RANGE_END: move it to just after last content edit if needed
  if (rangeEndIdx !== -1 && rangeEndIdx < lastContentEditIdx) {
    const [rangeEndChange] = result.splice(rangeEndIdx, 1);
    // After removal, lastContentEditIdx shifts down by 1 if it was after rangeEndIdx
    const adjustedLastIdx = rangeEndIdx < lastContentEditIdx ? lastContentEditIdx - 1 : lastContentEditIdx;
    result.splice(adjustedLastIdx + 1, 0, rangeEndChange);
  }

  return result;
}

/**
 * Finds the index of RANGE_END for a given id.
 */
function findRangeEndIdx(diff: Change[], targetId: string): number {
  for (let i = 0; i < diff.length; i++) {
    const change = diff[i];
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
  for (let i = 0; i < diff.length; i++) {
    const change = diff[i];
    if (change.op !== 'equal' && 'id' in change && change.id === targetId && !isRangeMarker(change)) {
      lastIdx = i;
    }
  }
  return lastIdx;
}
