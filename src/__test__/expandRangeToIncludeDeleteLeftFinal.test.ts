import { describe, it, expect } from "vitest";
import { expandRangeToIncludeDeleteLeftFinal } from "../expandRangeToIncludeDeleteLeftFinal";
import { RANGE_START, RANGE_END } from "../constants";
import type { Change } from "../semanticDiff";

describe("expandRangeToIncludeDeleteLeftFinal", () => {
  describe("moves RANGE_START before adjacent delete", () => {
    it("should move RANGE_START before a delete immediately to its left", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: "there", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ];

      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: "there", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ]);
    });

    it("should move RANGE_START before delete when it's the only content", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ];

      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ]);
    });
  });

  describe("does not move RANGE_START when RANGE_END is to the left", () => {
    it("should not move RANGE_START when preceded by RANGE_END", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: "world", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "insert", text: RANGE_START, id: "2" },
        { op: "insert", text: "there", id: "2" },
        { op: "insert", text: RANGE_END, id: "2" },
      ];

      // RANGE_START for id "2" should NOT move even though it follows another range
      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual(diff);
    });

    it("should not move RANGE_START when preceded by RANGE_END from different id", () => {
      const diff: Change[] = [
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "delete", text: "foo", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "insert", text: RANGE_START, id: "2" },
        { op: "delete", text: "bar", id: "2" },
        { op: "insert", text: RANGE_END, id: "2" },
      ];

      // Neither RANGE_START should move because the second one is preceded by RANGE_END
      // and the first one has no preceding delete
      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual(diff);
    });
  });

  describe("does not move when no delete to the left", () => {
    it("should not move RANGE_START when preceded by equal", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: "world", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ];

      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual(diff);
    });

    it("should not move RANGE_START when preceded by insert", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "insert", text: "extra ", id: "1" },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: "world", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ];

      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual(diff);
    });

    it("should not move RANGE_START when it's at the beginning", () => {
      const diff: Change[] = [
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: "world", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ];

      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual(diff);
    });
  });

  describe("handles multiple ranges", () => {
    it("should move multiple RANGE_STARTs when each has adjacent delete", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: "there", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "equal", text: " and " },
        { op: "delete", text: "goodbye", id: "2" },
        { op: "insert", text: RANGE_START, id: "2" },
        { op: "insert", text: "farewell", id: "2" },
        { op: "insert", text: RANGE_END, id: "2" },
      ];

      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: "there", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "equal", text: " and " },
        { op: "insert", text: RANGE_START, id: "2" },
        { op: "delete", text: "goodbye", id: "2" },
        { op: "insert", text: "farewell", id: "2" },
        { op: "insert", text: RANGE_END, id: "2" },
      ]);
    });
  });

  describe("collapsed ranges (RANGE_START immediately followed by RANGE_END)", () => {
    it("should move collapsed range before adjacent delete", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ];

      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ]);
    });

    it("should not move collapsed range when preceded by equal", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "equal", text: " world" },
      ];

      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual(diff);
    });

    it("should not move collapsed range when preceded by another collapsed range", () => {
      // Two collapsed ranges back-to-back
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "insert", text: RANGE_START, id: "2" },
        { op: "insert", text: RANGE_END, id: "2" },
      ];

      // Second collapsed range's RANGE_START is preceded by RANGE_END, so it shouldn't move
      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual(diff);
    });

    it("should move first collapsed range but not second when first has delete to its left", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "insert", text: RANGE_START, id: "2" },
        { op: "insert", text: RANGE_END, id: "2" },
      ];

      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual([
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "insert", text: RANGE_START, id: "2" },
        { op: "insert", text: RANGE_END, id: "2" },
      ]);
    });

    it("should handle collapsed range at the beginning of diff", () => {
      const diff: Change[] = [
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "equal", text: "hello" },
      ];

      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual(diff);
    });

    it("should handle collapsed range between two deletes", () => {
      const diff: Change[] = [
        { op: "delete", text: "foo", id: "1" },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "delete", text: "bar", id: "2" },
      ];

      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual([
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "delete", text: "foo", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
        { op: "delete", text: "bar", id: "2" },
      ]);
    });
  });

  describe("edge cases", () => {
    it("should handle empty diff", () => {
      expect(expandRangeToIncludeDeleteLeftFinal([])).toEqual([]);
    });

    it("should handle diff with no range markers", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "delete", text: "world", id: "1" },
        { op: "insert", text: "there", id: "1" },
      ];

      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual(diff);
    });

    it("should handle diff with only RANGE_END (no RANGE_START)", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "insert", text: "world", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ];

      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual(diff);
    });

    it("should not affect RANGE_END positioning", () => {
      const diff: Change[] = [
        { op: "equal", text: "hello " },
        { op: "insert", text: RANGE_START, id: "1" },
        { op: "insert", text: "world", id: "1" },
        { op: "delete", text: "foo", id: "1" },
        { op: "insert", text: RANGE_END, id: "1" },
      ];

      // RANGE_END should stay in place even though delete precedes it
      expect(expandRangeToIncludeDeleteLeftFinal(diff)).toEqual(diff);
    });
  });
});
