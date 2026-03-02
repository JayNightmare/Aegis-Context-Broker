/**
 * ============================================================================
 * File: src/extension.ts
 * ============================================================================
 * * Objective:
 * Entry point for the Aegis Context Broker VSCode extension. Registers commands
 * and manages the lifecycle of the React Webview panel.
 * * Architectural Considerations & Sceptical Analysis:
 * - Extension activation should be absolutely minimal to avoid adding to
 *   IDE startup latency.
 * - The webview panel must be properly disposed of to prevent memory leaks.
 * - Sceptical note: Large React bundles in the webview will slow down initial
 *   rendering. The webview must be heavily optimized and chunked.
 * * Core Dependencies:
 * - vscode API
 * ============================================================================
 */

import * as vscode from "vscode";
import { ContextExtractor, ContextSnapshot } from "./contextExtractor";
import { LocalStateCache } from "./cache";
import fetch from "node-fetch";

export function activate(context: vscode.ExtensionContext) {
    // console.log("Aegis Context Broker is now active.");

    const contextExtractor = new ContextExtractor(context);
    const localCache = new LocalStateCache(context.secrets);

    let disposable = vscode.commands.registerCommand("aegis.openVault", () => {
        // Create and show a new webview
        const panel = vscode.window.createWebviewPanel(
            "aegisVault",
            "Aegis Context Vault",
            vscode.ViewColumn.One,
            {
                enableScripts: true, // Needed for React
                retainContextWhenHidden: true, // Prevents React unmount on tab switch
                localResourceRoots: [
                    vscode.Uri.joinPath(
                        context.extensionUri,
                        "webview",
                        "build",
                    ),
                ],
            },
        );

        // Load the built React application HTML here
        panel.webview.html = getWebviewContent(
            panel.webview,
            context.extensionUri,
        );

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            (message) => {
                switch (message.command) {
                    case "alert":
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case "initiate_github_oauth":
                        // Launch the user's default browser to authenticate
                        const clientId = "Ov23liao1jC8VqM1Yk1C"; // Hardcoding for local dev since extensions can't read .env easily
                        const redirectUri =
                            "http://localhost:8080/api/integrations/github/callback";
                        const scope = "repo read:user";
                        const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
                            redirectUri,
                        )}&scope=${encodeURIComponent(scope)}`;

                        vscode.env.openExternal(vscode.Uri.parse(authUrl));

                        // Start polling the backend to see when the OAuth flow finishes
                        let attempts = 0;
                        const pollInterval = setInterval(() => {
                            attempts++;
                            if (attempts > 30) {
                                // Timeout after 1.5 minutes (30 * 3s)
                                clearInterval(pollInterval);
                                panel.webview.postMessage({
                                    command: "github_connection_failed",
                                    error: "OAuth flow timed out.",
                                });
                                return;
                            }

                            fetch(
                                "http://localhost:8080/api/integrations/github/status",
                                {
                                    headers: {
                                        Authorization:
                                            "Bearer mock-valid-token",
                                    },
                                },
                            )
                                .then((res) => res.json())
                                .then((data) => {
                                    if (data.connected) {
                                        clearInterval(pollInterval);
                                        panel.webview.postMessage({
                                            command: "github_connected",
                                        });
                                    }
                                })
                                .catch((e) => {
                                    console.error(
                                        "Error polling github status:",
                                        e,
                                    );
                                });
                        }, 3000); // Check every 3 seconds

                        return;
                    case "request_initial_state":
                        // If webview asks for initial state, trigger evaluation forcefully
                        (contextExtractor as any)["triggerEvaluation"]();
                        return;
                    case "request_predictions":
                        // Fetch predictions from the backend (auth token mocked for now)
                        fetch("http://localhost:8080/api/predict", {
                            headers: {
                                Authorization: "Bearer mock-valid-token",
                            },
                        })
                            .then((res) => {
                                if (!res.ok)
                                    throw new Error(
                                        `Backend Error: ${res.statusText}`,
                                    );
                                return res.json();
                            })
                            .then((data) => {
                                panel.webview.postMessage({
                                    command: "receive_predictions",
                                    payload: data,
                                });
                            })
                            .catch((err) => {
                                panel.webview.postMessage({
                                    command: "receive_predictions",
                                    error: err.message,
                                });
                            });
                        return;
                }
            },
            undefined,
            context.subscriptions,
        );

        // Pipe extracted context to the Webview and Backend
        contextExtractor.onSnapshotUpdate(async (snapshot: ContextSnapshot) => {
            console.log("Aegis Client Context Extracted:", snapshot);

            // Sync to local cache
            await localCache.set(snapshot);

            // Send to Webview UI
            panel.webview.postMessage({
                command: "update_context",
                payload: snapshot,
            });

            // Push to Backend API
            try {
                // Sceptical note: fire-and-forget to avoid blocking the extractor
                fetch("http://localhost:8080/api/state", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer mock-valid-token",
                    },
                    body: JSON.stringify(snapshot),
                }).catch((e) => console.error("[State Push Error]", e));
            } catch (e) {
                console.error("Failed to push state home.", e);
            }
        });
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push({ dispose: () => contextExtractor.dispose() });
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(
            extensionUri,
            "webview",
            "build",
            "assets",
            "index.js",
        ),
    );
    const styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(
            extensionUri,
            "webview",
            "build",
            "assets",
            "index.css",
        ),
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aegis Vault</title>
    <link href="${styleUri}" rel="stylesheet">
</head>
<body>
    <div id="root"></div>
    <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
}

export function deactivate() {}
