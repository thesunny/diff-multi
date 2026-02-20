# How to Use

We start with some text with edits applied to it.

> The <del>quick </del>brown fox jumped over the <ins>extremely</ins> lazy dog.

This is the equivalent of an original version

> The quick brown fox jumped over the lazy dog.

And the final version with edits applied

> The brown fox jumped over the extremely lazy dog.
     ^- quick removed              ^- extremely inserted

We communicate changes that we wish to make from the LLM in two ways...

1. We say we like the change
2. We say we don't like it and here's what we think it should be

## We like the change

### Accepting the delete

For the <del> we can indicate that we agree with the change be marking it and leaving it the way it is...

> The <start><end>brown fox jumped over the extremely lazy dog.

Notice that the part outside of <start> and <end> is identical to the applied version of the existing text with edits.

The <del></del> may possibly shift outside of <start> and <end> depending on the way the edit gets diffed, so our `normalizeRangeInDiff` makes sure that it gets fixed. The <start> and <end> will ALWAYS expand outside of any diffs.

### Accepting the insert

For the <ins> let's say we also want to indicate that we agree with the change by marking it and showing the target with the <ins>.

> The brown fox jumped over the <start>extremely </end>lazy dog.

