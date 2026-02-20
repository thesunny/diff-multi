import type { Diff } from "diff-match-patch";
import { DIFF_DELETE, DIFF_INSERT } from "diff-match-patch";
import { RANGE_START, RANGE_END } from "./constants";
import type { Change } from "./types";

/**
 * Converts a Change array to diff-match-patch Diff array.
 */
export function changesToDiffs(changes: Change[]): Diff[] {
  return changes.map((change) => {
    if (change.op === "equal") {
      return [0, change.text] as Diff;
    } else if (change.op === "insert") {
      return [1, change.text] as Diff;
    } else {
      return [-1, change.text] as Diff;
    }
  });
}

/**
 * Converts a diff-match-patch Diff array to Change array.
 */
export function diffsToChanges(diffs: Diff[], id: string): Change[] {
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

/**
 * Splits text by range markers, keeping the markers as separate items.
 * e.g., "hello⟦world⟧" becomes ["hello", "⟦", "world", "⟧"]
 */
export function splitTextByRangeMarkers(text: string): string[] {
  const result: string[] = [];
  let current = "";

  for (const char of text) {
    if (char === RANGE_START || char === RANGE_END) {
      if (current.length > 0) {
        result.push(current);
        current = "";
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
 * Splits inserts containing range markers into separate insert operations.
 * e.g., an insert of "hello⟦world" becomes two inserts: "hello" and "⟦" and "world"
 */
export function splitRangeMarkersInDiff(diff: Change[]): Change[] {
  const result: Change[] = [];

  for (const change of diff) {
    if (
      change.op === "insert" &&
      (change.text.includes(RANGE_START) || change.text.includes(RANGE_END))
    ) {
      const parts = splitTextByRangeMarkers(change.text);
      for (const part of parts) {
        if (part.length > 0) {
          result.push({ op: "insert", text: part, id: change.id });
        }
      }
    } else {
      result.push(change);
    }
  }

  return result;
}

/**
 * Checks if a change is a range marker (RANGE_START or RANGE_END insert).
 */
export function isRangeMarker(change: Change): boolean {
  return (
    change.op === "insert" &&
    (change.text === RANGE_START || change.text === RANGE_END)
  );
}

/**
 * Checks if a change is a RANGE_START insert.
 */
export function isRangeStart(change: Change): boolean {
  return change.op === "insert" && change.text === RANGE_START;
}

/**
 * Checks if a change is a RANGE_END insert.
 */
export function isRangeEnd(change: Change): boolean {
  return change.op === "insert" && change.text === RANGE_END;
}

/**
 * Safely extracts the id from a Change, returning undefined for equal operations.
 */
export function getChangeId(change: Change | undefined): string | undefined {
  if (!change || change.op === "equal") {
    return undefined;
  }
  return change.id;
}

/**
 * Merges adjacent Change segments of the same operation type and id.
 */
export function mergeAdjacentSegments(changes: Change[]): Change[] {
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
