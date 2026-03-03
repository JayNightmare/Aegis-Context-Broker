/**
 * ============================================================================
 * File: src/extension.ts
 * ============================================================================
 * * Objective:
 * Entry point for the Aegis Context Broker VSCode extension. Registers
 * commands, manages the Webview panel, and wires the PredictionEngine to
 * auto-trigger predictions when the developer's context changes.
 * * Architectural Considerations & Sceptical Analysis:
 * - Extension activation must be minimal to avoid IDE startup latency.
 * - The PredictionEngine runs independently of the Webview panel — it starts
 *   caching predictions as soon as the extension activates, not when the
 *   panel opens. This means results are ready instantly.
 * - Sceptical note: All backend URLs are hardcoded to localhost:8081 for
 *   local dev. In production these should come from extension settings.
 * * Core Dependencies:
 * - vscode API
 * - PredictionEngine
 * - ContextExtractor
 * ============================================================================
 */

import * as vscode from "vscode";
import { ContextExtractor, ContextSnapshot } from "./contextExtractor";
import { LocalStateCache } from "./cache";
import { PredictionEngine } from "./predictionEngine";
import fetch from "node-fetch";

const BACKEND_URL = "http://localhost:8081";

export function activate(context: vscode.ExtensionContext) {
	const contextExtractor = new ContextExtractor(context);
	const localCache = new LocalStateCache(context.secrets);
	const predictionEngine = new PredictionEngine();

	const disposable = vscode.commands.registerCommand(
		"aegis.openVault",
		() => {
			const panel = vscode.window.createWebviewPanel(
				"aegisVault",
				"Aegis Context Vault",
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					retainContextWhenHidden: true,
					localResourceRoots: [
						vscode.Uri.joinPath(
							context.extensionUri,
							"webview",
							"build",
						),
					],
				},
			);

			panel.webview.html = getWebviewContent(
				panel.webview,
				context.extensionUri,
			);

			predictionEngine.setPanel(panel);

			panel.onDidDispose(() => {
				predictionEngine.setPanel(null);
			});

			panel.webview.onDidReceiveMessage(
				(message) => {
					switch (message.command) {
						case "alert":
							vscode.window.showErrorMessage(
								message.text,
							);
							return;

						case "initiate_github_oauth": {
							const clientId =
								"Ov23ligUd402nRnKRYf0";
							const redirectUri = `${BACKEND_URL}/api/integrations/github/callback`;
							const scope =
								"repo read:user";
							const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

							vscode.env.openExternal(
								vscode.Uri.parse(
									authUrl,
								),
							);

							let attempts = 0;
							const pollInterval =
								setInterval(
									() => {
										attempts++;
										if (
											attempts >
											30
										) {
											clearInterval(
												pollInterval,
											);
											panel.webview.postMessage(
												{
													command: "github_connection_failed",
													error: "OAuth flow timed out.",
												},
											);
											return;
										}

										fetch(
											`${BACKEND_URL}/api/integrations/github/status`,
											{
												headers: {
													Authorization:
														"Bearer mock-valid-token",
												},
											},
										)
											.then(
												(
													res,
												) =>
													res.json(),
											)
											.then(
												(
													data: any,
												) => {
													if (
														data.connected
													) {
														clearInterval(
															pollInterval,
														);
														panel.webview.postMessage(
															{
																command: "github_connected",
															},
														);
													}
												},
											)
											.catch(
												(
													e,
												) =>
													console.error(
														"Error polling github status:",
														e,
													),
											);
									},
									3000,
								);

							return;
						}

						case "request_initial_state":
							(
								contextExtractor as any
							)[
								"triggerEvaluation"
							]();
							return;

						case "request_predictions":
							predictionEngine.forceRefresh();
							return;

						case "request_cached_predictions": {
							const cached =
								predictionEngine.getCachedPredictions();
							if (cached) {
								panel.webview.postMessage(
									{
										command: "receive_predictions",
										payload: cached.payload,
										cachedAt: cached.cachedAt,
									},
								);
							}
							return;
						}
					}
				},
				undefined,
				context.subscriptions,
			);

			contextExtractor.onSnapshotUpdate(
				async (snapshot: ContextSnapshot) => {
					console.log(
						"Aegis Client Context Extracted:",
						snapshot,
					);

					await localCache.set(snapshot);

					panel.webview.postMessage({
						command: "update_context",
						payload: snapshot,
					});

					pushStateToBackend(snapshot);
					predictionEngine.onContextChange(
						snapshot,
					);
				},
			);
		},
	);

	// Also wire the prediction engine to context changes OUTSIDE the panel
	// so predictions cache even before the panel is opened.
	contextExtractor.onSnapshotUpdate(async (snapshot: ContextSnapshot) => {
		pushStateToBackend(snapshot);
		predictionEngine.onContextChange(snapshot);
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push({
		dispose: () => contextExtractor.dispose(),
	});
	context.subscriptions.push({
		dispose: () => predictionEngine.dispose(),
	});
}

function pushStateToBackend(snapshot: ContextSnapshot): void {
	fetch(`${BACKEND_URL}/api/state`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: "Bearer mock-valid-token",
		},
		body: JSON.stringify(snapshot),
	}).catch((e) => console.error("[State Push Error]", e));
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
