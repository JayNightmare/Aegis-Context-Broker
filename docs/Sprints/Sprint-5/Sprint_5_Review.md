# Sprint 5 Retrospective: Third-Party Authentication Flow

## Accomplishments

### 1. End-to-End GitHub OAuth 2.0 Flow

The GitHub OAuth flow was completed in full — from browser launch to secure token storage.

- **[extension.ts](../../../client/src/extension.ts)**: Added a listener for `initiate_github_oauth`. Uses `vscode.env.openExternal` to launch the user's default browser pointed at `https://github.com/login/oauth/authorize` with the correct `client_id`, `redirect_uri`, and scopes.
- **[integration.ts](../../../backend/src/routes/integration.ts)**: Implemented `GET /api/integrations/github/callback`. Receives the `?code=` parameter from GitHub, performs a server-to-server token exchange (POST to `https://github.com/login/oauth/access_token`), and stores the resulting access token in Google Secret Manager via `secretManager.ts`. Returns a self-closing HTML page to return the user seamlessly to VSCode.

### 2. Client-Side Polling for Connection Status

- **[extension.ts](../../../client/src/extension.ts)**: After launching the browser, the extension now polls `GET /api/integrations/github/status` every 3 seconds (up to 30 attempts / 1.5 minutes) to detect when the token has been stored in the vault. On success, it dispatches `github_connected` back to the Webview.

### 3. Secret Manager — Local Dev Fallback

An architectural issue was resolved during this sprint: the original `SecretManagerServiceClient` was instantiated at module load time, causing crashes on startup in local environments without GCP Application Default Credentials (ADC).

- **[secretManager.ts](../../../backend/src/services/secretManager.ts)**: Refactored to lazy-instantiate the GCP client (only when a vault call is made). Added an in-memory fallback store (`NODE_ENV=development`) so local development runs without requiring `gcloud auth application-default login`.

## Issues & Resolutions

| Issue                                               | Root Cause                                                  | Resolution                                              |
| --------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| GitHub 404 on OAuth redirect                        | `client_id` in `extension.ts` hardcoded to a stale app ID   | Updated to match `backend/.env` `GITHUB_CLIENT_ID`      |
| Wrong redirect port                                 | Redirect URI pointed to `:8080` but backend runs on `:8081` | Updated all hardcoded backend URLs in `extension.ts`    |
| `Could not load the default credentials` on startup | GCP client instantiated at module load time without ADC     | Lazy client + `NODE_ENV=development` in-memory fallback |

## What Was Not Done

- A Jira OAuth flow was not added (out of scope; no Jira OAuth App registered yet).
- The polling mechanism is a pragmatic short-term solution. A server-sent events (SSE) push would be cleaner and is planned for Phase 6.
