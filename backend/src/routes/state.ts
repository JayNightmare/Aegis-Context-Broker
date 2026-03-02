/**
 * ============================================================================
 * File: backend/src/routes/state.ts
 * ============================================================================
 * * Objective:
 * Express router handling state ingestion (POST) and retrieval (GET).
 * Receives the debounced context snapshot from the IDE and passes it to Firestore.
 * * Architectural Considerations & Sceptical Analysis:
 * - Endpoints must be lightweight. Return 202 Accepted immediately if possible,
 *   letting Firebase writes happen asynchronously to keep client latency low.
 * - Sceptical note: Validate payload structure strictly. Do not trust the client
 *   to send a well-formed snapshot.
 * * Core Dependencies:
 * - express
 * - firestore wrapper
 * ============================================================================
 */

import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import {
    saveSnapshot,
    getLatestSnapshot,
    ContextSnapshotPayload,
} from "../services/firestore";

export const stateRoutes = Router();

stateRoutes.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;
    const { timestamp, activeFile, activeBranch, workspaceRoot } = req.body;

    if (!userId) {
        return res.status(401).json({ error: "User ID missing." });
    }

    // Basic validation
    if (typeof timestamp !== "number") {
        return res
            .status(400)
            .json({ error: "Invalid payload structure: missing timestamp." });
    }

    const payload: ContextSnapshotPayload = {
        timestamp,
        activeFile: activeFile || null,
        activeBranch: activeBranch || null,
        workspaceRoot: workspaceRoot || null,
    };

    try {
        // Fire and forget (almost). In Cloud Run, we should technically await it
        // to ensure the container isn't throttled before the promise completes.
        await saveSnapshot(userId, payload);

        return res
            .status(202)
            .json({ success: true, message: "Snapshot accepted." });
    } catch (error) {
        return res.status(500).json({ error: "Failed to process state." });
    }
});

stateRoutes.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ error: "User ID missing." });
    }

    try {
        const snapshot = await getLatestSnapshot(userId);

        if (!snapshot) {
            return res.status(404).json({ error: "No snapshot found." });
        }

        return res.status(200).json(snapshot);
    } catch (error) {
        return res.status(500).json({ error: "Failed to retrieve state." });
    }
});
