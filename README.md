# Aegis Context Broker

Aegis Context Broker is an AI-driven, secure integration middleware extension for VSCode. It solves the mental overhead of developer context-switching and addresses the security flaws of local token storage.

By capturing the developer's workspace state (active files, branches) and intelligently connecting it to third-party platforms (GitHub, Jira) via a secure cloud backend, Aegis predicts and pre-fetches the documentation, PRs, and tickets you need—before you even search for them.

## Architecture

The system is composed of two main parts:

1. **Client (VSCode Extension + UI)**: Extracts local context and renders insights in a React Webview.
2. **Backend (Node.js API)**: Securely stores OAuth tokens in Google Secret Manager, infers context using Google Cloud Vertex AI (Gemini), and resolves actual links via third-party APIs.

For detailed architecture decisions, refer to `MEMORY.md` and `docs/Report.md`.

## Quick Start

### Prerequisites

- Node.js (v18+)
- VSCode (v1.80+)
- A Google Cloud Project with Vertex AI and Secret Manager APIs enabled.

### Environment Setup

Copy the `.env.example` file to `.env` in the `backend/` directory and fill in the necessary values.

### Installation

1. **Backend**:

    ```bash
    cd backend
    npm install
    npm run build
    npm start
    ```

2. **Client**:
    ```bash
    cd client
    npm install
    npm run compile
    # Press F5 in VSCode to launch the Extension Development Host
    ```

## Documentation & References

### Project Docs

- [Project Memory & Architecture](MEMORY.md)
- [Sprint Changelog](CHANGELOG.md)
- [Sprint ]
- [Project Report](docs/Report.md)
- [Client Documentation](client/README.md)
- [Backend Documentation](backend/README.md)

### External Resources Used

- **Google Cloud Vertex AI Node.js SDK**: Used for generating predictive insights with the `gemini-1.5-flash-preview-0514` model.
    - [Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal)
- **Google Secret Manager Node.js SDK**: Used for the cryptographically isolated token vault.
    - [Documentation](https://cloud.google.com/secret-manager/docs/reference/libraries)
- **VSCode Extension API**: Used for `vscode.window.onDidChangeActiveTextEditor`, Webviews, and IPC messaging.
    - [Extension Guides](https://code.visualstudio.com/api/extension-guides/overview)
    - [Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- **GitHub REST API**: Used for resolving AI predictions into real Pull Request URLs.
    - [Search API](https://docs.github.com/en/rest/search/search?apiVersion=2022-11-28#search-issues-and-pull-requests)
- **Jira Cloud REST API**: Targeted for ticket resolution.
    - [Jira API Reference](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)

## Security

Aegis strictly enforces a "Zero Local Secrets" policy. All sensitive OAuth tokens for third-party platforms are stored dynamically in Google Secret Manager and are never transmitted to the client extension.

## License

[GNU GENERAL PUBLIC LICENSE](LICENSE)
