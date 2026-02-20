import { describe, it, expect } from "vitest";
import { mergeAndLayerDiffs } from "../mergeAndLayerDiffs";
import { semanticDiff, type Change } from "../semanticDiff";
import { RANGE_START, RANGE_END } from "../constants";
import { logDiff } from "../visualizeDiff";

// Set to true to show debug logs
const DEBUG = false;

function debugLog(...args: (string | Change[] | null)[]): void {
  if (!DEBUG) return;
  logDiff(...args);
}

describe("mergeAndLayerDiffs", () => {
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

    const result = mergeAndLayerDiffs(existingDiff, [
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

  it("should return existing diff unchanged when edits array is empty", (ctx) => {
    const existingDiff = semanticDiff(
      "The quick brown fox.",
      "The quick fox.",
      "existing",
    );

    const result = mergeAndLayerDiffs(existingDiff, []);

    debugLog(ctx.task.name, existingDiff, result);
    expect(result).toEqual(existingDiff);
  });

  it("should handle a single edit without merging", (ctx) => {
    const existingDiff = semanticDiff(
      "Hello world.",
      "Hello world.",
      "existing",
    );

    const targetA = `${RANGE_START}Hello universe.${RANGE_END}`;

    const result = mergeAndLayerDiffs(existingDiff, [
      { targetText: targetA, id: "edit-A" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetA, result);
    expect(result).toEqual([
      { op: "insert", text: RANGE_START, id: "edit-A" },
      { op: "equal", text: "Hello " },
      { op: "delete", text: "world.", id: "edit-A" },
      { op: "insert", text: "universe.", id: "edit-A" },
      { op: "insert", text: RANGE_END, id: "edit-A" },
    ]);
  });

  it("should return null when edits conflict (delete same text)", (ctx) => {
    const existingDiff: Change[] = [
      { op: "equal", text: "The quick brown fox." },
    ];

    const targetA = `${RANGE_START}The quick fox.${RANGE_END}`;
    const targetB = `${RANGE_START}The quick fox.${RANGE_END}`;

    const result = mergeAndLayerDiffs(existingDiff, [
      { targetText: targetA, id: "edit-A" },
      { targetText: targetB, id: "edit-B" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetA, targetB, result);
    expect(result).toBeNull();
  });

  it("should merge three edits to different parts of a sentence (this has overlapping edits so should not happen in practice but is good for testing)", (ctx) => {
    const existingDiff: Change[] = [
      { op: "equal", text: "The quick brown fox jumps over the lazy dog." },
    ];

    const targetA = `${RANGE_START}The fast brown fox jumps over the lazy dog.${RANGE_END}`;
    const targetB = `The quick ${RANGE_START}red${RANGE_END} fox jumps over the lazy dog.`;
    const targetC = `The quick brown fox jumps over the ${RANGE_START}sleepy${RANGE_END} dog.`;

    const result = mergeAndLayerDiffs(existingDiff, [
      { targetText: targetA, id: "edit-A" },
      { targetText: targetB, id: "edit-B" },
      { targetText: targetC, id: "edit-C" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetA, targetB, targetC, result);
    expect(result).toEqual([
      { op: "insert", text: RANGE_START, id: "edit-A" },
      { op: "equal", text: "The " },
      { op: "delete", text: "quick", id: "edit-A" },
      { op: "insert", text: "fast", id: "edit-A" },
      { op: "equal", text: " " },
      { op: "insert", text: RANGE_START, id: "edit-B" },
      { op: "delete", text: "brown", id: "edit-B" },
      { op: "insert", text: "red", id: "edit-B" },
      { op: "insert", text: RANGE_END, id: "edit-B" },
      { op: "equal", text: " fox jumps over the " },
      { op: "insert", text: RANGE_START, id: "edit-C" },
      { op: "delete", text: "lazy", id: "edit-C" },
      { op: "insert", text: "sleepy", id: "edit-C" },
      { op: "insert", text: RANGE_END, id: "edit-C" },
      { op: "equal", text: " dog." },
      { op: "insert", text: RANGE_END, id: "edit-A" },
    ]);
  });

  it("should preserve existing deletions from the existingDiff", (ctx) => {
    const existingDiff = semanticDiff(
      "The quick brown fox.",
      "The quick fox.",
      "existing",
    );

    const targetA = `${RANGE_START}The fast fox.${RANGE_END}`;

    const result = mergeAndLayerDiffs(existingDiff, [
      { targetText: targetA, id: "edit-A" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetA, result);
    // The "brown " deletion from existingDiff should be preserved as equal text
    expect(result).toEqual([
      { op: "insert", text: RANGE_START, id: "edit-A" },
      { op: "equal", text: "The " },
      { op: "delete", text: "quick", id: "edit-A" },
      { op: "insert", text: "fast", id: "edit-A" },
      { op: "equal", text: " brown fox." },
      { op: "insert", text: RANGE_END, id: "edit-A" },
    ]);
  });

  it("should handle insert-only edits", (ctx) => {
    const existingDiff: Change[] = [{ op: "equal", text: "Hello world." }];

    const targetA = `Hello ${RANGE_START}beautiful ${RANGE_END}world.`;
    const targetB = `Hello world${RANGE_START}, goodbye${RANGE_END}.`;

    const result = mergeAndLayerDiffs(existingDiff, [
      { targetText: targetA, id: "edit-A" },
      { targetText: targetB, id: "edit-B" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetA, targetB, result);
    expect(result).toEqual([
      { op: "equal", text: "Hello " },
      { op: "insert", text: RANGE_START, id: "edit-A" },
      { op: "insert", text: "beautiful ", id: "edit-A" },
      { op: "insert", text: RANGE_END, id: "edit-A" },
      { op: "equal", text: "world" },
      { op: "insert", text: RANGE_START, id: "edit-B" },
      { op: "insert", text: ", goodbye", id: "edit-B" },
      { op: "insert", text: RANGE_END, id: "edit-B" },
      { op: "equal", text: "." },
    ]);
  });

  it("should handle delete-only edits", (ctx) => {
    const existingDiff: Change[] = [
      { op: "equal", text: "The quick brown fox jumps high." },
    ];

    const targetA = `${RANGE_START}The brown fox jumps high.${RANGE_END}`;
    const targetB = `The quick brown fox ${RANGE_START}jumps.${RANGE_END}`;

    const result = mergeAndLayerDiffs(existingDiff, [
      { targetText: targetA, id: "edit-A" },
      { targetText: targetB, id: "edit-B" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetA, targetB, result);
    expect(result).toEqual([
      { op: "insert", text: RANGE_START, id: "edit-A" },
      { op: "equal", text: "The " },
      { op: "delete", text: "quick ", id: "edit-A" },
      { op: "equal", text: "brown fox " },
      { op: "insert", text: RANGE_START, id: "edit-B" },
      { op: "equal", text: "jumps" },
      { op: "delete", text: " high", id: "edit-B" },
      { op: "equal", text: "." },
      { op: "insert", text: RANGE_END, id: "edit-A" },
      { op: "insert", text: RANGE_END, id: "edit-B" },
    ]);
  });

  it("should handle edits with adjacent but non-overlapping ranges", (ctx) => {
    const existingDiff: Change[] = [{ op: "equal", text: "AB CD EF" }];

    const targetA = `${RANGE_START}XB${RANGE_END} CD EF`;
    const targetB = `AB ${RANGE_START}YD${RANGE_END} EF`;

    const result = mergeAndLayerDiffs(existingDiff, [
      { targetText: targetA, id: "edit-A" },
      { targetText: targetB, id: "edit-B" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetA, targetB, result);
    expect(result).toEqual([
      { op: "insert", text: RANGE_START, id: "edit-A" },
      { op: "delete", text: "AB", id: "edit-A" },
      { op: "insert", text: "XB", id: "edit-A" },
      { op: "insert", text: RANGE_END, id: "edit-A" },
      { op: "equal", text: " " },
      { op: "insert", text: RANGE_START, id: "edit-B" },
      { op: "delete", text: "CD", id: "edit-B" },
      { op: "insert", text: "YD", id: "edit-B" },
      { op: "insert", text: RANGE_END, id: "edit-B" },
      { op: "equal", text: " EF" },
    ]);
  });

  it("should handle an edit that inserts at the location of an existing deletion", (ctx) => {
    const existingDiff = semanticDiff(
      "The quick brown fox.",
      "The quick fox.",
      "existing",
    );

    // Insert "red " where "brown " was deleted
    const targetA = `The quick ${RANGE_START}red ${RANGE_END}fox.`;

    const result = mergeAndLayerDiffs(existingDiff, [
      { targetText: targetA, id: "edit-A" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetA, result);
    expect(result).toEqual([
      { op: "equal", text: "The quick brown " },
      { op: "insert", text: RANGE_START, id: "edit-A" },
      { op: "insert", text: "red ", id: "edit-A" },
      { op: "insert", text: RANGE_END, id: "edit-A" },
      { op: "equal", text: "fox." },
    ]);
  });

  it("should handle range markers covering entire text", (ctx) => {
    const existingDiff: Change[] = [{ op: "equal", text: "Hello" }];

    const targetA = `${RANGE_START}Goodbye${RANGE_END}`;

    const result = mergeAndLayerDiffs(existingDiff, [
      { targetText: targetA, id: "edit-A" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetA, result);
    expect(result).toEqual([
      { op: "insert", text: RANGE_START, id: "edit-A" },
      { op: "delete", text: "Hello", id: "edit-A" },
      { op: "insert", text: "Goodbye", id: "edit-A" },
      { op: "insert", text: RANGE_END, id: "edit-A" },
    ]);
  });

  it("should handle edits with no actual changes (target matches visible)", (ctx) => {
    const existingDiff = semanticDiff(
      "The quick brown fox.",
      "The quick fox.",
      "existing",
    );

    // Target is same as visible - no new changes, just adds range markers
    const targetA = `${RANGE_START}The quick fox.${RANGE_END}`;

    const result = mergeAndLayerDiffs(existingDiff, [
      { targetText: targetA, id: "edit-A" },
    ]);

    debugLog(ctx.task.name, existingDiff, targetA, result);
    expect(result).toEqual([
      { op: "insert", text: RANGE_START, id: "edit-A" },
      { op: "equal", text: "The quick brown fox." },
      { op: "insert", text: RANGE_END, id: "edit-A" },
    ]);
  });
});

describe("How to Use examples", () => {
  const existingDiff = semanticDiff(
    "The quick brown fox jumped over the lazy dog.",
    "The brown fox jumped over the extremely lazy dog.",
    "existing",
  );

  it('should validate the existing diff', () => {
    console.log(existingDiff);
    expect(existingDiff).toEqual([
      { op: 'equal', text: 'The ' },
      { op: 'delete', text: 'quick ', id: 'existing' },
      { op: 'equal', text: 'brown fox jumped over the ' },
      { op: 'insert', text: 'extremely ', id: 'existing' },
      { op: 'equal', text: 'lazy dog.' }
    ]);
  });

  describe("accepting the insert", () => {
    it("should accept the insert", (ctx) => {
      const targetA = `The brown fox jumped over the ${RANGE_START}extremely ${RANGE_END}lazy dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);

      debugLog(ctx.task.name, existingDiff, targetA, result);
      expect(result).toEqual([
        { op: "equal", text: "The quick brown fox jumped over the " },
        { op: "insert", text: RANGE_START, id: "edit-A" },
        { op: "equal", text: "extremely " },
        { op: "insert", text: RANGE_END, id: "edit-A" },
        { op: "equal", text: "lazy dog." },
      ]);
    });
  });

  describe("accepting the delete", () => {
    it("should accept the delete (fails)", (ctx) => {
      // This does NOT work because this is a valid interpretation.
      // I think we always need to include at least one character in the range
      // for it to work properly. When there is nothing in the range, maybe
      // expand out the edges by any deletes?
      const targetA = `The ${RANGE_START}${RANGE_END}brown fox jumped over the extremely lazy dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);

      debugLog(ctx.task.name, existingDiff, targetA, result);
      expect(result).toEqual([
        { op: "equal", text: "The quick " },
        { op: "insert", text: RANGE_START, id: "edit-A" },
        { op: "insert", text: RANGE_END, id: "edit-A" },
        { op: "equal", text: "brown fox jumped over the extremely lazy dog." },
      ]);
    });

    it("should accept the delete", (ctx) => {
      // This version DOES work because it includes at least one character in the range
      const targetA = `The${RANGE_START} ${RANGE_END}brown fox jumped over the extremely lazy dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);

      debugLog(ctx.task.name, existingDiff, targetA, result);
      expect(result).toEqual([
        { op: "equal", text: "The" },
        { op: "insert", text: RANGE_START, id: "edit-A" },
        { op: "equal", text: " quick " },
        { op: "insert", text: RANGE_END, id: "edit-A" },
        { op: "equal", text: "brown fox jumped over the extremely lazy dog." },
      ]);
    });
  });

  describe("rejecting the insert", () => {
    it("should reject the insert", (ctx) => {
      const targetA = `The brown fox jumped over the ${RANGE_START}${RANGE_END}lazy dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);

      debugLog(ctx.task.name, existingDiff, targetA, result);
      expect(result).toEqual([
        { op: "equal", text: "The quick brown fox jumped over the " },
        { op: "insert", text: RANGE_START, id: "edit-A" },
        { op: "delete", text: "extremely ", id: "edit-A" },
        { op: "insert", text: RANGE_END, id: "edit-A" },
        { op: "equal", text: "lazy dog." },
      ]);
    });

    it("should reject the insert", (ctx) => {
      const targetA = `The brown fox jumped over the${RANGE_START}${RANGE_END} lazy dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);

      debugLog(ctx.task.name, existingDiff, targetA, result);
      expect(result).toEqual([
        { op: "equal", text: "The quick brown fox jumped over the" },
        { op: "insert", text: RANGE_START, id: "edit-A" },
        { op: "delete", text: " extremely", id: "edit-A" },
        { op: "insert", text: RANGE_END, id: "edit-A" },
        { op: "equal", text: " lazy dog." },
      ]);
    });

    it("should reject the insert (this is weird)", (ctx) => {
      const targetA = `The brown fox jumped over the${RANGE_START} ${RANGE_END}lazy dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);

      debugLog(ctx.task.name, existingDiff, targetA, result);
      expect(result).toEqual([
        { op: "equal", text: "The quick brown fox jumped over the" },
        { op: "insert", text: RANGE_START, id: "edit-A" },
        { op: "delete", text: " extremely ", id: "edit-A" },
        { op: "insert", text: " ", id: "edit-A" },
        { op: "insert", text: RANGE_END, id: "edit-A" },
        { op: "equal", text: "lazy dog." },
      ]);
    });
  });

  describe("rejecting the delete", () => {
    it("should reject the delete", (ctx) => {
      const targetA = `The ${RANGE_START}quick ${RANGE_END}brown fox jumped over the extremely lazy dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);

      debugLog(ctx.task.name, existingDiff, targetA, result);

      expect(result).toEqual([
        { op: "equal", text: "The quick " },
        { op: "insert", text: RANGE_START, id: "edit-A" },
        { op: "insert", text: "quick ", id: "edit-A" },
        { op: "insert", text: RANGE_END, id: "edit-A" },
        { op: "equal", text: "brown fox jumped over the extremely lazy dog." },
      ]);
    });
  });

  describe("modifying the insert", () => {
    /**
     * TODO: We still need to test off by one spacing
     */
    it("should replace the insert", (ctx) => {
      const targetA = `The brown fox jumped over the ${RANGE_START}very ${RANGE_END}lazy dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);
      debugLog(ctx.task.name, existingDiff, targetA, result);
      expect(result).toEqual([
        { op: 'equal', text: 'The quick brown fox jumped over the ' },
        { op: 'insert', text: '', id: 'edit-A' },
        { op: 'delete', text: 'extremel', id: 'edit-A' },
        { op: 'insert', text: 'ver', id: 'edit-A' },
        { op: 'equal', text: 'y ' },
        { op: 'insert', text: '', id: 'edit-A' },
        { op: 'equal', text: 'lazy dog.' }
      ]);
    });

    it('should insert before the insert', (ctx) => {
      const targetA = `The brown fox jumped over the ${RANGE_START}very extremely ${RANGE_END}lazy dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);
      debugLog(ctx.task.name, existingDiff, targetA, result);
    });

    it('should insert after the insert', (ctx) => {
      const targetA = `The brown fox jumped over the ${RANGE_START}extremely very ${RANGE_END}lazy dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);
      debugLog(ctx.task.name, existingDiff, targetA, result);
    });
    
    it('should delete before the insert', (ctx) => {
      const targetA = `The brown fox jumped over ${RANGE_START}${RANGE_END}lazy dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);
      debugLog(ctx.task.name, existingDiff, targetA, result);
    });

    it('should delete after the insert', (ctx) => {
      const targetA = `The brown fox jumped over the ${RANGE_START}${RANGE_END}dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);
      debugLog(ctx.task.name, existingDiff, targetA, result);
    });
  });

  describe("modifying the delete", () => {
    /**
     * TODO: We still need to test off by one spacing
     */
    it("should insert at the delete", (ctx) => {
      const targetA = `The ${RANGE_START}quick ${RANGE_END}brown fox jumped over the extremely lazy dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);
      debugLog(ctx.task.name, existingDiff, targetA, result);
    });

    it('should delete before the delete', (ctx) => {
      const targetA = `${RANGE_START}${RANGE_END}brown fox jumped over the extremely lazy dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);
      debugLog(ctx.task.name, existingDiff, targetA, result);
    });

    it('should delete after the delete (fail)', (ctx) => {
      const targetA = `The ${RANGE_START}${RANGE_END}fox jumped over the extremely lazy dog.`;

      const result = mergeAndLayerDiffs(existingDiff, [
        { targetText: targetA, id: "edit-A" },
      ]);
      debugLog(ctx.task.name, existingDiff, targetA, result);
    });
  });
});
