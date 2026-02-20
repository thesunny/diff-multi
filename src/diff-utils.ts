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
