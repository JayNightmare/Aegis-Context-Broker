# Sprint 2: State Tracking Sprint Plan

This sprint focuses on the core value proposition of the Aegis Context Broker: capturing the developer's immediate context and securely persisting it to the cloud for AI analysis.

## Proposed Changes

### 1. IDE Context Extraction (Client)

The VSCode extension must listen for workspace changes and build a payload representing the developer's current focus.

- **`client/src/contextExtractor.ts`**: [NEW] Service to listen for `vscode.window.onDidChangeActiveTextEditor` and Git branch events. It will debounce these events to construct a "Context Snapshot."
- **[client/src/extension.ts](../../../client/src/extension.ts)**: [MODIFY] Initialize the `contextExtractor` and establish a background polling/event-driven pipeline to send state to the backend.

### 2. State Ingestion & Local Cache (Backend & Client)

We need to persist these snapshots both locally (for speed) and in the cloud (for Vertex AI).

- **`backend/src/routes/state.ts`**: [NEW] API routes for `POST /api/state` to receive state updates and `GET /api/state` to retrieve the latest known state.
- **`backend/src/services/firestore.ts`**: [NEW] Firebase Admin SDK wrapper to interact with the Cloud Firestore `developer_snapshots` collection.
- **`client/src/cache.ts`**: [NEW] A lightweight, encrypted local storage solution (potentially using VSCode's `SecretStorage` or `globalState`) to cache non-sensitive workspace structures, minimizing the need to constantly fetch from the cloud.

### 3. Webview State Indication

The React Webview must reflect the currently captured state to the developer so they understand what the AI is "seeing."

- **`client/webview/src/components/StateIndicator.tsx`**: [NEW] A React component showing the active file, current branch, and the timestamp of the last successful sync with the Cloud Run backend.

## Verification Plan

### Automated Tests

- Create Jest tests for the debounce logic in `contextExtractor.ts` to prove we aren't flooding the network.
- Create Jest tests for `firestore.ts` mocking the Firebase Admin SDK to ensure correct document structuring.

### Manual Verification

1. Open multiple files rapidly in the VSCode instance; verify the backend only receives a state update after the debounce period settles.
2. Verify the Webview correctly updates to reflect the `StateIndicator` information.
3. Validate the Firestore database (via logs/mocks) receives the correct JSON payload.
