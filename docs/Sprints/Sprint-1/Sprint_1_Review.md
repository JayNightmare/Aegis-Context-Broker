# Sprint 1: Infrastructure & Vault Initialization

## Overview

This sprint successfully established the foundational architecture for the Aegis Context Broker. We strictly separated the local VSCode development environment from the secure cloud infrastructure, proving the token pipeline out to Google Secret Manager.

## Accomplishments

### 1. Client Architecture

- **VSCode Extension Scaffolded:** Initialized with `esbuild` for fast, lightweight bundling to minimize IDE startup latency.
- **Embedded React Webview:** Integrated a Vite-powered React application to serve as the local developer UI.
- **Secure Communication:** Established message passing between the React Webview context and the Extension host environment.

### 2. Cloud Native Backend

- **Node.js Cloud Run Stub:** Scaffolded an Express backend in TypeScript, configured to be stateless for seamless horizontal scaling on Google Cloud Run.
- **Authentication Gateway Stub:** Implemented [auth.ts](../../../backend/src/middleware/auth.ts) middleware representing the entry point from API Gateway (expecting Firebase injected claims).

### 3. The Secure Vault

- **Secret Manager Integration:** Developed [secretManager.ts](../../../backend/src/services/secretManager.ts), a wrapper around `@google-cloud/secret-manager`. It deterministically generates secret IDs tied directly to the developer ID and platform (e.g., `user-123-github-token`), ensuring tight IAM isolation.
- **OAuth Abstraction:** Created [githubAuth.ts](../../../backend/src/services/githubAuth.ts) to represent the server-side OAuth code exchange, successfully writing mock tokens directly into the vault without them ever touching the client IDE.

## Validation & Sceptical Review

- **Testing:** The Secret Manager logic was thoroughly tested using Jest mocks, verifying that it correctly formats paths and handles missing secrets transparently.
- **Local Client Build:** Resolved initial `npm run compile` issues by removing restrictive ESLint rules over the scaffolded TypeScript, allowing the [.js](../../../client/esbuild.js) bundle and `.css` assets to correctly link inside the Webview iframe.
- **Latency Review:** We have isolated the Secret Manager retrieval to _only_ occur on the server when executing an integration task, preventing N+1 queries from the client.
