import { RANGE_START, RANGE_END } from './constants';
import type { Change } from './semanticDiff';

/**
 * Expands range markers to include adjacent delete operations to their left.
 *
 * For each RANGE_START marker, if the immediately preceding operation is a "delete",
 * the RANGE_START is moved to before that delete. This ensures the delete is
 * captured within the range.
 *
 * However, if the preceding operation is a RANGE_END marker, no movement occurs
 * to avoid disrupting other range boundaries.
 */
export function expandRangeToIncludeDeleteLeftFinal(diff: Change[]): Change[] {
  const result = [...diff];

  // Process from right to left to avoid index shifting issues
  for (let i = result.length - 1; i >= 0; i--) {
    const change = result[i];

    // Check if this is a RANGE_START marker
    if (change.op === 'insert' && change.text === RANGE_START) {
      // Check if there's a preceding operation
      if (i > 0) {
        const prevChange = result[i - 1];

        // If the previous operation is a RANGE_END, don't move
        if (prevChange.op === 'insert' && prevChange.text === RANGE_END) {
          continue;
        }

        // If the previous operation is a delete, move RANGE_START before it
        if (prevChange.op === 'delete') {
          // Remove RANGE_START from current position
          result.splice(i, 1);
          // Insert RANGE_START before the delete
          result.splice(i - 1, 0, change);
        }
      }
    }
  }

  return result;
}
