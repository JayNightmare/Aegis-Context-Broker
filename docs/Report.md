### 1. Title

**Aegis Context Broker: An AI-Driven, Secure Integration Middleware for IDEs**

### 2. Abstract

Modern software development requires constant interaction with third-party platforms (GitHub, Jira, Slack), leading to fragmented workflows and insecure local token storage within IDEs. This project proposes the "Aegis Context Broker," a VSCode extension and Google Cloud-based middleware. By offloading authentication to Google Secret Manager and utilizing Vertex AI to predict and restore developer context (active files, related tickets, communications), Aegis provides a secure, seamless, and intelligent development environment.

### 3. Introduction

Developers constantly context-switch, losing the mental thread between code, communication, and issue tracking. Current VSCode extensions attempt to solve this locally but introduce significant security vulnerabilities by storing OAuth tokens in unsandboxed local storage. Aegis solves this by moving integration logic and secret management to a secure Google Cloud backend. It bridges the gap between full-stack architecture and machine learning, acting as a secure vault and an intelligent workflow assistant.

### 4. Methodology

**Aim:** To engineer a cloud-native IDE middleware that secures third-party authentication and uses AI to eliminate the cognitive load of context-switching.

**Objectives:**

- Develop a VSCode extension utilizing a React-based Webview UI.
- Deploy a highly scalable Node.js backend on Google Cloud Run.
- Implement Google Secret Manager to eliminate local credential storage.
- Train or prompt a Vertex AI model to map code-state to external platform data.
- **The Sceptical Approach:** We must rigorously test and question the latency. Network round-trips to Cloud Run for every UI interaction will ruin the developer experience. We will counter this by engineering an encrypted local cache for non-sensitive metadata, validating if cloud-execution truly outperforms local-only extensions.

### 5. Design

The architecture requires a strict separation of concerns, keeping the IDE lightweight and the cloud doing the heavy lifting.

- **Client (VSCode/AntiGravity):** React Webview for the UI, intercepting Git branch changes and active file paths to build "state snapshots."
- **Gateway:** Google Cloud API Gateway + Firebase Auth to verify the developer's identity.
- **Processing:** Node.js on Cloud Run orchestrates the data flow, securely fetching API tokens from Secret Manager to communicate with external tools.
- **Storage:** Firestore stores the anonymized context snapshots (e.g., Branch `feature/auth` = Slack Thread ID + Jira Ticket ID).
- **Intelligence:** Vertex AI processes the snapshot delta to predict what documentation or ticket the developer needs next.

### 6. Realisation

We will build this in iterative, testable phases:

1. **Phase 1 (Infrastructure & Vault):** Set up the React Webview, the Cloud Run backend, and establish the secure token pipeline with Secret Manager for a single integration (e.g., GitHub).
2. **Phase 2 (State Tracking):** Implement the local caching layer and Firestore integration to successfully save and restore a developer's workspace state.
3. **Phase 3 (AI Prediction):** Integrate Vertex AI to proactively fetch relevant third-party data based on the current code context.
   _Note: Throughout this realisation phase, we will strictly update the `MEMORY.md` file after every completed task and document all new features in the `CHANGELOG.md`._

### 7. Conclusion

Aegis Context Broker tackles a universally acknowledged pain point in software engineering. By combining robust full-stack cloud architecture with applied AI, it provides a highly practical, commercially viable solution. This is an innovative leap over standard extensions and serves as a perfect stepping stone into advanced AI tooling.
