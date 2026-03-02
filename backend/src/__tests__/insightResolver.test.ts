import { resolveInsights } from "../services/insightResolver";
import { resolveGithubUrl } from "../services/githubSearch";
import { resolveJiraUrl } from "../services/jiraSearch";
import { PredictiveInsights } from "../services/vertexAi";

// Mock the dependencies
jest.mock("../services/githubSearch", () => ({
    resolveGithubUrl: jest.fn(),
}));

jest.mock("../services/jiraSearch", () => ({
    resolveJiraUrl: jest.fn(),
}));

describe("insightResolver Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should correctly map GitHub and Jira links concurrently", async () => {
        const mockPredictions: PredictiveInsights = {
            insights: [
                {
                    title: "Update Auth",
                    type: "GitHub PR",
                    confidence: 0.9,
                    reasoning: "Related to changes",
                },
                {
                    title: "AEGIS-123",
                    type: "Jira Ticket",
                    confidence: 0.8,
                    reasoning: "Main epic",
                },
            ],
        };

        (resolveGithubUrl as jest.Mock).mockResolvedValue(
            "https://github.com/PR/1",
        );
        (resolveJiraUrl as jest.Mock).mockResolvedValue(
            "https://jira.com/AEGIS-123",
        );

        const result = await resolveInsights("user-1", mockPredictions);

        expect(result.insights.length).toBe(2);

        // Ensure GitHub was resolved
        expect(result.insights[0].actualUrl).toBe("https://github.com/PR/1");
        expect(resolveGithubUrl).toHaveBeenCalledWith("user-1", "Update Auth");

        // Ensure Jira was resolved
        expect(result.insights[1].actualUrl).toBe("https://jira.com/AEGIS-123");
        expect(resolveJiraUrl).toHaveBeenCalledWith("user-1", "AEGIS-123");
    });

    it("should gracefully handle a mock third-party failure by returning null actualUrl", async () => {
        const mockPredictions: PredictiveInsights = {
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
        expect(result.insights[0].actualUrl).toBeNull();
        expect(result.insights[0].title).toBe("Busted PR"); // Still retained original data
    });
});
