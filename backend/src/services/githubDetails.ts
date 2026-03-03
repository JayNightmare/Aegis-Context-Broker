/**
 * ============================================================================
 * File: backend/src/services/githubDetails.ts
 * ============================================================================
 * * Objective:
 * After githubSearch.ts resolves a PR/Issue match, this service fetches the
 * full content (description, labels, changed files, comment count) so the
 * Webview can render an inline preview without the developer leaving VSCode.
 * * Architectural Considerations & Sceptical Analysis:
 * - One extra GitHub API call per resolved insight. With 3 insights per
 *   prediction, that's 3 calls — well within the 5000 req/hour rate limit.
 * - Body text is truncated to 500 characters to keep the IPC payload lean.
 * - For PRs, we also fetch the changed files count from the PR endpoint.
 * - Fails open: if the detail fetch fails, the insight is still usable —
 *   it just won't have the preview content.
 * * Core Dependencies:
 * - fetch (Node 18+)
 * - secretManager (retrieveToken)
 * ============================================================================
 */

import { retrieveToken } from "./secretManager";

export interface GitHubDetails {
	body: string | null;
	labels: string[];
	changedFilesCount: number;
	commentCount: number;
}

/**
 * Fetches the full PR/Issue details from the GitHub API.
 * Expects the html_url to extract the owner, repo, and number.
 */
export const fetchGitHubDetails = async (
	userId: string,
	htmlUrl: string,
	itemType: "pr" | "issue",
): Promise<GitHubDetails | null> => {
	try {
		const token = await retrieveToken(userId, "github");
		if (!token) {
			return null;
		}

		const parsed = parseGitHubUrl(htmlUrl);
		if (!parsed) {
			console.warn(
				`[GitHub Details] Could not parse URL: ${htmlUrl}`,
			);
			return null;
		}

		const { owner, repo, number } = parsed;
		const headers = {
			Authorization: `Bearer ${token}`,
			Accept: "application/vnd.github.v3+json",
			"X-GitHub-Api-Version": "2022-11-28",
		};

		const apiUrl =
			itemType === "pr"
				? `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`
				: `https://api.github.com/repos/${owner}/${repo}/issues/${number}`;

		const response = await fetch(apiUrl, { headers });

		if (!response.ok) {
			console.warn(
				`[GitHub Details] API Error: ${response.status} ${response.statusText}`,
			);
			return null;
		}

		const data: any = await response.json();

		const body = data.body
			? data.body.length > 500
				? data.body.substring(0, 500) + "…"
				: data.body
			: null;

		const labels = Array.isArray(data.labels)
			? data.labels.map((l: any) => l.name).slice(0, 8)
			: [];

		return {
			body,
			labels,
			changedFilesCount:
				itemType === "pr"
					? (data.changed_files ?? 0)
					: 0,
			commentCount: data.comments ?? 0,
		};
	} catch (error) {
		console.error(
			`[GitHub Details] Failed to fetch details:`,
			error,
		);
		return null;
	}
};

function parseGitHubUrl(
	htmlUrl: string,
): { owner: string; repo: string; number: number } | null {
	const match = htmlUrl.match(
		/github\.com\/([^/]+)\/([^/]+)\/(?:pull|issues)\/(\d+)/,
	);
	if (!match) {
		return null;
	}
	return {
		owner: match[1],
		repo: match[2],
		number: parseInt(match[3], 10),
	};
}
