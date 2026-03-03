/**
 * ============================================================================
 * File: client/src/predictionEngine.ts
 * ============================================================================
 * * Objective:
 * Owns the full prediction lifecycle: auto-triggers predictions after a
 * developer settles on a file, caches results in memory, and pushes them
 * to the Webview panel immediately when it opens.
 * * Architectural Considerations & Sceptical Analysis:
 * - A 5-second post-context debounce ensures we only predict when the
 *   developer has "settled" — rapid file switches don't trigger a cascade
 *   of expensive Vertex AI calls.
 * - The context hash prevents re-predicting for the same (file+branch) pair,
 *   which would waste both Vertex quota and GitHub API rate limit budget.
 * - We run prediction fully in the background; the Webview is just a consumer
 *   of cached data, making panel open feel instant.
 * * Core Dependencies:
 * - node-fetch
 * - vscode API (WebviewPanel)
 * ============================================================================
 */

import * as vscode from "vscode";
import fetch from "node-fetch";
import { ContextSnapshot } from "./contextExtractor";

const BACKEND_URL = "http://localhost:8081";
const PREDICTION_DEBOUNCE_MS = 5000;

export interface PredictionPayload {
	insights: any[];
	repoHint: string | null;
}

export class PredictionEngine {
	private cachedPredictions: PredictionPayload | null = null;
	private cachedAt: number = 0;
	private lastContextHash: string = "";
	private debounceTimer: NodeJS.Timeout | null = null;
	private panel: vscode.WebviewPanel | null = null;
	private isFetching: boolean = false;

	/**
	 * Registers the active Webview panel so predictions can be pushed to it.
	 * Call this when the panel is created, and null it when disposed.
	 */
	public setPanel(panel: vscode.WebviewPanel | null): void {
		this.panel = panel;
		if (panel && this.cachedPredictions) {
			this.pushToWebview(this.cachedPredictions);
		}
	}

	/**
	 * Called by the context extractor on every snapshot update.
	 * Debounces by PREDICTION_DEBOUNCE_MS before triggering a background
	 * prediction — only if the context has meaningfully changed.
	 */
	public onContextChange(snapshot: ContextSnapshot): void {
		const hash = this.computeContextHash(snapshot);
		if (hash === this.lastContextHash) {
			return;
		}
		this.lastContextHash = hash;

		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			this.fetchPredictions();
		}, PREDICTION_DEBOUNCE_MS);
	}

	/**
	 * Manually trigger a prediction refresh (e.g. from a "Refresh" button).
	 * Bypasses the debounce and context hash check.
	 */
	public forceRefresh(): void {
		this.lastContextHash = "";
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		this.fetchPredictions();
	}

	/**
	 * Returns cached predictions immediately if available. Used when the
	 * Webview panel is first opened to show results without a network call.
	 */
	public getCachedPredictions(): {
		payload: PredictionPayload;
		cachedAt: number;
	} | null {
		if (!this.cachedPredictions) {
			return null;
		}
		return {
			payload: this.cachedPredictions,
			cachedAt: this.cachedAt,
		};
	}

	/**
	 * Fetches predictions from the backend and caches them. On success,
	 * pushes results to the Webview if visible.
	 */
	private async fetchPredictions(): Promise<void> {
		if (this.isFetching) {
			return;
		}
		this.isFetching = true;

		this.notifyWebview("prediction_loading", null);

		try {
			const res = await fetch(`${BACKEND_URL}/api/predict`, {
				headers: {
					Authorization:
						"Bearer mock-valid-token",
				},
			});

			if (!res.ok) {
				throw new Error(
					`Backend Error: ${res.statusText}`,
				);
			}

			const data = (await res.json()) as PredictionPayload;
			this.cachedPredictions = data;
			this.cachedAt = Date.now();

			this.pushToWebview(data);
			console.log(
				`[PredictionEngine] Predictions cached (${data.insights.length} insights)`,
			);
		} catch (err: any) {
			console.error(
				"[PredictionEngine] Prediction fetch failed:",
				err.message,
			);
			this.notifyWebview("prediction_error", err.message);
		} finally {
			this.isFetching = false;
		}
	}

	private pushToWebview(data: PredictionPayload): void {
		this.panel?.webview.postMessage({
			command: "receive_predictions",
			payload: data,
			cachedAt: this.cachedAt,
		});
	}

	private notifyWebview(command: string, error: string | null): void {
		if (!this.panel) {
			return;
		}
		if (command === "prediction_loading") {
			this.panel.webview.postMessage({
				command: "prediction_loading",
			});
		} else if (command === "prediction_error") {
			this.panel.webview.postMessage({
				command: "receive_predictions",
				error,
			});
		}
	}

	private computeContextHash(snapshot: ContextSnapshot): string {
		return `${snapshot.activeFile ?? ""}::${snapshot.activeBranch ?? ""}`;
	}

	public dispose(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
	}
}
