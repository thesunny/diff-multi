import { describe, it, expect } from "vitest";
import { applyAndMergeDiffs } from "../applyAndMergeDiffs";
import { semanticDiff, type Change } from "../semanticDiff";
import { RANGE_START, RANGE_END } from "../constants";
import { logDiff } from "../visualizeDiff";

// Set to true to log test name, existingDiff, targetText, and result for each test
const DEBUG = true;

function debugLog(...args: (string | Change[] | null)[]): void {
  if (!DEBUG) return;
  logDiff(...args);
}


describe("applyAndMergeDiffs", () => {
  it("should apply two diffs to different parts of a paragraph and merge them", (ctx) => {
    // Start with a paragraph that has multiple sentences with an existing edit
    // (deleted "brown ")
    const existingDiff = semanticDiff(
      "The quick brown fox jumps over the lazy dog. The cat sleeps on the mat.",
      "The quick fox jumps over the lazy dog. The cat sleeps on the mat.",
      "existing",
    );

    // Now apply two new edits, each affecting a different sentence:
    // Edit A: Change "lazy" to "tired" in the first sentence
    // Edit B: Change "cat" to "kitten" in the second sentence
    //
    // Range markers are embedded directly in the target text to indicate
    // the semantic range of each edit.

    // Edit A: first sentence with "lazy" -> "tired", range covers entire sentence
    const targetA = `${RANGE_START}The quick fox jumps over the tired dog.${RANGE_END} The cat sleeps on the mat.`;

    // Edit B: second sentence with "cat" -> "kitten", range covers entire sentence
    const targetB = `The quick fox jumps over the lazy dog. ${RANGE_START}The kitten sleeps on the mat.${RANGE_END}`;

    const result = applyAndMergeDiffs(existingDiff, [
      { targetText: targetA, id: "edit-A" },
      { targetText: targetB, id: "edit-B" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetA, targetB, result);

    expect(result).toEqual([
      { op: "insert", text: RANGE_START, id: "edit-A" },
      { op: "equal", text: "The quick brown fox jumps over the " },
      { op: "delete", text: "lazy", id: "edit-A" },
      { op: "insert", text: "tired", id: "edit-A" },
      { op: "equal", text: " dog." },
      { op: "insert", text: RANGE_END, id: "edit-A" },
      { op: "equal", text: " " },
      { op: "insert", text: RANGE_START, id: "edit-B" },
      { op: "equal", text: "The " },
      { op: "delete", text: "cat", id: "edit-B" },
      { op: "insert", text: "kitten", id: "edit-B" },
      { op: "equal", text: " sleeps on the mat." },
      { op: "insert", text: RANGE_END, id: "edit-B" },
    ]);
  });
});
