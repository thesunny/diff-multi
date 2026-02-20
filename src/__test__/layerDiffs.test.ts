import { describe, it, expect } from "vitest";
import { semanticDiff, type Change } from "../semanticDiff";
import { layerDiffs } from "../layerDiffs";
import { logDiff } from "../visualizeDiff";

// Set to true to log test name, existingDiff, targetText, and result for each test
const DEBUG = true;

function debugLog(...args: (string | Change[] | null)[]): void {
  if (!DEBUG) return;
  logDiff(...args);
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

    debugLog(ctx.task.name, existingDiff, targetText, result);

    // Should have no changes - deleted text "brown " is preserved in document structure
    expect(result).toEqual([{ op: "equal", text: "The quick brown fox" }]);
  });

  it("should return empty diff when target matches visible text with existing insert", (ctx) => {
    // Existing diff: "The quick brown fox" (inserted "brown ")
    const existingDiff: Change[] = [
      { op: "equal", text: "The quick " },
      { op: "insert", text: "brown ", id: "1" },
      { op: "equal", text: "fox" },
    ];

    // Target is same as visible text
    const targetText = "The quick brown fox";
    const result = layerDiffs(existingDiff, targetText, "2");

    debugLog(ctx.task.name, existingDiff, targetText, result);

    // Should have no changes - the visible text already matches the target
    expect(result).toEqual([{ op: "equal", text: "The quick brown fox" }]);
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

    debugLog(ctx.task.name, existingDiff, targetText, result);

    // Should show insert of "red " - deleted "brown " is preserved in document structure
    expect(result).toEqual([
      { op: "equal", text: "The quick brown " },
      { op: "insert", text: "red ", id: "2" },
      { op: "equal", text: "fox" },
    ]);
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

    debugLog(ctx.task.name, existingDiff, targetText, result);

    expect(result).toEqual([
      { op: "equal", text: "The " },
      { op: "delete", text: "quick ", id: "2" },
      { op: "equal", text: "brown fox" },
    ]);
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

    debugLog(ctx.task.name, existingDiff, targetText, result);

    // Deleted "B" is preserved in document structure, X is inserted after it
    expect(result).toEqual([
      { op: "equal", text: "AB" },
      { op: "insert", text: "X", id: "2" },
      { op: "equal", text: "C" },
    ]);
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

    debugLog(ctx.task.name, existingDiff, targetText, result);

    expect(result).toEqual([{ op: "equal", text: "ABCDE" }]);
  });

  it("should handle existing diff with only equal text", (ctx) => {
    const existingDiff: Change[] = [{ op: "equal", text: "Hello world" }];

    const targetText = "Hello there";
    const result = layerDiffs(existingDiff, targetText, "1");

    debugLog(ctx.task.name, existingDiff, targetText, result);

    expect(result).toEqual([
      { op: "equal", text: "Hello " },
      { op: "delete", text: "world", id: "1" },
      { op: "insert", text: "there", id: "1" },
    ]);
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

    debugLog(ctx.task.name, existingDiff, targetText, result);

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
  });

  // Edge cases with adjacent deletions and boundary conditions
  describe("edge cases", () => {
    it("should handle two adjacent deletions with no text between", (ctx) => {
      // Document: "ABCD", visible: "AD" (B and C both deleted, adjacent)
      const existingDiff: Change[] = [
        { op: "equal", text: "A" },
        { op: "delete", text: "B", id: "1" },
        { op: "delete", text: "C", id: "1" },
        { op: "equal", text: "D" },
      ];

      // Target: "AXD" - insert X between the two deletions
      const targetText = "AXD";
      const result = layerDiffs(existingDiff, targetText, "2");

      debugLog(ctx.task.name, existingDiff, targetText, result);

      // X should be inserted, and both B and C preserved
      expect(result).toEqual([
        { op: "equal", text: "ABC" },
        { op: "insert", text: "X", id: "2" },
        { op: "equal", text: "D" },
      ]);
    });

    it("should handle insert between two deletions that have visible text between", (ctx) => {
      // Document: "ABCDE", visible: "ACE" (B and D deleted)
      const existingDiff: Change[] = [
        { op: "equal", text: "A" },
        { op: "delete", text: "B", id: "1" },
        { op: "equal", text: "C" },
        { op: "delete", text: "D", id: "1" },
        { op: "equal", text: "E" },
      ];

      // Target: "AXCYE" - insert X after A, insert Y after C
      const targetText = "AXCYE";
      const result = layerDiffs(existingDiff, targetText, "2");

      debugLog(ctx.task.name, existingDiff, targetText, result);

      expect(result).toEqual([
        { op: "equal", text: "AB" },
        { op: "insert", text: "X", id: "2" },
        { op: "equal", text: "CD" },
        { op: "insert", text: "Y", id: "2" },
        { op: "equal", text: "E" },
      ]);
    });

    it("should handle deletion at the start of text", (ctx) => {
      // Document: "ABC", visible: "BC" (A deleted at start)
      const existingDiff: Change[] = [
        { op: "delete", text: "A", id: "1" },
        { op: "equal", text: "BC" },
      ];

      // Target: "XBC" - insert X at the start
      const targetText = "XBC";
      const result = layerDiffs(existingDiff, targetText, "2");

      debugLog(ctx.task.name, existingDiff, targetText, result);

      expect(result).toEqual([
        { op: "equal", text: "A" },
        { op: "insert", text: "X", id: "2" },
        { op: "equal", text: "BC" },
      ]);
    });

    it("should handle deletion at the end of text", (ctx) => {
      // Document: "ABC", visible: "AB" (C deleted at end)
      const existingDiff: Change[] = [
        { op: "equal", text: "AB" },
        { op: "delete", text: "C", id: "1" },
      ];

      // Target: "ABX" - insert X at the end
      const targetText = "ABX";
      const result = layerDiffs(existingDiff, targetText, "2");

      debugLog(ctx.task.name, existingDiff, targetText, result);

      expect(result).toEqual([
        { op: "equal", text: "ABC" },
        { op: "insert", text: "X", id: "2" },
      ]);
    });

    it("should handle deletion at both start and end", (ctx) => {
      // Document: "ABC", visible: "B" (A and C deleted)
      const existingDiff: Change[] = [
        { op: "delete", text: "A", id: "1" },
        { op: "equal", text: "B" },
        { op: "delete", text: "C", id: "1" },
      ];

      // Target: "XBY" - insert X at start, Y at end
      const targetText = "XBY";
      const result = layerDiffs(existingDiff, targetText, "2");

      debugLog(ctx.task.name, existingDiff, targetText, result);

      expect(result).toEqual([
        { op: "equal", text: "A" },
        { op: "insert", text: "X", id: "2" },
        { op: "equal", text: "BC" },
        { op: "insert", text: "Y", id: "2" },
      ]);
    });

    it("should handle replacing visible text adjacent to deletion", (ctx) => {
      // Document: "ABCD", visible: "ACD" (B deleted)
      const existingDiff: Change[] = [
        { op: "equal", text: "A" },
        { op: "delete", text: "B", id: "1" },
        { op: "equal", text: "CD" },
      ];

      // Target: "AXD" - replace C with X (C is adjacent to deleted B)
      const targetText = "AXD";
      const result = layerDiffs(existingDiff, targetText, "2");

      debugLog(ctx.task.name, existingDiff, targetText, result);

      expect(result).toEqual([
        { op: "equal", text: "AB" },
        { op: "delete", text: "C", id: "2" },
        { op: "insert", text: "X", id: "2" },
        { op: "equal", text: "D" },
      ]);
    });

    it("should handle deleting all visible text between two deletions", (ctx) => {
      // Document: "ABCDE", visible: "ACE" (B and D deleted)
      const existingDiff: Change[] = [
        { op: "equal", text: "A" },
        { op: "delete", text: "B", id: "1" },
        { op: "equal", text: "C" },
        { op: "delete", text: "D", id: "1" },
        { op: "equal", text: "E" },
      ];

      // Target: "AE" - delete C (the only visible text between deletions)
      const targetText = "AE";
      const result = layerDiffs(existingDiff, targetText, "2");

      debugLog(ctx.task.name, existingDiff, targetText, result);

      expect(result).toEqual([
        { op: "equal", text: "AB" },
        { op: "delete", text: "C", id: "2" },
        { op: "equal", text: "DE" },
      ]);
    });

    it("should handle existing insert adjacent to existing delete", (ctx) => {
      // Document has insert right after delete: original "AC", edited to "ABC" then "C" deleted
      // So we have: insert B, delete C, leaving visible "AB"
      const existingDiff: Change[] = [
        { op: "equal", text: "A" },
        { op: "insert", text: "B", id: "1" },
        { op: "delete", text: "C", id: "1" },
      ];

      // Target: "AXB" - insert X between A and B
      const targetText = "AXB";
      const result = layerDiffs(existingDiff, targetText, "2");

      debugLog(ctx.task.name, existingDiff, targetText, result);

      expect(result).toEqual([
        { op: "equal", text: "A" },
        { op: "insert", text: "X", id: "2" },
        { op: "equal", text: "BC" },
      ]);
    });

    it("should handle three consecutive deletions", (ctx) => {
      // Document: "ABCDE", visible: "AE" (B, C, D all deleted)
      const existingDiff: Change[] = [
        { op: "equal", text: "A" },
        { op: "delete", text: "B", id: "1" },
        { op: "delete", text: "C", id: "1" },
        { op: "delete", text: "D", id: "1" },
        { op: "equal", text: "E" },
      ];

      // Target: "AXE" - insert X where BCD was
      const targetText = "AXE";
      const result = layerDiffs(existingDiff, targetText, "2");

      debugLog(ctx.task.name, existingDiff, targetText, result);

      expect(result).toEqual([
        { op: "equal", text: "ABCD" },
        { op: "insert", text: "X", id: "2" },
        { op: "equal", text: "E" },
      ]);
    });

    it("should handle insert at exact position of single-char deletion", (ctx) => {
      // Document: "ABC", visible: "AC" (single B deleted)
      const existingDiff: Change[] = [
        { op: "equal", text: "A" },
        { op: "delete", text: "B", id: "1" },
        { op: "equal", text: "C" },
      ];

      // Target: "AXC" - insert X exactly where B was
      const targetText = "AXC";
      const result = layerDiffs(existingDiff, targetText, "2");

      debugLog(ctx.task.name, existingDiff, targetText, result);

      expect(result).toEqual([
        { op: "equal", text: "AB" },
        { op: "insert", text: "X", id: "2" },
        { op: "equal", text: "C" },
      ]);
    });

    it("should handle multiple inserts around a deletion", (ctx) => {
      // Document: "ABC", visible: "AC" (B deleted)
      const existingDiff: Change[] = [
        { op: "equal", text: "A" },
        { op: "delete", text: "B", id: "1" },
        { op: "equal", text: "C" },
      ];

      // Target: "AXCYZ" - insert X after A, insert YZ after C
      // Note: semantic diff may group this as delete C, insert XCYZ instead of
      // two separate inserts. This is valid - the transformation is correct.
      const targetText = "AXCYZ";
      const result = layerDiffs(existingDiff, targetText, "2");

      debugLog(ctx.task.name, existingDiff, targetText, result);

      // Semantic diff groups this as: keep AB, delete C, insert XCYZ
      expect(result).toEqual([
        { op: "equal", text: "AB" },
        { op: "delete", text: "C", id: "2" },
        { op: "insert", text: "XCYZ", id: "2" },
      ]);
    });

    it("should handle word-level changes touching deletion boundaries", (ctx) => {
      // "hello world" -> "hello" (deleted " world")
      const existingDiff: Change[] = [
        { op: "equal", text: "hello" },
        { op: "delete", text: " world", id: "1" },
      ];

      // Target: "hello there" - add " there" at end
      const targetText = "hello there";
      const result = layerDiffs(existingDiff, targetText, "2");

      debugLog(ctx.task.name, existingDiff, targetText, result);

      expect(result).toEqual([
        { op: "equal", text: "hello world" },
        { op: "insert", text: " there", id: "2" },
      ]);
    });

    it("should handle overlapping word changes near deletions", (ctx) => {
      // "the cat sat" -> "the sat" (deleted "cat ")
      const existingDiff: Change[] = [
        { op: "equal", text: "the " },
        { op: "delete", text: "cat ", id: "1" },
        { op: "equal", text: "sat" },
      ];

      // Target: "the dog sat" - insert "dog " where "cat " was
      const targetText = "the dog sat";
      const result = layerDiffs(existingDiff, targetText, "2");

      debugLog(ctx.task.name, existingDiff, targetText, result);

      expect(result).toEqual([
        { op: "equal", text: "the cat " },
        { op: "insert", text: "dog ", id: "2" },
        { op: "equal", text: "sat" },
      ]);
    });
  });
});
