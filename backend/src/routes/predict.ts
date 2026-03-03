/**
 * ============================================================================
 * File: backend/src/routes/predict.ts
 * ============================================================================
 * * Objective:
 * Exposes the /api/predict endpoint. Takes the latest Firestore context
 * snapshot, builds an enriched AI prompt, calls Vertex AI, then resolves
 * returned insights into real GitHub results scoped to the user's repository.
 * * Architectural Considerations & Sceptical Analysis:
 * - This endpoint chains three external calls (Firestore → Vertex → GitHub).
 *   If Vertex fails, we return 503 immediately — GitHub resolution is skipped.
 * - Sceptical note: Error boundaries must be strict. If Vertex returns invalid
 *   JSON the parser will throw — caught and returned as 503, not a 500 crash.
 * * Core Dependencies:
 * - express
 * - firestore (getLatestSnapshot)
 * - aiPrompt (buildContextPrompt)
 * - vertexAi (generatePredictiveInsights)
 * - insightResolver (resolveInsights)
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
		const snapshot = await getLatestSnapshot(userId);

		if (!snapshot) {
			return res.status(404).json({
				error: "No active context snapshot found for this user.",
			});
		}

		const prompt = buildContextPrompt(snapshot);

		console.log(
			`[VertexAI] Requesting prediction for User: ${userId} | File: ${snapshot.activeFile} | Repo: ${snapshot.repoHint ?? "unknown"}`,
		);
		const predictiveInsights =
			await generatePredictiveInsights(prompt);

		const resolvedInsights = await resolveInsights(
			userId,
			predictiveInsights,
			snapshot.repoHint,
		);

		return res.status(200).json(resolvedInsights);
	} catch (error: any) {
		console.error(
			`[Predict API] Error generating insights:`,
			error.message,
		);
		return res
			.status(503)
			.json({
				error: "AI prediction service temporarily unavailable.",
			});
	}
});
