# Aegis Context Broker - Backend

A stateless Node.js Express API engineered to run on Google Cloud Run. It orchestrates the flow of data between the developer's IDE, Google Cloud's AI infrastructure, and secure Third-Party platforms.

## Core Services

1. **AI Predictions (`vertexAi.ts`, `aiPrompt.ts`)**:
    - Compiles rigid, deterministic templated prompts based on the IDE context payload.
    - Queries Google Vertex AI (`gemini-1.5-flash-preview-0514`) with a strict JSON expectation.

2. **The Secure Vault (`secretManager.ts`)**:
    - Wrapper for `@google-cloud/secret-manager`.
    - Isolates secrets via a deterministic naming structure: `user-[id]-[platform]-token`.
    - Prevents OAuth tokens from ever leaking to the client extension.

3. **Insight Resolution Engine (`insightResolver.ts`, `githubSearch.ts`)**:
    - Concurrently maps Vertex AI's "hypothetical" text predictions into real-world URLs.
    - Leverages `Promise.allSettled` to fetch external APIs (GitHub PRs, Jira Issues) without catastrophic blocking failures.

4. **State Persistence (`firestore.ts`)**:
    - Saves anonymized IDE state payloads to Firebase Firestore to build a historical developer activity graph.

## Setup & Execution

From the `backend/` directory:

```bash
npm install
npm run build
npm start
```

## Environment Variables

Requires a Google Cloud Project with Secret Manager and Vertex AI enabled. See `.env.example` for details.

Ensure the Cloud Run Service Account has the following IAM roles:

- `roles/secretmanager.secretAccessor`
- `roles/aiplatform.user`
- `roles/datastore.user` (Firestore)
