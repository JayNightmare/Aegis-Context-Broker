# Sprint 3: AI Augmentation Sprint Plan

This sprint focuses on the intelligence core of the Aegis Context Broker: integrating Vertex AI to analyze the developer's state (from Firestore) and generating predictive contexts, such as pointing them to relevant Jira tickets, GitHub PRs, or internal documentation based on their active file and branch.

## Proposed Changes

### 1. Vertex AI Initialization (Backend)

We need to instantiate the Vertex AI service and construct domain-specific prompts for the AI model to yield highly actionable developer context.

- **[backend/package.json](../../../backend/package.json)**: [MODIFY] Add `@google-cloud/vertexai` dependency.
- **`backend/src/services/vertexAi.ts`**: [NEW] Initialize Vertex AI and wrap the `predict` function for the Gemini model.
- **`backend/src/services/aiPrompt.ts`**: [NEW] A service responsible for taking a [ContextSnapshotPayload](../../../backend/src/services/firestore.ts#27-33) and formatting it into a rigid prompt template, minimizing hallucination and focusing on fetching relevant docs/tickets.

### 2. Prediction API (Backend)

Expose a secure endpoint that the client can trigger to request contextual insights.

- **`backend/src/routes/predict.ts`**: [NEW] Defines a `GET /api/predict` route that fetches the user's latest state from Firestore ([getLatestSnapshot](../../../backend/src/services/firestore.ts#61-85)), runs it through `aiPrompt.ts`, queries `vertexAi.ts`, and returns the insights.
- **[backend/src/index.ts](../../../backend/src/index.ts)**: [MODIFY] Register the `predictRoutes`.

### 3. Glassbox UI: Predictive Insights (Client)

The developer needs a non-intrusive way to view these AI-generated insights within the Webview panel.

- **`client/webview/src/components/AIPredictions.tsx`**: [NEW] A React component that displays loading skeletons while waiting for predictions, and then lists the predicted relevant contexts.
- **[client/webview/src/App.tsx](../../../client/webview/src/App.tsx)**: [MODIFY] Add the new component to the UI and wire up the state data to it.
- **[client/src/extension.ts](../../../client/src/extension.ts)**: [MODIFY] Implement a handler for IPC messages requesting predictions from the backend.

## Verification Plan

### Automated Tests

- Write Jest tests for `aiPrompt.ts` to ensure missing data (e.g., null branch) gracefully degrades the prompt without throwing errors.
- Mock the Vertex AI SDK and ensure our `vertexAi.ts` service passes the parameters correctly.

### Manual Verification

1. Simulate a state sync by opening a mocked [auth.ts](../../../backend/src/middleware/auth.ts) file in VSCode.
2. Trigger the "Predict Context" action in the Webview.
3. Verify the mock/Vertex AI response is visible in the UI and accurately reflects the passed file name.
