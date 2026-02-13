import { describe, it, expect } from "vitest";
import { normalizeRangeInDiff } from "../normalizeRangeInDiff";
import { RANGE_START, RANGE_END } from "../constants";
import type { Change } from "../semanticDiff";

describe("normalizeRangeInDiff", () => {
  describe("range markers are always separated into their own operations", () => {
    it("should split an insert containing RANGE_START, text, and RANGE_END into separate operations", () => {
      // This is the key behavior: range markers are ALWAYS in their own insert operations,
      // never combined with other text. This makes it easy to identify range boundaries.
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "insert", text: `${RANGE_START}world${RANGE_END}`, id: "1" },
        { op: "equal", text: " goodbye" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: "world", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "equal", text: " goodbye" },
      ]);
    });
  });

  describe("no range markers", () => {
    it("should return diff unchanged when no range markers present", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: "there", id: "1" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual(diff);
    });
  });

  describe("RANGE_START only", () => {
    it("should leave RANGE_START alone when already before edits", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: "there", id: "1" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual(diff);
    });

    it("should move RANGE_START before edits when it appears after", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: RANGE_START, id: "1" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "delete", text: "world", id: "1" },
      ]);
    });

    it("should move RANGE_START before edits when it appears between edits", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: "there", id: "1" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: "there", id: "1" },
      ]);
    });
  });

  describe("RANGE_END only", () => {
    it("should leave RANGE_END alone when already after edits", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: "there", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual(diff);
    });

    it("should move RANGE_END after edits when it appears before", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "delete", text: "world", id: "1" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ]);
    });

    it("should move RANGE_END after edits when it appears between edits", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "insert", text: "there", id: "1" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: "there", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ]);
    });
  });

  describe("both RANGE_START and RANGE_END", () => {
    it("should leave both alone when already in correct positions", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: "there", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual(diff);
    });

    it("should split and move combined RANGE_START and RANGE_END around deletion", () => {
      // This is the case from the deletion test: markers are combined after the delete
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: `${RANGE_START}${RANGE_END}`, id: "1" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ]);
    });

    it("should handle RANGE_START with text and RANGE_END combined", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: `there${RANGE_END}`, id: "1" },
        { op: "insert", text: RANGE_START, id: "1" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: "there", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ]);
    });
  });

  describe("multiple ids", () => {
    it("should normalize range markers independently for each id", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: `${RANGE_START}${RANGE_END}`, id: "1" },
        { op: "equal", text: " and " },
        { op: "delete", text: "goodbye", id: "2" },
        { op: "insert", text: `${RANGE_START}${RANGE_END}`, id: "2" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "equal", text: " and " },
        { op: "insert", text: RANGE_START, id: "2" },
        { op: "delete", text: "goodbye", id: "2" },
        { op: "insert", text: RANGE_END, id: "2" },
      ]);
    });
  });

  describe("edge cases", () => {
    it("should handle empty diff", () => {
      expect(normalizeRangeInDiff([])).toEqual([]);
    });

    it("should handle diff with only equal operations", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello world" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual(diff);
    });

    it("should handle range markers with no content edits", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "equal", text: " world" },
      ];

      // No content edits, so markers should stay as-is
      expect(normalizeRangeInDiff(diff)).toEqual(diff);
    });

    it("should split RANGE_START embedded in text", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "insert", text: `${RANGE_START}there`, id: "1" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: "there", id: "1" },
      ]);
    });

    it("should split RANGE_END embedded in text", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "insert", text: `there${RANGE_END}`, id: "1" },
      ];

      expect(normalizeRangeInDiff(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "insert", text: "there", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ]);
    });
  });
});
