import { describe, it, expect } from "vitest";
import { semanticDiff, type Change } from "../semanticDiff";
import { layerDiffs } from "../layerDiffs";
import { logDiff } from "../visualizeDiff";

const DEBUG = true;

function debugLog(
  taskName: string,
  existingDiff: Change[],
  targetText: string,
  result: Change[],
): void {
  if (!DEBUG) return;
  logDiff(taskName, existingDiff, targetText, result);
}

describe("layerDiffs", () => {
  it("should return empty diff when target matches visible text", (ctx) => {
    // Existing diff: "The quick fox" (deleted "brown ")
    const existingDiff: Change[] = [
      { op: "equal", text: "The quick " },
      { op: "delete", text: "brown ", id: "1" },
      { op: "equal", text: "fox" },
    ];

    // Target is same as visible text
    const targetText = "The quick fox";
    const result = layerDiffs(existingDiff, targetText, "2");

    // Should have no changes - deleted text "brown " is preserved in document structure
    expect(result).toEqual([{ op: "equal", text: "The quick brown fox" }]);

    debugLog(ctx.task.name, existingDiff, targetText, result);
  });

  it("should layer new insert next to an existing delete", (ctx) => {
    // Existing diff: "The quick fox" (deleted "brown ")
    const existingDiff: Change[] = [
      { op: "equal", text: "The quick " },
      { op: "delete", text: "brown ", id: "1" },
      { op: "equal", text: "fox" },
    ];

    // Target adds "red " before fox
    const targetText = "The quick red fox";
    const result = layerDiffs(existingDiff, targetText, "2");

    // Should show insert of "red " - deleted "brown " is preserved in document structure
    expect(result).toEqual([
      { op: "equal", text: "The quick brown " },
      { op: "insert", text: "red ", id: "2" },
      { op: "equal", text: "fox" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetText, result);
  });

  it("should layer new delete on top of existing insert", (ctx) => {
    // Existing diff with an insertion: "The quick brown fox"
    const existingDiff: Change[] = [
      { op: "equal", text: "The " },
      { op: "insert", text: "quick ", id: "1" },
      { op: "equal", text: "brown fox" },
    ];

    // Target removes "quick " (deleting previous insertion)
    const targetText = "The brown fox";
    const result = layerDiffs(existingDiff, targetText, "2");

    expect(result).toEqual([
      { op: "equal", text: "The " },
      { op: "delete", text: "quick ", id: "2" },
      { op: "equal", text: "brown fox" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetText, result);
  });

  it("should not delete already-deleted text", (ctx) => {
    // Existing diff: visible is "AC", but "B" was deleted
    const existingDiff: Change[] = [
      { op: "equal", text: "A" },
      { op: "delete", text: "B", id: "1" },
      { op: "equal", text: "C" },
    ];

    // Target is "AXC" - insert X in the visible text
    const targetText = "AXC";
    const result = layerDiffs(existingDiff, targetText, "2");

    // Deleted "B" is preserved in document structure, X is inserted after it
    expect(result).toEqual([
      { op: "equal", text: "AB" },
      { op: "insert", text: "X", id: "2" },
      { op: "equal", text: "C" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetText, result);
  });

  it("should handle multiple deletions in existing diff", (ctx) => {
    // Existing diff with multiple deletions
    const existingDiff: Change[] = [
      { op: "equal", text: "A" },
      { op: "delete", text: "B", id: "1" },
      { op: "equal", text: "C" },
      { op: "delete", text: "D", id: "1" },
      { op: "equal", text: "E" },
    ];

    // Target is same as visible "ACE" - deleted text is preserved
    const targetText = "ACE";
    const result = layerDiffs(existingDiff, targetText, "2");

    expect(result).toEqual([{ op: "equal", text: "ABCDE" }]);

    debugLog(ctx.task.name, existingDiff, targetText, result);
  });

  it("should handle existing diff with only equal text", (ctx) => {
    const existingDiff: Change[] = [{ op: "equal", text: "Hello world" }];

    const targetText = "Hello there";
    const result = layerDiffs(existingDiff, targetText, "1");

    expect(result).toEqual([
      { op: "equal", text: "Hello " },
      { op: "delete", text: "world", id: "1" },
      { op: "insert", text: "there", id: "1" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetText, result);
  });

  it("should handle complex layering scenario", (ctx) => {
    // Start: "The quick brown fox jumps over the lazy dog."
    // After edit 1: "The quick fox jumps over the lazy dog." (deleted "brown ")
    const existingDiff = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick fox jumps over the lazy dog.",
      "1",
    );

    // Now layer: change "quick" to "fast" and "lazy" to "sleepy"
    const targetText = "The fast fox jumps over the sleepy dog.";
    const result = layerDiffs(existingDiff, targetText, "2");

    // Should show the new changes only
    // Note: semantic diff may segment differently (e.g., "laz"/"sleep" + common "y")
    expect(result.some((c) => c.op === "delete" && c.text === "quick")).toBe(
      true,
    );
    expect(result.some((c) => c.op === "insert" && c.text === "fast")).toBe(
      true,
    );
    // Check that lazy->sleepy transformation is captured (may be "laz"->"sleep" with "y" equal)
    expect(
      result.some((c) => c.op === "delete" && c.text.includes("laz")),
    ).toBe(true);
    expect(
      result.some((c) => c.op === "insert" && c.text.includes("sleep")),
    ).toBe(true);

    debugLog(ctx.task.name, existingDiff, targetText, result);
  });
});
