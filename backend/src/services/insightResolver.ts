/**
 * ============================================================================
 * File: backend/src/services/insightResolver.ts
 * ============================================================================
 * * Objective:
 * Takes the array of raw Vertex AI insights and resolves them into actionable
 * GitHub results by querying the GitHub API in parallel. After finding a match,
 * hydrates each result with the full PR/Issue content (body, labels, comments)
 * so the Webview can render inline previews.
 * * Architectural Considerations & Sceptical Analysis:
 * - Promise.allSettled is critical: we must never let one failing search abort
 *   the others. Each insight resolves independently.
 * - Two GitHub API calls per insight (search + detail fetch) = 6 calls total.
 *   Well within the 5000 req/hour authenticated limit.
 * - Detail fetch fails-open: if it errors, the insight still has the search
 *   result (title, url, state) — just without body/labels preview.
 * * Core Dependencies:
 * - githubSearch
 * - githubDetails
 * ============================================================================
 */

import { resolveGithubUrl, GitHubResult } from "./githubSearch";
import { fetchGitHubDetails } from "./githubDetails";

export interface Insight {
	title: string;
	type: string;
	confidence: number;
	reasoning: string;
	searchQuery?: string;
}

export interface PredictiveInsights {
	insights: Insight[];
}

export interface ResolvedInsight extends Insight {
	githubResult: GitHubResult | null;
}

export interface ResolvedPredictiveInsights {
	insights: ResolvedInsight[];
	repoHint: string | null;
}

export const resolveInsights = async (
	userId: string,
	predictions: PredictiveInsights,
	repoHint?: string | null,
): Promise<ResolvedPredictiveInsights> => {
	if (!predictions?.insights?.length) {
		return { insights: [], repoHint: repoHint ?? null };
	}

	const resolutionPromises = predictions.insights.map(
		async (insight): Promise<ResolvedInsight> => {
			const normalizedType = insight.type.toLowerCase();
			const query = insight.searchQuery ?? insight.title;
			let githubResult: GitHubResult | null = null;

			try {
				if (
					normalizedType.includes("github") ||
					normalizedType.includes("pr") ||
					normalizedType.includes("issue")
				) {
					const preferType =
						normalizedType.includes("pr")
							? "pr"
							: normalizedType.includes(
										"issue",
								  )
								? "issue"
								: undefined;

					githubResult = await resolveGithubUrl(
						userId,
						query,
						repoHint,
						preferType,
					);

					// Hydrate with full content if search found a match
					if (githubResult) {
						const details =
							await fetchGitHubDetails(
								userId,
								githubResult.url,
								githubResult.itemType,
							);
						if (details) {
							githubResult = {
								...githubResult,
								body: details.body,
								labels: details.labels,
								changedFilesCount:
									details.changedFilesCount,
								commentCount:
									details.commentCount,
							};
						}
					}
				}
			} catch (e) {
				console.error(
					`[InsightResolver] Exception resolving ${insight.type}:`,
					e,
				);
			}

			return { ...insight, githubResult };
		},
	);

	const results = await Promise.allSettled(resolutionPromises);

	const insights: ResolvedInsight[] = results.map((result, index) => {
		if (result.status === "fulfilled") {
			return result.value;
		}
		console.warn(
			`[InsightResolver] Failed to resolve insight at index ${index}:`,
			result.reason,
		);
		return { ...predictions.insights[index], githubResult: null };
	});

	return { insights, repoHint: repoHint ?? null };
};
