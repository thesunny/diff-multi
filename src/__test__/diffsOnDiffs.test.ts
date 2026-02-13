import { describe, it, expect } from "vitest";
import { semanticDiff } from "../semanticDiff";
import { mergeDiffs } from "../mergeDiffs";
import { logDiff } from "../visualizeDiff";
import { layerDiffs } from "../layerDiffs";

describe("diffs on diffs", () => {
  it("should create a diff with insert and delete", () => {
    const diff1 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick red fox jumps over the lazy dog.",
      "1",
    );
    const diff2 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick brown fox leaps over the sleepy dog.",
      "2",
    );
    const merged = mergeDiffs(diff1, diff2);
    // console.log(diff1);
    // logDiff("diff1:", diff1);
    // logDiff("diff2:", diff2);
    // logDiff("merged:", merged!);
    // expect(true).toBe(true);
  });

  it("should delete and insert", () => {
    const diff1 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick fox jumps over the lazy dog.",
      "1",
    );
    const diff2 = semanticDiff(
      "The quick fox jumps over the lazy dog.",
      "The quick brown fox jumps over the lazy dog.",
      "1",
    );
  });
});
