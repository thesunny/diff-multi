# How to Use

We start with some text with edits applied to it.

> The <del>quick </del>brown fox jumped over the <ins>extremely</ins> lazy dog.

This is the equivalent of an original version

> The quick brown fox jumped over the lazy dog.

And this is the version with the existing edits applied

> The brown fox jumped over the extremely lazy dog.
     ^- quick removed              ^- extremely inserted

We communicate changes that we wish to make from the LLM in two ways...

1. We say we like the change
2. We say we don't like it and here's what we think it should be

## We like the change

### Accepting the insert

For the <ins> let's say we also want to indicate that we agree with the change by marking it and showing the target with the <ins>.

> The brown fox jumped over the <start>extremely </end>lazy dog.

The same thing here. We mark the start/end of the edit, and everything outside of it is exactly the same as the version with existing edits applied.

### Accepting the delete

For the <del> we can indicate that we agree with the change by marking it and leaving it the way it is...

> The<start> <end>brown fox jumped over the extremely lazy dog.

Notice that the part outside of <start> and <end> is identical to the version with existing edits applied

The <del></del> may possibly shift outside of <start> and <end> depending on the way the edit gets diffed, so our `normalizeRangeInDiff` makes sure that it gets fixed. The <start> and <end> will ALWAYS expand outside of any diffs.

---

# WIP

## We don't like the change

### Rejecting the insert

We don't want the insert so we revert it back to the original version.

> The quick brown fox jumped over the<start> </end>lazy dog.

Keep the rest the version with existing edits applied.

### Rejecting the delete

We don't want the delete so revert it back to the original version.

> The <start>quick </end>brown fox jumped over the extremely lazy dog.

## We don't like the change and want something else

Sometimes we want to modify an existing edit rather than simply accepting or rejecting it.

### Modifying the insert delete before

We want to delete some text that comes before the insert.

> The brown fox jumped over the <start>extremely lazy</end> dog.

This deletes " " before "extremely" and keeps the insert.

### Modifying the insert delete after

We want to delete some text that comes after the insert.

> The brown fox jumped over the <start>extremely</end> dog.

This deletes " lazy" after "extremely".

### Modifying the insert insert before

We want to insert some text before the existing insert.

> The brown fox jumped over the <start>very extremely </end>lazy dog.

This inserts "very " before "extremely ".

### Modifying the insert insert after

We want to insert some text after the existing insert.

> The brown fox jumped over the <start>extremely very </end>lazy dog.

This inserts "very " after "extremely ".

### Modifying the delete

We want to change what was deleted entirely.

> The <start>fast </end>brown fox jumped over the extremely lazy dog.

This replaces "quick " with "fast " instead.

### Modifying the delete delete before

We want to delete additional text before where the delete occurred.

> <start></end>The brown fox jumped over the extremely lazy dog.

This deletes "The " in addition to the already deleted "quick ".

### Modifying the delete delete after

We want to delete additional text after where the delete occurred.

> The <start></end>fox jumped over the extremely lazy dog.

This deletes "brown " in addition to the already deleted "quick ".

### Modifying the delete insert

We want to insert text where the delete occurred.

> The <start>fast </end>brown fox jumped over the extremely lazy dog.

This inserts "fast " where "quick " was deleted.
