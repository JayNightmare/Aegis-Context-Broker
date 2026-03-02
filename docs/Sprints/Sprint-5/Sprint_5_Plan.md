# Sprint 5: Third-Party Authentication Flow

This sprint focuses on completing the "Connect GitHub" flow, transitioning it from a mocked UI alert to a fully functional OAuth 2.0 handshake that securely deposits the token into our Google Secret Manager vault.

## Goal Description
The user clicks "Connect GitHub" in the VSCode Webview. This must open their native default browser to authenticate with GitHub. Once approved, GitHub redirects back to our Node.js Backend, which exchanges the `code` for an access token, stores it in Secret Manager, and communicates success back to the IDE.

## Proposed Changes

### 1. VSCode Extension Trigger (Client)
- **[client/webview/src/App.tsx](file:///v:/Documents/Personal%20Projects/Aegis%20Context%20Broker/client/webview/src/App.tsx)**: [MODIFY] Change the [handleConnect](file:///v:/Documents/Personal%20Projects/Aegis%20Context%20Broker/client/webview/src/App.tsx#28-37) function to dispatch a new IPC command: `initiate_github_oauth`.
- **[client/src/extension.ts](file:///v:/Documents/Personal%20Projects/Aegis%20Context%20Broker/client/src/extension.ts)**: [MODIFY] Add a listener for `initiate_github_oauth`. Use `vscode.env.openExternal` to launch the user's default browser to `https://github.com/login/oauth/authorize?client_id=...`.

### 2. OAuth Callback Route (Backend)
- **[backend/src/routes/integration.ts](file:///v:/Documents/Personal%20Projects/Aegis%20Context%20Broker/backend/src/routes/integration.ts)**: [MODIFY] Add a new `GET /github/callback` route. This route will:
  1. Receive the `?code=` query parameter from GitHub.
  2. Make a server-to-server POST request to `https://github.com/login/oauth/access_token` to exchange the code for the real token (using `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`).
  3. Call [secretManager.ts](file:///v:/Documents/Personal%20Projects/Aegis%20Context%20Broker/backend/src/services/secretManager.ts) to save the token.
  4. Return an HTML response that automatically closes the browser tab, seamlessly returning the user to VSCode.

### 3. Server-to-Client Sync (Polling)
- The VSCode extension needs to know when the out-of-band browser flow finishes. 
- **[client/src/extension.ts](file:///v:/Documents/Personal%20Projects/Aegis%20Context%20Broker/client/src/extension.ts)**: [MODIFY] Implement a lightweight polling mechanism or a dedicated endpoint check to verify if the GitHub connection status is now "Connected".

## Verification Plan
1. Configure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in the backend `.env`.
2. Click "Connect GitHub" in the Webview.
3. Authenticate in the launched browser tab.
4. Verify the tab closes, and the Webview updates to "Connected".
5. Verify the token was securely written to Google Secret Manager.
