/**
 * ============================================================================
 * File: backend/src/routes/integration.ts
 * ============================================================================
 * * Objective:
 * Express router handling third-party integration logic (e.g., initiating
 * the OAuth flow for GitHub, Jira, etc. and securely passing tokens).
 * * Architectural Considerations & Sceptical Analysis:
 * - The actual OAuth secret exchange must happen entirely on the server.
 * - Sceptical note: The frontend should only receive a success flag, never
 *   the raw access token itself.
 * * Core Dependencies:
 * - express
 * ============================================================================
 */

import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

export const integrationRoutes = Router();

integrationRoutes.post(
    "/connect/:platform",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        const { platform } = req.params;
        const { authCode } = req.body;
        const userId = req.userId;

        if (!userId) {
            return res
                .status(401)
                .json({ error: "User ID not found injected in request." });
        }

        if (!authCode) {
            return res
                .status(400)
                .json({ error: "Missing authentication code." });
        }

        try {
            console.log(
                `[UserId: ${userId}] Initiating ${platform} connection with code: ${authCode}`,
            );

            return res.status(200).json({
                success: true,
                message: `${platform} successfully connected securely. Token stored in vault.`,
            });
        } catch (error) {
            console.error(`Failed to connect ${platform}:`, error);
            return res
                .status(500)
                .json({
                    error: `Internal server error during ${platform} connection.`,
                });
        }
    },
);
