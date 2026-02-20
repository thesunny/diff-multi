# Plan: Move Range Expansion Logic into layerDiffs

## Problem

In `mergeAndLayerDiffs`, `expandRangeToIncludeDeleteLeftFinal` is called on the final merged result to expand RANGE_START markers to include adjacent deletes from `existingDiff`.

This doesn't work because by the time we reach that point, the deletes from `existingDiff` have already been converted to "equal" operations inside `layerDiffs`. The function looks for `op === 'delete'` but finds only "equal" text.

The information about which "equal" segments came from `existingDiff`'s deletes only exists inside `layerDiffs` during placeholder restoration.

## Solution

Move the expansion logic into `layerDiffs` using a post-processing approach with index tracking.

## Implementation Steps

### 1. Track placeholder-derived equals in layerDiffs

In the placeholder restoration loop (lines 48-86), create a `Set<number>` to track indices of "equal" segments that came from restored placeholders.

When pushing the restored placeholder text as "equal" (around line 81), record the index in the set:

```typescript
const placeholderDerivedIndices = new Set<number>();

// ... in the loop, when restoring placeholder:
if (deletedText) {
  placeholderDerivedIndices.add(result.length);  // track index before push
  result.push({ op: "equal", text: deletedText });
}
```

### 2. Add expansion pass before merging adjacent segments

After the placeholder processing loop completes but before `mergeAdjacentSegments`, iterate through `result` to find RANGE_START markers that immediately follow placeholder-derived equals:

```typescript
// Expand RANGE_START to include placeholder-derived equals to the left
for (let i = result.length - 1; i > 0; i--) {
  const change = result[i];
  if (change.op === 'insert' && change.text === RANGE_START) {
    if (placeholderDerivedIndices.has(i - 1)) {
      // Swap: move RANGE_START before the placeholder-derived equal
      const prev = result[i - 1];
      result[i - 1] = change;
      result[i] = prev;
      // Update tracking set since indices shifted
      placeholderDerivedIndices.delete(i - 1);
      placeholderDerivedIndices.add(i);
    }
  }
}
```

### 3. Handle RANGE_END edge case

Check if the element before the placeholder-derived equal is a RANGE_END. If so, don't swap (to avoid disrupting other range boundaries). This mirrors the logic in the current `expandRangeToIncludeDeleteLeftFinal`.

### 4. Remove expandRangeToIncludeDeleteLeftFinal from mergeAndLayerDiffs

In `mergeAndLayerDiffs.ts` line 65, remove the `expandRangeToIncludeDeleteLeftFinal` wrapper:

```typescript
// Before:
return expandRangeToIncludeDeleteLeftFinal(normalizeRangeInDiff(merged));

// After:
return normalizeRangeInDiff(merged);
```

### 5. Consider whether expandRangeToIncludeDeleteLeftFinal can be deleted

If this was its only use case, the function and its file can be removed entirely. Check for other usages first.

## Files to Modify

- `src/layerDiffs.ts` - Add tracking and expansion logic
- `src/mergeAndLayerDiffs.ts` - Remove `expandRangeToIncludeDeleteLeftFinal` call and import

## Files Potentially to Delete

- `src/expandRangeToIncludeDeleteLeftFinal.ts` - If no longer needed

## Testing

Existing tests for range expansion scenarios should continue to pass. The behavior should be identical, just happening at the correct point in the pipeline.
