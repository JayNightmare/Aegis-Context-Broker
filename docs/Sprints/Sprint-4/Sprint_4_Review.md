# Sprint 4 Retrospective: Third-Party Integration

## Accomplishments

### 1. External Domain Connectors

We bridged the gap between Vertex AI's hypotheses and actual external tools, utilizing the secure OAuth token pipeline initialized in Phase 1.

- [githubSearch.ts](../../../backend/src/services/githubSearch.ts): Fetches the developer's GitHub token from the Secret Manager and queries the GitHub Search API for PRs related to the predicted insight. Handles rate limits and missing tokens gracefully.
- [jiraSearch.ts](../../../backend/src/services/jiraSearch.ts): Established the stubbed contract for Jira issue resolution.

### 2. Concurrent Resolution Engine

- [insightResolver.ts](../../../backend/src/services/insightResolver.ts): Engineered a concurrent mapping engine utilizing `Promise.allSettled`. It maps over the Vertex predictions in parallel without significantly delaying the total transaction time. It enriches the AI JSON with an `actualUrl` if the third-party platforms yield results.

### 3. Glassbox UI: Actionable Links

The AI predictions are no longer static text; they act as a direct portal to the relevant external platforms.

- [AIPredictions.tsx](../../../client/webview/src/components/AIPredictions.tsx): Overhauled the UI state to handle `actualUrl` hyperlinking. Integrated an animated "Thinking..." spinner to mask the latency overhead of querying multiple third-party REST APIs over the network.
