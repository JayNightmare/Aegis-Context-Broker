/**
 * ============================================================================
 * File: backend/src/services/githubSearch.ts
 * ============================================================================
 * * Objective:
 * Retrieves the developer's GitHub OAuth token from the secure vault and
 * executes a scoped search against the GitHub API. Searches both Issues and
 * PRs, optionally scoped to a specific repository via repoHint.
 * * Architectural Considerations & Sceptical Analysis:
 * - Global GitHub search returns noise from unrelated repos. We MUST scope
 *   queries to the user's own repository via the `repo:` qualifier when
 *   repoHint is available.
 * - Rate limiting: GitHub allows 30 authenticated search requests/minute.
 *   We search once per insight resolution and fail-open gracefully.
 * - We return a structured GitHubResult rather than just a URL so the UI
 *   can display PR number, state (open/closed), and type.
 * * Core Dependencies:
 * - fetch (Node 18+)
 * - secretManager (retrieveToken)
 * ============================================================================
 */

import { retrieveToken } from "./secretManager";

export interface GitHubResult {
	title: string;
	url: string;
	number: number;
	state: "open" | "closed";
	itemType: "pr" | "issue";
	/** PR/Issue description, truncated to 500 chars. Populated by githubDetails. */
	body: string | null;
	/** Label names from the PR/Issue. */
	labels: string[];
	/** Number of changed files (PRs only). */
	changedFilesCount: number;
	/** Number of comments on the PR/Issue. */
	commentCount: number;
}

/**
 * Searches GitHub for a PR or Issue matching the given query, optionally
 * scoped to a specific repository. Returns null if nothing relevant is found.
 */
export const resolveGithubUrl = async (
	userId: string,
	searchQuery: string,
	repoHint?: string | null,
	preferType?: "pr" | "issue",
): Promise<GitHubResult | null> => {
	try {
		console.log(
			`[GitHub Search] User: ${userId} | Query: "${searchQuery}" | Repo: ${repoHint ?? "global"}`,
		);

		const token = await retrieveToken(userId, "github");
		if (!token) {
			console.warn(
				`[GitHub Search] No GitHub token in vault for user ${userId}`,
			);
			return null;
		}

		const repoScope = repoHint ? `repo:${repoHint} ` : "";
		const typeQualifier =
			preferType === "pr"
				? " type:pr"
				: preferType === "issue"
					? " type:issue"
					: "";
		const query = encodeURIComponent(
			`${repoScope}${searchQuery}${typeQualifier} in:title`,
		);
		const url = `https://api.github.com/search/issues?q=${query}&per_page=1&sort=relevance`;

		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github.v3+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		});

		if (response.status === 429) {
			console.warn(
				"[GitHub Search] Rate limited by GitHub API.",
			);
			return null;
		}

		if (!response.ok) {
			console.warn(
				`[GitHub Search] API Error: ${response.status} ${response.statusText}`,
			);
			return null;
		}

		const data: any = await response.json();

		if (!data?.items?.length) {
			return null;
		}

		const item = data.items[0];
		const isPr = "pull_request" in item;

		return {
			title: item.title,
			url: item.html_url,
			number: item.number,
			state: item.state as "open" | "closed",
			itemType: isPr ? "pr" : "issue",
			body: null,
			labels: [],
			changedFilesCount: 0,
			commentCount: 0,
		};
	} catch (error) {
		console.error(`[GitHub Search] Failed to resolve URL:`, error);
		return null;
	}
};
