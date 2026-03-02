# Sprint 2: Context Ingestion

## Accomplishments

### 1. IDE Context Extraction

We developed a robust background polling mechanism within the main VSCode extension thread that actively listens to the user's workspace without lagging the UI.

- [contextExtractor.ts](../../../client/src/contextExtractor.ts): Introduces a strict 2,000ms debounce loop.
- Integrated the native VSCode Git extension API directly to surface the active branch state securely.

### 2. State Ingestion and Caching

To adhere to the sceptical principle of avoiding spammy network logic, data flow is structured to prioritize local caching:

- [cache.ts](../../../client/src/cache.ts): Uses VSCode's native OS-level `SecretStorage` so that the cached context is encrypted at rest.
- [firestore.ts](../../../backend/src/services/firestore.ts): The backend persists context sequentially in Firebase.

### 3. Glassbox UI Indication

The React Webview UI was overhauled. Once the backend connection is mocked/completed, the user is presented with exactly what Aegis is analyzing in real-time.

- [StateIndicator.tsx](../../../client/webview/src/components/StateIndicator.tsx): Reads real-time serialized ContextSnapshots emitted from the IPC message pipe.

## Next Steps

We must transition to **Phase 3: AI Augmentation**. With our secure secret vault handling the third-party token lifecycle, and the Context Extractor successfully pinging our cloud backend with the user's active file, we are ready to pipe this data stream to Vertex AI.
