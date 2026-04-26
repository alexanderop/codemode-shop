# Quote Code From Disk

When generated output references code — walkthroughs, reviews, PR bodies, docs, brain entries, chat answers — extract the snippet with a shell command (`sed`, `grep`, `cat`, `git show`) rather than retyping it from memory or context.

**Why:** Code retyped from memory drifts. Indentation flattens, imports vanish, field names shift, error messages get paraphrased — all in ways the model cannot detect because the output _looks_ like the original. A snippet piped from disk is verbatim by construction and tracks the current commit. The cost of one shell call is trivial; the cost of a confidently wrong quote in documentation or a review is large and silent. This is the same instinct as [[principles/prove-it-works]] applied to output: don't trust your reconstruction, check the source.

Origin: Simon Willison's _Linear Walkthroughs_ pattern — "use sed or grep or cat or whatever you need to include snippets of code you are talking about."

**Pattern:**

- **Extract, don't retype.** `sed -n '40,60p' path/to/file.ts` beats reconstructing the snippet. The shell call is cheaper than a hallucination.
- **Just-in-time, not cached.** Fetch the snippet at write time so the output reflects the working tree, not whatever you read three turns ago.
- **Cite the path + line range.** A reader (human or future agent) should be able to re-run the same command and get the same bytes back.
- **For diffs and reviews, pipe from git.** `git show <sha>:<path>` or `git diff` — not your recollection of the change.
- **Treat context as cache, not source.** The file on disk is canonical. If the snippet matters, re-read it.
- **Applies recursively.** When delegating walkthroughs or reviews to a subagent, instruct it to extract the same way — agents fabricate code more confidently than humans do.
