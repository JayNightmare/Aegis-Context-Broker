/**
 * ============================================================================
 * Test: insightResolver.test.ts
 * ============================================================================
 * Updated to match the new ResolvedInsight shape (githubResult object instead
 * of actualUrl string) and the new resolveInsights signature (accepts repoHint).
 * Jira tests are removed since Jira resolution is a stub in the current phase.
 * ============================================================================
 */

import { resolveInsights } from "../services/insightResolver";
import { resolveGithubUrl } from "../services/githubSearch";
import { GitHubResult } from "../services/githubSearch";

jest.mock("../services/githubSearch", () => ({
	resolveGithubUrl: jest.fn(),
}));

const mockGhResult: GitHubResult = {
	title: "Update Auth middleware",
	url: "https://github.com/owner/repo/pull/1",
	number: 1,
	state: "open",
	itemType: "pr",
	body: "This PR updates the auth middleware",
	labels: ["enhancement"],
	changedFilesCount: 3,
	commentCount: 2,
};

describe("insightResolver Service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should resolve a GitHub PR insight into a GitHubResult", async () => {
		const mockPredictions = {
			insights: [
				{
					title: "Update Auth",
					type: "GitHub PR",
					confidence: 0.9,
					reasoning: "Related to auth changes",
					searchQuery: "Update Auth middleware",
				},
			],
		};

		(resolveGithubUrl as jest.Mock).mockResolvedValue(mockGhResult);

		const result = await resolveInsights(
			"user-1",
			mockPredictions,
			"owner/repo",
		);

		expect(result.insights.length).toBe(1);
		expect(result.insights[0].githubResult?.url).toBe(
			"https://github.com/owner/repo/pull/1",
		);
		expect(result.insights[0].githubResult?.number).toBe(1);
		expect(result.insights[0].githubResult?.state).toBe("open");
		expect(result.repoHint).toBe("owner/repo");
		expect(resolveGithubUrl).toHaveBeenCalledWith(
			"user-1",
			"Update Auth middleware",
			"owner/repo",
			"pr",
		);
	});

	it("should gracefully handle a GitHub API failure and return null githubResult", async () => {
		const mockPredictions = {
			insights: [
				{
					title: "Busted PR",
					type: "GitHub PR",
					confidence: 0.9,
					reasoning: "Will fail",
				},
			],
		};

		(resolveGithubUrl as jest.Mock).mockRejectedValue(
			new Error("API Rate Limit"),
		);

		const result = await resolveInsights("user-1", mockPredictions);

		expect(result.insights.length).toBe(1);
		expect(result.insights[0].githubResult).toBeNull();
		expect(result.insights[0].title).toBe("Busted PR");
	});

	it("should return empty insights for an empty prediction set", async () => {
		const result = await resolveInsights("user-1", {
			insights: [],
		});
		expect(result.insights).toHaveLength(0);
	});
});
