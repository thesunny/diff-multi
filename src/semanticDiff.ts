import type { Diff } from "diff-match-patch";
import { DIFF_DELETE, DIFF_INSERT, diff_match_patch } from "diff-match-patch";

type InsertChange = {
  op: "insert";
  text: string;
  id: string;
};

type DeleteChange = {
  op: "delete";
  text: string;
  id: string;
};

type EqualChange = {
  op: "equal";
  text: string;
};

/**
 * This is a localized version of the Change type from jsdiff (package `diff`).
 * We are using this to define the `Change` type for semantic diff to retain
 * backwards compatibility with the `diff` package.
 */
export type Change = InsertChange | DeleteChange | EqualChange;

/**
 * Returns a semantic diff using diff-match-patch but the return value is in
 * the same format as jsdiff (package `diff`) for compatibility..
 */
export function semanticDiff(
  oldText: string,
  newText: string,
  id: string
): Change[] {
  const dmp = new diff_match_patch();
  const rawDiffs: Diff[] = dmp.diff_main(oldText, newText);

  dmp.diff_cleanupSemantic(rawDiffs);

  return rawDiffs.map<Change>(([op, data]) => {
    if (op === DIFF_INSERT) {
      return {
        op: "insert",
        text: data,
        id,
      };
    }
    if (op === DIFF_DELETE) {
      return {
        op: "delete",
        text: data,
        id,
      };
    }
    return {
      op: "equal",
      text: data,
    };
  });
}
