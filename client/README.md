# Aegis Context Broker - Client

The Client consists of a VSCode Extension host (`src/`) and an embedded React Webview (`webview/src/`).

It solves the developer context-switching problem by running a lightweight background polling mechanism that captures the current workspace state (active file, active git branch) without lagging the UI editor thread.

## Components

1. **Extension Host (`src/extension.ts`)**:
    - Uses a 2,000ms debounce loop via `contextExtractor.ts` to poll native VSCode APIs.
    - Encrypts local context caches securely using OS-level `SecretStorage` via `cache.ts`.
    - Communicates with the Webview strictly via secure Object IPC message passing.

2. **React Webview (`webview/`)**:
    - A Vite-powered React application embedded within an Extension panel.
    - Displays real-time context snapshots (`StateIndicator.tsx`).
    - Renders Vertex AI-generated, hyperlinked insights (`AIPredictions.tsx`).

## Development Scripts

From the `client/` directory:

- `npm run compile`: Builds the entire extension client bundle with esbuild and transpiles the TypeScript.
- `npm run watch`: Keeps the compiler running to watch for local changes.
- **Debugging**: Press `F5` in VSCode to launch the Extension Development Host window.

## Architectural Nuances

- **Zero Secrets**: The client handles absolutely no OAuth tokens. It uses the `node-fetch` module to pipe state snapshots to the Google Cloud Run backend, which natively interfaces with the Secret Manager.
- **CSS**: The embedded Webview utilizes native VSCode CSS variable tokens (e.g., `var(--vscode-editor-background)`) to automatically theme itself against the user's active editor colors.
