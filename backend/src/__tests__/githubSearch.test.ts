import { resolveGithubUrl } from "../services/githubSearch";
import { retrieveToken } from "../services/secretManager";

// Mock secret manager
jest.mock("../services/secretManager", () => ({
    retrieveToken: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe("githubSearch Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return a resolved HTML URL when GitHub returns items", async () => {
        (retrieveToken as jest.Mock).mockResolvedValue("fake-token");

        const mockResponse = {
            ok: true,
            json: jest.fn().mockResolvedValue({
                items: [{ html_url: "https://github.com/aegis/issues/1" }],
            }),
        };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        const url = await resolveGithubUrl("user-1", "Fix Auth Bug");

        expect(url).toBe("https://github.com/aegis/issues/1");
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should return null if the token is missing", async () => {
        (retrieveToken as jest.Mock).mockResolvedValue(null);

        const url = await resolveGithubUrl("user-1", "Fix Auth Bug");

        expect(url).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should return null if GitHub API throws or returns no items", async () => {
        (retrieveToken as jest.Mock).mockResolvedValue("fake-token");

        const mockResponse = {
            ok: true,
            json: jest.fn().mockResolvedValue({ items: [] }),
        };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        const url = await resolveGithubUrl("user-1", "Fix Auth Bug");

        expect(url).toBeNull();
    });
});
