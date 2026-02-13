# Layer Diffs

## Problem Description

- The text nodes in the document are marked as either inserted, deleted, or both inserted and then deleted. Note that they are never marked as deleted and then inserted.
- When we pass these nodes to the LLM, we can show it both the original, the edited, and also the edited with metadata.
- We ask the LLM to generate the final version of the paragraph. 
- We then need to generate a diff that turns the current text nodes into new text nodes that include the edits needed to make it to the final version of the paragraph. 
- Any deleted text in the original paragraph cannot be modified. For example, you can't delete previously deleted text.
- In order to reconcile this, what we have to do is remove all the deleted text before creating a semantic diff. 
- The challenge is after we've created the semantic diff, we need to reinsert all the previously deleted text nodes. 
- Furthermore, we need to account for the cases where the semantic diff created off of the text nodes with the delete diffs removed, might not align perfectly.

## Approach

- Step one is we have to remove the deleted text nodes. 