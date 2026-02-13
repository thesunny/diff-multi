import type { Change } from "./semanticDiff";
import { normalizeRangeInDiff } from "./normalizeRangeInDiff";

type OperationMap = Map<number, { text: string; id: string }[]>;

const getChangeId = (change: Change | undefined): string | undefined => {
  if (!change || change.op === "equal") {
    return undefined;
  }
  return change.id;
};

function mergeTwoDiffs(diff1: Change[], diff2: Change[]): Change[] | null {
  const addInsert = (map: OperationMap, index: number, change: Change) => {
    if (change.op !== "insert" || !change.text.length) {
      return;
    }
    const bucket = map.get(index);
    if (bucket) {
      bucket.push({ text: change.text, id: change.id });
    } else {
      map.set(index, [{ text: change.text, id: change.id }]);
    }
  };

  const diff1Inserts: OperationMap = new Map();
  const diff2Inserts: OperationMap = new Map();
  const diff1DeleteIntervals: Array<{ start: number; end: number }> = [];
  const basePieces: string[] = [];
  const diff1Deletes: boolean[] = [];
  const diff1DeleteOwner: string[] = [];

  let baseIndex = 0;
  for (const change of diff1) {
    if (change.op === "insert") {
      addInsert(diff1Inserts, baseIndex, change);
      continue;
    }

    basePieces.push(change.text);

    if (change.op === "delete" && change.text.length > 0) {
      diff1DeleteIntervals.push({
        start: baseIndex,
        end: baseIndex + change.text.length,
      });
    }

    for (let i = 0; i < change.text.length; i += 1) {
      const pos = baseIndex + i;
      diff1Deletes[pos] = change.op === "delete";
      diff1DeleteOwner[pos] =
        change.op === "delete" ? change.id : diff1DeleteOwner[pos] ?? "";
    }

    baseIndex += change.text.length;
  }

  const base = basePieces.join("");
  const baseLength = base.length;

  const diff2Deletes: boolean[] = Array(baseLength).fill(false);
  const diff2DeleteOwner: string[] = Array(baseLength).fill("");
  let baseIndex2 = 0;
  const basePiecesFromDiff2: string[] = [];

  let intervalIdx = 0;
  const isInsideDiff1Delete = (index: number) => {
    while (intervalIdx < diff1DeleteIntervals.length) {
      const current = diff1DeleteIntervals[intervalIdx];
      if (!current) {
        break;
      }
      if (index < current.end) {
        break;
      }
      intervalIdx += 1;
    }

    const interval = diff1DeleteIntervals[intervalIdx];
    return interval ? index > interval.start && index < interval.end : false;
  };

  for (const change of diff2) {
    if (change.op === "insert") {
      if (isInsideDiff1Delete(baseIndex2)) {
        return null;
      }

      addInsert(diff2Inserts, baseIndex2, change);
      continue;
    }

    const { text } = change;

    if (base.slice(baseIndex2, baseIndex2 + text.length) !== text) {
      return null;
    }

    if (text.length) {
      basePiecesFromDiff2.push(text);
    }

    if (change.op === "delete") {
      for (let i = 0; i < text.length; i += 1) {
        const pos = baseIndex2 + i;

        if (diff1Deletes[pos]) {
          return null;
        }

        diff2Deletes[pos] = true;
        diff2DeleteOwner[pos] = change.id;
      }
    }

    baseIndex2 += text.length;
  }

  if (baseIndex2 !== baseLength) {
    return null;
  }

  if (basePiecesFromDiff2.join("") !== base) {
    return null;
  }

  const result: Change[] = [];
  const pushChange = (op: Change["op"], text: string, id?: string) => {
    if (!text.length) {
      return;
    }
    const last = result[result.length - 1];
    if (op === "equal") {
      if (last && last.op === "equal") {
        last.text += text;
      } else {
        result.push({ op: "equal", text });
      }
      return;
    }
    if (!id) {
      throw new Error(`Expected id for operation "${op}" in mergeTwoDiffs.`);
    }
    if (last && last.op === op && last.id === id) {
      last.text += text;
      return;
    }
    if (op === "insert") {
      result.push({ op: "insert", text, id });
    } else {
      result.push({ op: "delete", text, id });
    }
  };

  for (let i = 0; i <= baseLength; i += 1) {
    const diff1InsertAtIndex = diff1Inserts.get(i);
    if (diff1InsertAtIndex) {
      for (const entry of diff1InsertAtIndex) {
        pushChange("insert", entry.text, entry.id);
      }
    }

    const diff2InsertAtIndex = diff2Inserts.get(i);
    if (diff2InsertAtIndex) {
      for (const entry of diff2InsertAtIndex) {
        pushChange("insert", entry.text, entry.id);
      }
    }

    if (i >= baseLength) {
      continue;
    }

    if (diff1Deletes[i]) {
      const id = diff1DeleteOwner[i] || getChangeId(diff1[0]) || "diff1";
      pushChange("delete", base.charAt(i), id);
      continue;
    }

    if (diff2Deletes[i]) {
      const id = diff2DeleteOwner[i] || getChangeId(diff2[0]) || "diff2";
      pushChange("delete", base.charAt(i), id);
      continue;
    }

    pushChange("equal", base.charAt(i));
  }

  return result;
}

export function mergeDiffs(...diffs: Change[][]): Change[] | null {
  if (!diffs.length) {
    return [];
  }

  const first = diffs[0]!;
  const rest = diffs.slice(1);

  const result = rest.reduce<Change[] | null>((combined, current) => {
    if (combined === null) {
      return null;
    }
    return mergeTwoDiffs(combined, current);
  }, first);

  if (result === null) {
    return null;
  }

  return normalizeRangeInDiff(result);
}
