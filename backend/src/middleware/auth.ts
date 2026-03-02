/**
 * ============================================================================
 * File: backend/src/middleware/auth.ts
 * ============================================================================
 * * Objective:
 * Middleware to authenticate incoming requests from the Aegis VSCode client.
 * * Architectural Considerations & Sceptical Analysis:
 * - True auth will be handled by API Gateway via Firebase. This middleware
 *   acts as a secondary validation layer if needed, or parses the already
 *   validated claims injected by the Gateway.
 * - Sceptical note: Never trust the client. Always assume the IDE might be
 *   compromised. The token must be cryptographically verified.
 * * Core Dependencies:
 * - express
 * - firebase-admin
 * ============================================================================
 */

import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
    userId?: string;
}

export const requireAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
            .status(401)
            .json({ error: "Missing or invalid Authorization header." });
    }

    const token = authHeader.split("Bearer ")[1];

    try {
        // For Phase 1 local development, we will use a mocked validation.
        if (token === "mock-valid-token") {
            req.userId = "mock-developer-id";
            return next();
        }

        throw new Error("Invalid token");
    } catch (error) {
        console.error("Authentication Error:", error);
        return res.status(403).json({ error: "Unauthorized." });
    }
};
