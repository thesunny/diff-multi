import { RANGE_START, RANGE_END } from "./constants";
import type { Change } from "./semanticDiff";

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
