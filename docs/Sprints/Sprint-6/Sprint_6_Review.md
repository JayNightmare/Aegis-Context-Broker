# Sprint 6 Retrospective: Aegis Core Prediction Engine

## Accomplishments

### 1. Rich Context Signals — The AI Now Sees What You're Doing

The single biggest bottleneck to prediction quality was signal poverty. Gemini was being handed a filename and branch name — barely enough to form an educated guess. This has been fixed.

- **[contextExtractor.ts](../../../client/src/contextExtractor.ts)**: Completely rewritten to extract four new signals:
  - `openSymbols`: Top-level function/class names from the active file, using `vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider")`. Time-boxed to 1500ms to avoid blocking on large files.
  - `recentFiles`: Up to 5 most recently visited file paths, tracked per editor-change event.
  - `diagnostics`: Active errors and warnings from the Problems panel, via `vscode.languages.getDiagnostics()`.
  - `repoHint`: The GitHub `owner/repo` string, parsed from the git remote URL (handles both SSH `git@github.com:owner/repo.git` and HTTPS `https://github.com/owner/repo` formats).

- **[firestore.ts](../../../backend/src/services/firestore.ts)**: `ContextSnapshotPayload` extended with the four new fields. Backward-compatible defaults (`[]`, `null`) applied in `state.ts` for any older clients.

### 2. Smarter AI Prompt

- **[aiPrompt.ts](../../../backend/src/services/aiPrompt.ts)**: Prompt rewritten to inject all new context signals with labelled sections (`Open Symbols`, `Active Diagnostics`, `Recently Visited Files`, `GitHub Repository`). A new `searchQuery` field was added to the AI response schema — Gemini now returns an optimised search string per insight rather than just a title, significantly improving GitHub search hit rates.

### 3. Scoped, Structured GitHub Search

Prior implementation queried GitHub globally, returning irrelevant results from unrelated public repositories.

- **[githubSearch.ts](../../../backend/src/services/githubSearch.ts)**: Rewrote to:
  - Scope queries with the `repo:owner/repo` qualifier when `repoHint` is available.
  - Distinguish between PR and Issue searches via `type:pr` / `type:issue` qualifiers.
  - Explicitly handle `429 Too Many Requests` (fail-open, return `null`).
  - Return a structured `GitHubResult` object: `{ title, url, number, state, itemType }`.

- **[insightResolver.ts](../../../backend/src/services/insightResolver.ts)**: Refactored to thread `repoHint` and `preferType` into each search call. Returns `githubResult: GitHubResult | null` on each `ResolvedInsight` instead of a bare `actualUrl` string.

### 4. Card-Based Prediction UI

- **[AIPredictions.tsx](../../../client/webview/src/components/AIPredictions.tsx)**: Fully redesigned. The plain list was replaced with:
  - **Type badge**: `🔀 PR`, `🐛 Issue`, or `📄 Docs` coloured badge per card.
  - **PR metadata**: Number (`#42`) and open/closed state chip with colour coding.
  - **Confidence bar**: Visual fill bar with green (≥75%), amber (≥50%), or red (<50%) colouring.
  - **Reasoning text**: Gemini's `reasoning` field rendered below the title.
  - **Shimmer skeleton loaders**: Three animated skeleton cards replace the plain spinner during the 3–10 second fetch window.
  - **Repo label**: Shows the scoped `owner/repo` at the top of the panel when known.
  - All styles use VSCode CSS variables to respect any user theme automatically.

## Issues & Resolutions

| Issue                             | Root Cause                                                                         | Resolution                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 7 TypeScript errors post-refactor | Test fixtures and `state.ts` used old 4-field `ContextSnapshotPayload`             | Added new required fields with safe defaults in all affected files |
| `predict.ts` duplicate content    | `replace_file_content` target was the import block; new content merged incorrectly | Rewrote file cleanly with `Overwrite: true`                        |

## What Was Not Done

- **Jira OAuth integration**: No Jira OAuth App is registered. The `jiraSearch.ts` stub continues to return `null` gracefully for `Documentation` type insights. Planned for Sprint 7.
- **SSE push predictions**: Predictions are still driven by a manual "Generate Insights" button. Automatic push when context changes significantly is Phase 6 backlog.
- **Streaming Vertex response**: All 3 insights wait for the full Vertex response before any are shown. Progressive streaming would improve perceived performance.
