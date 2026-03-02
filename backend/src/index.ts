/**
 * ============================================================================
 * File: backend/src/index.ts
 * ============================================================================
 * * Objective:
 * Main Express server entry point for the Aegis Context Broker backend.
 * * Architectural Considerations & Sceptical Analysis:
 * - This will be deployed to Google Cloud Run, meaning it must be stateless
 *   to scale out horizontally from zero to N instances.
 * - Sceptical note: Beware of cold-starts in Cloud Run. Keep module imports
 *   lean to improve initial boot time.
 * * Core Dependencies:
 * - express
 * - google-cloud API
 * ============================================================================
 */

import express from "express";
import cors from "cors";
import { integrationRoutes } from "./routes/integration";
import { stateRoutes } from "./routes/state";
import { predictRoutes } from "./routes/predict";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: true }));
app.use(express.json());

// Main health check for Cloud Run
app.get("/health", (req, res) => {
    res.status(200).send("Aegis Backend is healthy.");
});

// Route registrations
app.use("/api/integrations", integrationRoutes);
app.use("/api/state", stateRoutes);
app.use("/api/predict", predictRoutes);

app.listen(PORT, () => {
    console.log(`Aegis Context Broker Backend listening on port ${PORT}`);
});
