/**
 * ============================================================================
 * File: backend/src/services/vertexAi.ts
 * ============================================================================
 * * Objective:
 * Wraps the Google Cloud Vertex AI SDK to execute prompt inferences using the
 * Gemini model family.
 * * Architectural Considerations & Sceptical Analysis:
 * - Sceptical note: AI inference is slow. We should ensure the Webview shows
 *   a skeleton loader before hitting the API endpoint that calls this.
 * - Enforce JSON response mime types if the SDK version allows it to prevent
 *   parser crashes on the client.
 * * Core Dependencies:
 * - @google-cloud/vertexai
 * ============================================================================
 */

import { VertexAI } from "@google-cloud/vertexai";

// Initialize Vertex with the project ID and location
// Note: In production, these should be dynamically injected via process.env
// For this Phase, we hardcode the known project ID.
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || "aegis-488920";
const LOCATION = "us-central1";
const MODEL = "gemini-1.5-flash-preview-0514"; // Using flash for lower latency

const vertexAi = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const generativeModel = vertexAi.preview.getGenerativeModel({
    model: MODEL,
    // Safely instruct the model that we expect JSON (if supported by the specific model version, otherwise helps nudge it)
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2, // Low temperature for more deterministic link predictions
    },
});

export interface Insight {
    title: string;
    type: string;
    confidence: number;
    reasoning: string;
}

export interface PredictiveInsights {
    insights: Insight[];
}

export const generatePredictiveInsights = async (
    prompt: string,
): Promise<PredictiveInsights> => {
    try {
        const request = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        };

        const result = await generativeModel.generateContent(request);
        const response = result.response;

        if (!response.candidates || response.candidates.length === 0) {
            throw new Error("Vertex AI returned no candidates.");
        }

        const rawText = response.candidates[0].content.parts[0].text;
        if (!rawText) {
            throw new Error("Vertex AI returned empty text.");
        }

        // Parse to strip trailing spaces or markdown if the model hallucinated it despite instructions
        const cleanJsonStr = rawText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
        return JSON.parse(cleanJsonStr);
    } catch (error) {
        console.error("[VertexAI] Inference Failed:", error);
        throw new Error("Failed to generate predictive context from AI model.");
    }
};
