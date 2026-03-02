# Sprint 1: Infrastructure & Vault Initialization Sprint Plan

This sprint focuses on establishing the core foundational components of the Aegis Context Broker, setting up the strict boundaries between the local IDE client and the secure cloud backend, and proving the secure token pipeline..

## Proposed Changes

### 1. Client: VSCode Extension & React Webview

Initialize the VSCode extension project and embed a React Webview to serve as the local UI.

- **`client/package.json`**: Scaffold the VSCode extension dependencies and React Webview build scripts.
- **`client/src/extension.ts`**: The main entry point for the VSCode extension. Will register the command to open the Aegis Webview.
- **`client/webview/`**: A React application that will be built and served inside the VSCode Webview panel. It will communicate with the extension via message passing.

### 2. Backend: Node.js Cloud Run Service

Initialize the Node.js backend that will eventually be deployed to Google Cloud Run. This service will act as the secure intermediary.

- **`backend/package.json`**: Scaffold the Node.js Express application with TypeScript.
- **`backend/src/index.ts`**: The main Express server entry point.
- **`backend/src/middleware/auth.ts`**: Middleware to validate Firebase Auth tokens (coming from API Gateway).
- **`backend/src/routes/integration.ts`**: API routes for handling third-party integrations (e.g., connecting GitHub).

### 3. Security: Google Secret Manager Integration

Establish the secure pipeline for handling OAuth tokens, ensuring they never touch the local VSCode environment.

- **`backend/src/services/secretManager.ts`**: A service wrapper around the `@google-cloud/secret-manager` SDK to securely store and retrieve user-specific OAuth tokens.
- **`backend/src/services/githubAuth.ts`**: The service that handles the OAuth exchange with GitHub, utilizing the Secret Manager service to store the resulting token.

## Verification Plan

### Automated Tests

- We will set up basic `jest` tests for the backend logic, specifically testing the `secretManager.ts` service (using mocks) to ensure it correctly formats secret names and handles varying responses.

### Manual Verification

1. Build and run the VSCode extension locally. Verify the React Webview opens correctly.
2. Run the Node.js backend locally.
3. Trigger a mock "Connect GitHub" flow from the Webview, verify the message passes to the VSCode extension, and the extension makes a request to the local backend.
4. Verify the backend successfully processes the request and interacts with the mocked Secret Manager service.
