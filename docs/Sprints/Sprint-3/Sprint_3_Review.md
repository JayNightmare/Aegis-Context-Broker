# Sprint 3 Retrospective: AI Augmentation

## Accomplishments

### 1. Vertex AI Backend Integration

We firmly connected our developer metadata pipeline to Google Cloud Vertex AI using `gemini-1.5-flash-preview-0514`.

- [aiPrompt.ts](../../../backend/src/services/aiPrompt.ts): Added rigid templating to ensure the model responds exclusively with JSON insight blocks, averting LLM text drift.
- [vertexAi.ts](../../../backend/src/services/vertexAi.ts): Configured the Node.js API to trigger generation securely with lowered temperature settings for deterministic link generation.

### 2. The Predictive Endpoint

We exposed the generative layer securely to the IDE client.

- [predict.ts](../../../backend/src/routes/predict.ts): A robust Express endpoint (`GET /api/predict`) that reads from our Firestore persistence layer, constructs the prompt, and pipes the result back in milliseconds.

### 3. Glassbox UI - Predictions

The AI output is now visibly actionable to the developer.

- [AIPredictions.tsx](../../../client/webview/src/components/AIPredictions.tsx): Overhauled the React application to accept RPC IPC signals carrying the Vertex predictions. Included loading states to map against inherently slower AI response times.

## Next Steps

Sprint 4 will focus on **Third-Party Integration**. Testing the generated insights against _real_ Jira tickets and local GitHub PR logs, utilizing the OAuth token pipeline established in Sprint 1.
