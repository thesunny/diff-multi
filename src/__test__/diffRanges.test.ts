import { describe, it, expect } from "vitest";
import { semanticDiff } from "../semanticDiff";
import { mergeDiffs } from "../mergeDiffs";
import { logDiff } from "../visualizeDiff";
import { RANGE_START, RANGE_END } from "../constants";

describe("diffRanges", () => {
  it("should diff with a small insertion edit", () => {
    const oldText = "The quick brown fox jumps over the lazy dog.";
    const newText = `The quick brown fox ${RANGE_START}quickly ${RANGE_END}jumps over the lazy dog.`;

    const diff = semanticDiff(oldText, newText, "edit-1");

    logDiff(diff);
    expect(diff).toEqual([
      { op: "equal", text: "The quick brown fox " },
      { op: "insert", text: RANGE_START, id: "edit-1" },
      { op: "insert", text: "quickly ", id: "edit-1" },
      { op: "insert", text: RANGE_END, id: "edit-1" },
      { op: "equal", text: "jumps over the lazy dog." },
    ]);
  });

  it("should diff with a small deletion edit", () => {
    const oldText = "The quick brown fox jumps over the lazy dog.";
    const newText = `The quick ${RANGE_START}${RANGE_END}fox jumps over the lazy dog.`;

    const diff = semanticDiff(oldText, newText, "edit-1");

    logDiff(diff);
    expect(diff).toEqual([
      { op: "equal", text: "The quick " },
      { op: "insert", text: `${RANGE_START}`, id: "edit-1" },
      { op: "delete", text: "brown ", id: "edit-1" },
      { op: "insert", text: `${RANGE_END}`, id: "edit-1" },
      { op: "equal", text: "fox jumps over the lazy dog." },
    ]);
  });

  it("should diff with insertion and deletion where semantic range covers entire sentence", () => {
    const oldText = "I like cats. Dogs are fun. Birds can fly.";
    const newText = `I like cats. ${RANGE_START}Dogs are boring.${RANGE_END} Birds can fly.`;

    const diff = semanticDiff(oldText, newText, "edit-1");

    logDiff(diff);
    expect(diff).toEqual([
      { op: "equal", text: "I like cats. " },
      { op: "insert", text: RANGE_START, id: "edit-1" },
      { op: "equal", text: "Dogs are " },
      { op: "delete", text: "fun.", id: "edit-1" },
      { op: "insert", text: "boring.", id: "edit-1" },
      { op: "insert", text: RANGE_END, id: "edit-1" },
      { op: "equal", text: " Birds can fly." },
    ]);
  });

  it("should diff with semantic range covering the first sentence", () => {
    const oldText = "I like cats. Dogs are fun. Birds can fly.";
    const newText = `${RANGE_START}I hate cats.${RANGE_END} Dogs are fun. Birds can fly.`;

    const diff = semanticDiff(oldText, newText, "edit-1");

    logDiff(diff);
    expect(diff).toEqual([
      { op: "insert", text: RANGE_START, id: "edit-1" },
      { op: "equal", text: "I " },
      { op: "delete", text: "lik", id: "edit-1" },
      { op: "insert", text: "hat", id: "edit-1" },
      { op: "equal", text: "e cats." },
      { op: "insert", text: RANGE_END, id: "edit-1" },
      { op: "equal", text: " Dogs are fun. Birds can fly." },
    ]);
  });

  it("should diff with semantic range covering the final sentence", () => {
    const oldText = "I like cats. Dogs are fun. Birds can fly.";
    const newText = `I like cats. Dogs are fun. ${RANGE_START}Birds can swim.${RANGE_END}`;

    const diff = semanticDiff(oldText, newText, "edit-1");

    logDiff(diff);
    expect(diff).toEqual([
      { op: "equal", text: "I like cats. Dogs are fun. " },
      { op: "insert", text: RANGE_START, id: "edit-1" },
      { op: "equal", text: "Birds can " },
      { op: "delete", text: "fly.", id: "edit-1" },
      { op: "insert", text: "swim.", id: "edit-1" },
      { op: "insert", text: RANGE_END, id: "edit-1" },
    ]);
  });

  it("should merge two diffs with space between ranges", () => {
    const oldText = "I like cats. Dogs are fun. Birds can fly.";

    // Diff on sentence one: "I like cats" -> "I hate cats"
    const diff1 = semanticDiff(
      oldText,
      `${RANGE_START}I hate cats.${RANGE_END} Dogs are fun. Birds can fly.`,
      "edit-1"
    );

    // Diff on sentence two: "Dogs are fun" -> "Dogs are boring"
    const diff2 = semanticDiff(
      oldText,
      `I like cats. ${RANGE_START}Dogs are boring.${RANGE_END} Birds can fly.`,
      "edit-2"
    );

    const merged = mergeDiffs(diff1, diff2);

    logDiff(merged);
    expect(merged).toEqual([
      { op: "insert", text: RANGE_START, id: "edit-1" },
      { op: "equal", text: "I " },
      { op: "delete", text: "lik", id: "edit-1" },
      { op: "insert", text: "hat", id: "edit-1" },
      { op: "equal", text: "e cats." },
      { op: "insert", text: RANGE_END, id: "edit-1" },
      { op: "equal", text: " " },
      { op: "insert", text: RANGE_START, id: "edit-2" },
      { op: "equal", text: "Dogs are " },
      { op: "delete", text: "fun.", id: "edit-2" },
      { op: "insert", text: "boring.", id: "edit-2" },
      { op: "insert", text: RANGE_END, id: "edit-2" },
      { op: "equal", text: " Birds can fly." },
    ]);
  });

  it("should merge two diffs with adjacent ranges (no space between)", () => {
    const oldText = "I like cats.Dogs are fun. Birds can fly.";

    // Diff on sentence one: "I like cats" -> "I hate cats"
    const diff1 = semanticDiff(
      oldText,
      `${RANGE_START}I hate cats.${RANGE_END}Dogs are fun. Birds can fly.`,
      "edit-1"
    );

    // Diff on sentence two: "Dogs are fun" -> "Dogs are boring"
    const diff2 = semanticDiff(
      oldText,
      `I like cats.${RANGE_START}Dogs are boring.${RANGE_END} Birds can fly.`,
      "edit-2"
    );

    const merged = mergeDiffs(diff1, diff2);

    logDiff(merged);
    expect(merged).toEqual([
      { op: "insert", text: RANGE_START, id: "edit-1" },
      { op: "equal", text: "I " },
      { op: "delete", text: "lik", id: "edit-1" },
      { op: "insert", text: "hat", id: "edit-1" },
      { op: "equal", text: "e cats." },
      { op: "insert", text: RANGE_END, id: "edit-1" },
      { op: "insert", text: RANGE_START, id: "edit-2" },
      { op: "equal", text: "Dogs are " },
      { op: "delete", text: "fun.", id: "edit-2" },
      { op: "insert", text: "boring.", id: "edit-2" },
      { op: "insert", text: RANGE_END, id: "edit-2" },
      { op: "equal", text: " Birds can fly." },
    ]);
  });

  it("should merge three diffs with space between ranges", () => {
    const oldText = "I like cats. Dogs are fun. Birds can fly.";

    const diff1 = semanticDiff(
      oldText,
      `${RANGE_START}I hate cats.${RANGE_END} Dogs are fun. Birds can fly.`,
      "edit-1"
    );

    const diff2 = semanticDiff(
      oldText,
      `I like cats. ${RANGE_START}Dogs are boring.${RANGE_END} Birds can fly.`,
      "edit-2"
    );

    const diff3 = semanticDiff(
      oldText,
      `I like cats. Dogs are fun. ${RANGE_START}Birds can swim.${RANGE_END}`,
      "edit-3"
    );

    const merged = mergeDiffs(diff1, diff2, diff3);

    logDiff(merged);
    expect(merged).toEqual([
      { op: "insert", text: RANGE_START, id: "edit-1" },
      { op: "equal", text: "I " },
      { op: "delete", text: "lik", id: "edit-1" },
      { op: "insert", text: "hat", id: "edit-1" },
      { op: "equal", text: "e cats." },
      { op: "insert", text: RANGE_END, id: "edit-1" },
      { op: "equal", text: " " },
      { op: "insert", text: RANGE_START, id: "edit-2" },
      { op: "equal", text: "Dogs are " },
      { op: "delete", text: "fun.", id: "edit-2" },
      { op: "insert", text: "boring.", id: "edit-2" },
      { op: "insert", text: RANGE_END, id: "edit-2" },
      { op: "equal", text: " " },
      { op: "insert", text: RANGE_START, id: "edit-3" },
      { op: "equal", text: "Birds can " },
      { op: "delete", text: "fly.", id: "edit-3" },
      { op: "insert", text: "swim.", id: "edit-3" },
      { op: "insert", text: RANGE_END, id: "edit-3" },
    ]);
  });

  it("should merge three diffs with adjacent ranges (no space between)", () => {
    const oldText = "I like cats.Dogs are fun.Birds can fly.";

    const diff1 = semanticDiff(
      oldText,
      `${RANGE_START}I hate cats.${RANGE_END}Dogs are fun.Birds can fly.`,
      "edit-1"
    );

    const diff2 = semanticDiff(
      oldText,
      `I like cats.${RANGE_START}Dogs are boring.${RANGE_END}Birds can fly.`,
      "edit-2"
    );

    const diff3 = semanticDiff(
      oldText,
      `I like cats.Dogs are fun.${RANGE_START}Birds can swim.${RANGE_END}`,
      "edit-3"
    );

    const merged = mergeDiffs(diff1, diff2, diff3);

    logDiff(merged);
    expect(merged).toEqual([
      { op: "insert", text: RANGE_START, id: "edit-1" },
      { op: "equal", text: "I " },
      { op: "delete", text: "lik", id: "edit-1" },
      { op: "insert", text: "hat", id: "edit-1" },
      { op: "equal", text: "e cats." },
      { op: "insert", text: RANGE_END, id: "edit-1" },
      { op: "insert", text: RANGE_START, id: "edit-2" },
      { op: "equal", text: "Dogs are " },
      { op: "delete", text: "fun.", id: "edit-2" },
      { op: "insert", text: "boring.", id: "edit-2" },
      { op: "insert", text: RANGE_END, id: "edit-2" },
      { op: "insert", text: RANGE_START, id: "edit-3" },
      { op: "equal", text: "Birds can " },
      { op: "delete", text: "fly.", id: "edit-3" },
      { op: "insert", text: "swim.", id: "edit-3" },
      { op: "insert", text: RANGE_END, id: "edit-3" },
    ]);
  });
});
