/**
 * ============================================================================
 * File: backend/src/services/githubSearch.ts
 * ============================================================================
 * * Objective:
 * Retrieves the developer's GitHub OAuth token from the secure Google Secret
 * Manager vault and executes a search against the GitHub API based on the AI's
 * predicted ticket title.
 * * Architectural Considerations & Sceptical Analysis:
 * - Direct HTTP calls to GitHub are slow. We do not block the initial Vertex
 *   RPC response, but rather try to resolve these links concurrently where possible.
 * - Sceptical note: Rate limiting. Ensure we elegantly fail open if GitHub 429s
 *   us. We should return the raw AI insight if the link resolution fails.
 * * Core Dependencies:
 * - fetch (Node 18+)
 * - secretManager (retrieveToken)
 * ============================================================================
 */

import { retrieveToken } from "./secretManager";

export const resolveGithubUrl = async (
    userId: string,
    title: string,
): Promise<string | null> => {
    try {
        console.log(
            `[GitHub Search] Resolving PR/Issue for User: ${userId} | Title: ${title}`,
        );

        // Retrieve the secure user token
        const token = await retrieveToken(userId, "github");
        if (!token) {
            console.warn(
                `[GitHub Search] No GitHub token found in vault for user ${userId}`,
            );
            return null;
        }

        // Search the GitHub API
        const query = encodeURIComponent(`${title} in:title`);
        const url = `https://api.github.com/search/issues?q=${query}&per_page=1`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
            },
        });

        if (!response.ok) {
            console.warn(
                `[GitHub Search] API Error: ${response.status} ${response.statusText}`,
            );
            return null;
        }

        const data: any = await response.json();

        if (data && data.items && data.items.length > 0) {
            return data.items[0].html_url;
        }

        return null; // Return null if nothing was found
    } catch (error) {
        console.error(`[GitHub Search] Failed to resolve URL:`, error);
        return null;
    }
};
