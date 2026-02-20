# Things to Improve

- [ ] See "How to use examples" in mergeAndLayerDiffs.test.ts. There are several failure cases when the LLM places markers adjacent to the edits they intend to capture.
  - Hopefully, but it's possible it's impossible, we can automatically move the markers pretty deterministically to encompass the edits we want.
  - If it's not possible, we will have to prompt the LLM strongly to make sure the markers are in the right positions.