# Merge and Layer Diffs

Things it supports

- Takes a paragraph from the document with existing edits on it
- Then it takes a modified version of a target paragraph that
  - includes differences from the original and/or final paragraphs of the paragraph in the document
  - Has start and end range markers identifying a semantic edit
- We then do two things with these diffs with range markers on it
  - We merge these diffs together so both diffs can be represented on one paragraph
  - We layer these merged edits onto the existing paragraph, such that the diffs are only stuff we are adding onto the existing paragraphs. These additions or changes will never delete an existing delete edit. They can delete an existing insert edit.