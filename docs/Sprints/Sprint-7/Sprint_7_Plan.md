# Sprint 7: Proactive Pre-Fetch Engine

This sprint transforms Aegis from a manual tool into a proactive assistant. Predictions are now triggered automatically when the developer settles on a file, cached in memory, and pre-loaded with full PR/Issue content — so when the panel opens, everything is already prepared.

## Goal Description

When a developer opens a file, Aegis should silently predict which PRs, issues, and docs they need, fetch the full content of those items, and have everything cached and ready before the developer even opens the panel. The button becomes "Refresh" not "Start."

## Proposed Changes

### 1. PredictionEngine (Client)
- **[predictionEngine.ts](../../../client/src/predictionEngine.ts)**: [NEW] Dedicated class that watches for context changes, debounces by 5 seconds, deduplicates by file+branch hash, fetches predictions in the background, caches results, and pushes them to the Webview.

### 2. Extension Refactor
- **[extension.ts](../../../client/src/extension.ts)**: [MODIFY] Delegate all prediction logic to `PredictionEngine`. Predictions cache even before the panel opens. Added `request_cached_predictions` and `prediction_loading` IPC commands.

### 3. GitHub Content Pre-Fetch
- **[githubDetails.ts](../../../backend/src/services/githubDetails.ts)**: [NEW] Fetches full PR/Issue body, labels, changed files count, and comment count from GitHub API.
- **[githubSearch.ts](../../../backend/src/services/githubSearch.ts)**: [MODIFY] Extended `GitHubResult` with `body`, `labels`, `changedFilesCount`, `commentCount`.
- **[insightResolver.ts](../../../backend/src/services/insightResolver.ts)**: [MODIFY] Calls `fetchGitHubDetails` after search to hydrate each result.

### 4. Expandable Preview Cards
- **[AIPredictions.tsx](../../../client/webview/src/components/AIPredictions.tsx)**: [MODIFY] Auto-loads on mount, expandable cards with body/labels/metadata, "↻ Refresh" button, "Last updated" timestamp.

## Verification Plan
1. `npx tsc --noEmit` clean on both backend and client.
2. Open a file → wait 5s → open Aegis panel → predictions already loaded.
3. Click a card → body, labels, and metadata expand inline.
4. Switch files → predictions auto-refresh after 5s settle time.
