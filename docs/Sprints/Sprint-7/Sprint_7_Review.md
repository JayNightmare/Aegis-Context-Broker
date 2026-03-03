# Sprint 7 Retrospective: Proactive Pre-Fetch Engine

## Accomplishments

### 1. Auto-Trigger Predictions

The manual "Generate Insights" button is no longer the primary entry point. Predictions run silently in the background.

- **[predictionEngine.ts](../../../client/src/predictionEngine.ts)**: New class that owns the entire prediction lifecycle:
  - Listens to context snapshot updates from `ContextExtractor`
  - Debounces by 5 seconds — only predicts when the developer has settled on a file
  - Deduplicates by `activeFile + activeBranch` hash — won't re-predict for the same context
  - Caches results in memory and pushes them to the Webview immediately when the panel opens
  - Supports manual `forceRefresh()` for the "↻ Refresh" button

- **[extension.ts](../../../client/src/extension.ts)**: Refactored to delegate all prediction logic to `PredictionEngine`. The context extractor now wires directly to the prediction engine outside the panel lifecycle, so predictions cache even before the panel is opened for the first time.

### 2. GitHub Content Pre-Fetch

After finding a matching PR or Issue, we now fetch its full content server-side so the Webview can render inline previews.

- **[githubDetails.ts](../../../backend/src/services/githubDetails.ts)**: New service that calls the GitHub API to fetch:
  - PR/Issue body (truncated to 500 characters to keep IPC payloads lean)
  - Label names (up to 8)
  - Changed files count (PRs only)
  - Comment count
  - Parses the `html_url` to derive the API endpoint. Fails open on any error.

- **[githubSearch.ts](../../../backend/src/services/githubSearch.ts)**: `GitHubResult` interface extended with `body`, `labels`, `changedFilesCount`, `commentCount` fields.

- **[insightResolver.ts](../../../backend/src/services/insightResolver.ts)**: After resolving a search match, calls `fetchGitHubDetails()` to hydrate the result — all inside the existing `Promise.allSettled` parallelism (2 GitHub API calls per insight, 6 total).

### 3. Expandable Preview Cards

- **[AIPredictions.tsx](../../../client/webview/src/components/AIPredictions.tsx)**: Full redesign:
  - **Auto-load**: On mount, requests cached predictions via `request_cached_predictions` IPC. No button click needed.
  - **Expandable cards**: Click a card to reveal the PR description, coloured label chips, and metadata.
  - **"↻ Refresh" button**: Replaces "Generate Insights" — clearer intent.
  - **Metadata row**: Shows changed files count (📝) and comment count (💬).
  - **"Last updated X ago"**: Timestamp shows prediction staleness.

## Issues & Resolutions

| Issue                                     | Root Cause                                           | Resolution                                                          |
| ----------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| `GitHubResult` type error in test fixture | Test used old 6-field shape, new shape has 10 fields | Added `body`, `labels`, `changedFilesCount`, `commentCount` to mock |

## What Was Not Done

- **SSE push**: Predictions are still pulled via HTTP GET. Server-sent events would allow instant push but require a persistent connection — deferred to Sprint 8.
- **Progressive streaming**: All 3 insights still wait for Vertex to complete before rendering. Streaming individual insights would improve perceived latency.
