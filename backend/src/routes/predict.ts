/**
 * ============================================================================
 * File: backend/src/routes/predict.ts
 * ============================================================================
 * * Objective:
 * Exposes the /api/predict endpoint for the IDE Webview to request contextual
 * AI predictions based on their current active file and branch.
 * * Architectural Considerations & Sceptical Analysis:
 * - This endpoint performs an expensive RPC to Google Cloud Vertex AI. We must
 *   ensure the caller is authenticated to prevent abuse.
 * - Sceptical note: Error boundaries must be strictly handled. If Vertex fails,
 *   return a clean 503 Service Unavailable so the Webview UI doesn't crash
 *   parsing a weird HTML stack trace.
 * * Core Dependencies:
 * - express
 * - firestore (getLatestSnapshot)
 * - vertexAi / aiPrompt
 * ============================================================================
 */

import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { getLatestSnapshot } from "../services/firestore";
import { buildContextPrompt } from "../services/aiPrompt";
import { generatePredictiveInsights } from "../services/vertexAi";
import { resolveInsights } from "../services/insightResolver";

export const predictRoutes = Router();

predictRoutes.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ error: "User ID missing." });
    }

    try {
        // 1. Fetch the latest secure context snapshot for this user
        const snapshot = await getLatestSnapshot(userId);

        if (!snapshot) {
            return res.status(404).json({
                error: "No active context snapshot found for this user.",
            });
        }

        // 2. Build the deterministic prompt
        const prompt = buildContextPrompt(snapshot);

        // 3. Request inference from Gemini
        console.log(
            `[VertexAI] Requesting prediction for User: ${userId} | File: ${snapshot.activeFile}`,
        );
        const predictiveInsights = await generatePredictiveInsights(prompt);

        // 4. Resolve the external links (GitHub/Jira) concurrently
        const resolvedInsights = await resolveInsights(
            userId,
            predictiveInsights,
        );

        // 5. Return to the client Webview
        return res.status(200).json(resolvedInsights);
    } catch (error: any) {
        console.error(
            `[Predict API] Error generating insights:`,
            error.message,
        );
        return res
            .status(503)
            .json({ error: "AI prediction service temporarily unavailable." });
    }
});
