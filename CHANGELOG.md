# Changelog

All notable changes to the Aegis Context Broker project will be documented in this file.

## [0.6.0] - Phase 6: Proactive Pre-Fetch Engine

### Added
- **`predictionEngine.ts`**: Auto-triggers predictions on context change with 5s debounce and context hash dedup. Caches results and pushes to Webview on panel open.
- **`githubDetails.ts`**: Pre-fetches PR/Issue body, labels, changed files count, and comment count from GitHub API.

### Changed
- **`extension.ts`**: Refactored to delegate prediction logic to `PredictionEngine`. Predictions cache even before panel opens.
- **`insightResolver.ts`**: Hydrates `GitHubResult` with body/labels/comments after search.
- **`AIPredictions.tsx`**: Auto-loads on mount, expandable preview cards, "↻ Refresh" button, label chips, metadata row, "Last updated" timestamp.
- **`githubSearch.ts`**: `GitHubResult` extended with `body`, `labels`, `changedFilesCount`, `commentCount`.

## [0.5.0] - Phase 5: Core Prediction Engine


### Changed

- **`contextExtractor.ts`**: Now extracts `openSymbols` (via document symbol provider), `recentFiles` (last 5), `diagnostics` (errors/warnings), and `repoHint` (parsed from git remote URL) — giving the AI real IDE signals.
- **`aiPrompt.ts`**: Rewrote prompt to inject all new context fields and added `searchQuery` to the AI schema for optimised GitHub search strings.
- **`githubSearch.ts`**: Scopes searches to the user's own repo via `repo:` qualifier, handles 429 rate limits explicitly, returns structured `GitHubResult` object.
- **`insightResolver.ts`**: Threads `repoHint` and `preferType` into GitHub search; returns `GitHubResult` instead of a bare URL.
- **`AIPredictions.tsx`**: Full redesign with per-insight cards, type badges, PR number, open/closed chip, confidence bar (green/amber/red), and shimmer skeleton loaders.

## [0.4.0] - Phase 4: Third-Party APIs Integrated


### Added

- Integrated concurrent `insightResolver.ts` engine mapping AI predictions to real-world URLs.
- Implemented `githubSearch.ts` querying the GitHub API via tokens extracted from Secret Manager.
- Added animated loading indicator and hyperlink parsing to the `AIPredictions.tsx` UI Webview.

## [0.3.0] - Phase 3: AI Augmentation

### Added

- Integrated Vertex AI `gemini-1.5-flash-preview-0514` for deterministic insight generation.
- Implemented rigid JSON templating in `aiPrompt.ts` to ensure structured output.
- Exposed `GET /api/predict` endpoint for secure AI-driven context prediction.
- Enhanced `AIPredictions.tsx` to display AI-generated insights with loading states.

## [0.2.0] - Phase 2: Context Ingestion

### Added

- Implemented `contextExtractor.ts` with 2,000ms debounce for efficient workspace polling.
- Integrated native VSCode Git extension API to surface active branch state.
- Added `cache.ts` for encrypted local caching using VSCode's `SecretStorage`.
- Implemented `firestore.ts` for sequential context persistence in Firebase.
- Enhanced `StateIndicator.tsx` to display real-time serialized ContextSnapshots.

## [0.1.0] - Phase 1: Infrastructure & Vault Initialized

### Added

- Initial project documentation (`docs/Report.md`).
- Established `MEMORY.md` for project state, architectural decisions, and coding standards/boilerplates.
- Established `CHANGELOG.md` for tracking feature additions.
- Scaffolded VSCode Extension using `esbuild` and TypeScript.
- Embedded a Vite-powered React Webview application.
- Initialized Node.js Express backend for Google Cloud Run deployment.
- Created Google Secret Manager `secretManager.ts` wrapper with cryptographic isolation by User ID.
- Implemented mocked `githubAuth.ts` secure token exchange service.
