# Sprint 4: Third-Party Integration Sprint Plan

This sprint bridges the gap between the Vertex AI predictive engine and real-world developer tools. We will utilize the secure OAuth tokens stored in Google Secret Manager during Phase 1 to query GitHub and Jira, transforming the AI's hypothetical ticket predictions into actual clickable links.

## Proposed Changes

### 1. Third-Party API Wrappers (Backend)

We need modular services that fetch from GitHub and Jira using the securely retrieved tokens.

- **`backend/src/services/githubSearch.ts`**: [NEW] A service that retrieves the user's GitHub token via [secretManager.ts](../../../backend/src/services/secretManager.ts) and executes a search query against the GitHub REST API (`GET /search/issues?q=...`) based on the Vertex AI prediction titles.
- **`backend/src/services/jiraSearch.ts`**: [NEW] A stubbed service for Jira queries following the same pattern.
- **`backend/src/services/insightResolver.ts`**: [NEW] A mapping engine. It takes the array of `insights` from the AI, determines if it's a "GitHub PR" or "Jira Ticket", and fires the respective search query.

### 2. Prediction API Modification (Backend)

Update the core prediction route to enrich the data.

- **[backend/src/routes/predict.ts](../../../backend/src/routes/predict.ts)**: [MODIFY] After [generatePredictiveInsights](../../../backend/src/services/vertexAi.ts#37-68) returns the AI JSON, pass it through `insightResolver.ts` to attach an `actualUrl` string to each insight before returning to the Webview.

### 3. Glassbox UI: Clickable Links (Client)

Update the UI to reflect resolved links vs unresolved hypotheses.

- **[client/webview/src/components/AIPredictions.tsx](../../../client/webview/src/components/AIPredictions.tsx)**: [MODIFY] Add a `<a href={insight.actualUrl}>` wrapper around the insight title if the backend successfully mapped the AI prediction to a real Jira/GitHub issue.

## Verification Plan

### Automated Tests

- Write Jest tests for `insightResolver.ts` and `githubSearch.ts` to ensure we handle failed API rate-limits correctly without crashing the whole predict pipeline.

### Manual Verification

1. Insert a mock or valid GitHub Personal Access Token into the Google Secret Manager via the backend API.
2. Trigger "Generate Insights" from the Webview.
3. Validate that the Webview now shows real clickable URLs leading to GitHub issues based on the local file context.
