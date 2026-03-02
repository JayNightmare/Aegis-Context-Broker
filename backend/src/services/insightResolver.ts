/**
 * ============================================================================
 * File: backend/src/services/insightResolver.ts
 * ============================================================================
 * * Objective:
 * Takes the array of raw Vertex AI insights (predicted PRs or Tickets) and
 * resolves them into actionable URLs by querying third-party APIs
 * (GitHub/Jira) in parallel.
 * * Architectural Considerations & Sceptical Analysis:
 * - Executing search queries sequentially would destroy user experience.
 *   We MUST map over these concurrently using Promise.allSettled.
 * - Sceptical note: Rate limits. If GitHub throws a 429, we still want to
 *   return the predicted title to the developer even if the URL resolution failed.
 * * Core Dependencies:
 * - githubSearch
 * - jiraSearch
 * ============================================================================
 */

import { PredictiveInsights, Insight } from "./vertexAi";
import { resolveGithubUrl } from "./githubSearch";
import { resolveJiraUrl } from "./jiraSearch";

export interface ResolvedInsight extends Insight {
    actualUrl: string | null;
}

export interface ResolvedPredictiveInsights {
    insights: ResolvedInsight[];
}

export const resolveInsights = async (
    userId: string,
    predictions: PredictiveInsights,
): Promise<ResolvedPredictiveInsights> => {
    if (
        !predictions ||
        !predictions.insights ||
        predictions.insights.length === 0
    ) {
        return { insights: [] };
    }

    const resolutionPromises = predictions.insights.map(async (insight) => {
        let actualUrl: string | null = null;
        const normalizedType = insight.type.toLowerCase();

        try {
            if (
                normalizedType.includes("github") ||
                normalizedType.includes("pr")
            ) {
                actualUrl = await resolveGithubUrl(userId, insight.title);
            } else if (
                normalizedType.includes("jira") ||
                normalizedType.includes("ticket")
            ) {
                actualUrl = await resolveJiraUrl(userId, insight.title);
            } else if (normalizedType.includes("doc")) {
                // For internal documentation predictions, we could construct a wiki search URL
                actualUrl = `https://internal-wiki.com/search?q=${encodeURIComponent(insight.title)}`;
            }
        } catch (e) {
            console.error(
                `[InsightResolver] Unhandled exception resolving ${insight.type} link:`,
                e,
            );
            // Non-blocking catch
        }

        return {
            ...insight,
            actualUrl,
        };
    });

    const results = await Promise.allSettled(resolutionPromises);

    const insights: ResolvedInsight[] = results.map((result, index) => {
        if (result.status === "fulfilled") {
            return result.value;
        } else {
            console.warn(
                `[InsightResolver] Failed promise for insight resolution.`,
                result.reason,
            );
            // If the promise completely rejects, preserve the raw prediction
            return {
                ...predictions.insights[index],
                actualUrl: null,
            };
        }
    });

    return { insights };
};
