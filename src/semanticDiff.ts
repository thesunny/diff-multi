import { diff_match_patch } from "diff-match-patch";
import { normalizeRangeInDiff } from "./normalizeRangeInDiff";
import { diffsToChanges } from "./diff-utils";
import type { Change } from "./types";

export type { Change };

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
  const rawDiffs = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(rawDiffs);
  return normalizeRangeInDiff(diffsToChanges(rawDiffs, id));
}
