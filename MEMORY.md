# Aegis Context Broker - Project Memory

## Project State

**Status:** Initialization Phase
**Overview:** Building an AI-driven, secure integration middleware extension for VSCode and Antigravity. Offloads third-party auth (GitHub, Jira, Slack) to Google Secret Manager and uses Vertex AI to predict developer context needs.

## Active Tasks

### Completed

- Project initialization and core documentation setup (`MEMORY.md`, `CHANGELOG.md`, `docs/Report.md`).
- **Phase 1 (Infrastructure & Vault initialization):**
    - Set up the React Webview client.
    - Set up the Node.js backend on Google Cloud Run.
    - Establish secure token pipeline with Google Secret Manager (tested via Jest).

### Next Steps

- **Phase 2 (State Tracking):**
    - Implement IDE context extractor in VSCode.
    - Implement state ingestion API in the Node.js backend.
    - Integrate Firestore for state persistence.
    - Implement local caching layer to prevent excessive network calls.

## Phase 3: AI Augmentation (Completed)

- **Vertex AI Core**: Configured the backend to interface with `gemini-1.5-flash-preview-0514`.
- **Rigid Templating**: Developed `aiPrompt.ts` to strictly instruct the model to return deterministically structured JSON insights.
- **IPC Insights**: Set up `GET /api/predict` in Express and extended `extension.ts` to securely relay Webview requests to the backend.
- **Glassbox UI**: Webview component `AIPredictions.tsx` visualizes the AI's deductions.

## Phase 4: Third-Party Integration (Completed)

- **External Connectors**: Created `githubSearch.ts` and `jiraSearch.ts` wrappers to securely utilize tokens fetched from Google Secret Manager.
- **Concurrent Engine**: Engineered `insightResolver.ts` to map Vertex hypotheses to real-world platform URLs simultaneously using Promise.allSettled.
- **Enriched Predict Node**: Updated the `predict.ts` Express route to inject the `actualUrl` field into the JSON pipeline.
- **UI UX**: Updated `AIPredictions.tsx` with hyperlinking logic and CSS spinner animations to respect UX latency.

## Architectural Decisions

1. **Client:** React Webview (VSCode Extension API).
2. **Backend:** Node.js on Google Cloud Run. (GCP Project ID: `aegis-488920`)
3. **Gateway/Auth:** Google Cloud API Gateway & Firebase Auth. (Firebase ID: `aegis-796f9`)
4. **Security:** Google Secret Manager strictly handles all third-party OAuth tokens. No local token storage.
5. **Database:** Firestore (stores anonymized context snapshots).
6. **Intelligence:** Vertex AI for mapping code-state to external platform data.
7. **Performance (Sceptical Approach):** Must actively question latency bottlenecks. Implement encrypted local caching for non-sensitive metadata to prevent excessive network round-trips.

## Coding Standards & Directives

1. **No In-line Comments:** Use strictly comprehensive comment blocks at the top of every generated file.
2. **Mandatory Documentation Workflow:** Always update `MEMORY.md` and `CHANGELOG.md` when completing tasks or making architectural decisions.
3. **Top-of-File Boilerplate Template:** Always prepend the following to new code files:

```typescript
/**
 * ============================================================================
 * File: [Insert File Name, e.g., src/services/secretManager.ts]
 * ============================================================================
 * * Objective:
 * [A clear, concise explanation of exactly what this file achieves and its
 * role within the Aegis Context Broker.]
 * * Architectural Considerations & Sceptical Analysis:
 * - [Forward-Thinking View: How does this scale? What happens if it fails?]
 * - [Bottlenecks/Latency: Are there network calls here? How are we caching?]
 * - [Innovation: What out-of-the-box approach is being used here?]
 * * Core Dependencies:
 * [List of main external modules or internal services interacting with this file]
 * ============================================================================
 */

// Code execution begins here...
```
