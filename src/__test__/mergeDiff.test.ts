import { describe, it, expect } from "vitest";
import DiffMatchPatch from "diff-match-patch";
import { semanticDiff } from "../semanticDiff";
import { mergeDiffs } from "../mergeDiffs";
const diffMatchPatch = new DiffMatchPatch();

describe("mergeDiffs successfully", () => {
  it("should semantic diff two strings", () => {
    const diff = semanticDiff(
      "The quick brown fox jumps over the lazy mouse",
      "The quick brown fox jumps over the lazy sofas",
      "1"
    );
    expect(diff).toEqual([
      { op: "equal", text: "The quick brown fox jumps over the lazy " },
      { op: "delete", text: "mouse", id: "1" },
      { op: "insert", text: "sofas", id: "1" },
    ]);
  });

  it("should merge two deletes both ways", () => {
    const diff1 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick fox jumps over the lazy dog.",
      "1"
    );
    const diff2 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick brown fox jumps over the dog.",
      "2"
    );
    const mergedDiffs = mergeDiffs(diff1, diff2);
    expect(mergedDiffs).toEqual([
      { op: "equal", text: "The quick " },
      { op: "delete", text: "brown ", id: "1" },
      { op: "equal", text: "fox jumps over the " },
      { op: "delete", text: "lazy ", id: "2" },
      { op: "equal", text: "dog." },
    ]);

    const mergedDiffsBackwards = mergeDiffs(diff2, diff1);
    expect(mergedDiffsBackwards).toEqual(mergedDiffs);
  });

  it("should merge two nearby deletes both ways", () => {
    const diff1 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick fox jumps over the lazy dog.",
      "1"
    );
    const diff2 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The brown fox jumps over the lazy dog.",
      "2"
    );
    const mergedDiffs = mergeDiffs(diff1, diff2);
    expect(mergedDiffs).toEqual([
      { op: "equal", text: "The " },
      { op: "delete", text: "quick ", id: "2" },
      { op: "delete", text: "brown ", id: "1" },
      { op: "equal", text: "fox jumps over the lazy dog." },
    ]);
    const mergedDiffsBackwards = mergeDiffs(diff2, diff1);
    expect(mergedDiffsBackwards).toEqual(mergedDiffs);
  });

  it("should merge two inserts both ways", () => {
    const diff1 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick brown super fox jumps over the lazy dog.",
      "1"
    );
    const diff2 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick brown fox jumps over the lazy dumb dog.",
      "2"
    );
    const mergedDiffs = mergeDiffs(diff1, diff2);
    expect(mergedDiffs).toEqual([
      { op: "equal", text: "The quick brown " },
      { op: "insert", text: "super ", id: "1" },
      { op: "equal", text: "fox jumps over the lazy " },
      { op: "insert", text: "dumb ", id: "2" },
      { op: "equal", text: "dog." },
    ]);
    const mergedDiffsBackwards = mergeDiffs(diff2, diff1);
    expect(mergedDiffsBackwards).toEqual(mergedDiffs);
  });

  it("should merge two nearby inserts both ways, but slightly different order because they are at the same position", () => {
    const diff1 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick brown super fox jumps over the lazy dog.",
      "1"
    );
    const diff2 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick brown smart fox jumps over the lazy dog.",
      "2"
    );
    const mergedDiffs = mergeDiffs(diff1, diff2);
    expect(mergedDiffs).toEqual([
      { op: "equal", text: "The quick brown " },
      { op: "insert", text: "super ", id: "1" },
      { op: "insert", text: "smart ", id: "2" },
      { op: "equal", text: "fox jumps over the lazy dog." },
    ]);
    const mergedDiffsBackwards = mergeDiffs(diff2, diff1);
    expect(mergedDiffsBackwards).toEqual([
      { op: "equal", text: "The quick brown " },
      { op: "insert", text: "smart ", id: "2" },
      { op: "insert", text: "super ", id: "1" },
      { op: "equal", text: "fox jumps over the lazy dog." },
    ]);
  });

  it("should merge an insert and a delete both ways", () => {
    const diff1 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The brown fox jumps over the lazy dog.",
      "1"
    );
    const diff2 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick brown fox jumps over the super lazy dog.",
      "2"
    );
    const mergedDiffs = mergeDiffs(diff1, diff2);
    expect(mergedDiffs).toEqual([
      { op: "equal", text: "The " },
      { op: "delete", text: "quick ", id: "1" },
      { op: "equal", text: "brown fox jumps over the " },
      { op: "insert", text: "super ", id: "2" },
      { op: "equal", text: "lazy dog." },
    ]);
    const mergedDiffsBackwards = mergeDiffs(diff2, diff1);
    expect(mergedDiffsBackwards).toEqual(mergedDiffs);
  });
});

describe("merge more than 3 diffs successfully", () => {
  it("should insert between two deletes", () => {
    const diff1 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The brown fox jumps over the lazy dog.",
      "1"
    );
    const diff2 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick fox jumps over the lazy dog.",
      "2"
    );
    const diff3 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick excited brown fox jumps over the lazy dog.",
      "3"
    );
    const mergedDiffs = mergeDiffs(diff1, diff2, diff3);
    expect(mergedDiffs).toEqual([
      { op: "equal", text: "The " },
      { op: "delete", text: "quick ", id: "1" },
      { op: "insert", text: "excited ", id: "3" },
      { op: "delete", text: "brown ", id: "2" },
      { op: "equal", text: "fox jumps over the lazy dog." },
    ]);
  });
});

describe("mergeDiffs fails", () => {
  it("should fail to merge two diffs that delete the same text", () => {
    const diff1 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick fox jumps over the lazy dog.",
      "1"
    );
    const diff2 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick fox jumps over the lazy dog.",
      "2"
    );
    const mergedDiffs = mergeDiffs(diff1, diff2);
    expect(mergedDiffs).toBeNull();
  });

  it("should fail to merge two diffs that overlap deletes", () => {
    const diff1 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The fox jumps over the lazy dog.",
      "1"
    );
    const diff2 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick jumps over the lazy dog.",
      "2"
    );
    const mergedDiffs = mergeDiffs(diff1, diff2);
    expect(mergedDiffs).toBeNull();
  });

  it("should fail to insert into a delete", () => {
    const diff1 = semanticDiff(
      "The quick jumps over the lazy dog.",
      "The quick brown fox jumps over the lazy dog.",
      "1"
    );
    const diff2 = semanticDiff(
      "The quick brown fox jumps over the lazy dog.",
      "The quick brown happy fox jumps over the lazy dog.",
      "2"
    );
    const mergedDiffs = mergeDiffs(diff1, diff2);
    expect(mergedDiffs).toBeNull();
  });
});
