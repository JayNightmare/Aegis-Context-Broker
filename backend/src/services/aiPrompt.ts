/**
 * ============================================================================
 * File: backend/src/services/aiPrompt.ts
 * ============================================================================
 * * Objective:
 * Translates the developer's raw ContextSnapshot into a rigid, deterministic
 * prompt for the Vertex AI model to prevent hallucination and format drift.
 * * Architectural Considerations & Sceptical Analysis:
 * - We cannot trust LLMs to figure out what the developer wants without strict
 *   instructions. The system prompt MUST mandate JSON output and constrain it
 *   from answering general programming queries (reducing cost/latency).
 * - Must gracefully handle partial context (e.g., missing git branch).
 * * Core Dependencies:
 * - None (pure logic module)
 * ============================================================================
 */

import { ContextSnapshotPayload } from "./firestore";

export const buildContextPrompt = (
    snapshot: ContextSnapshotPayload,
): string => {
    const { activeFile, activeBranch, workspaceRoot } = snapshot;

    const fileCtx = activeFile
        ? `Active File: ${activeFile}`
        : "No active file detected.";
    const branchCtx = activeBranch
        ? `Git Branch: ${activeBranch}`
        : "No branch detected.";
    const rootCtx = workspaceRoot
        ? `Workspace Root: ${workspaceRoot}`
        : "Unknown workspace.";

    return `
You are Aegis, a hyper-focused Context Broker integration assistant.
Your ONLY objective is to analyze the developer's current IDE context and predict which external documentation, Jira tickets, or GitHub pull requests they are likely to need next.

--- DEVELOPER CONTEXT ---
${rootCtx}
${branchCtx}
${fileCtx}
--------------------------

INSTRUCTIONS:
1. Do NOT answer general programming questions.
2. Given the file and branch name, deduce the feature or bug the developer is working on.
3. Return exactly 3 highly relevant hypothetical links.
4. You MUST return your answer in strictly valid JSON format matching the schema below. Do not output markdown code blocks.

SCHEMA:
{
  "insights": [
    {
      "title": "String (Short description of the ticket/doc)",
      "type": "String (e.g., 'Jira Ticket', 'GitHub PR', 'Wiki')",
      "confidence": "Number (0.0 to 1.0)",
      "reasoning": "String (1 short sentence why this is relevant)"
    }
  ]
}
`.trim();
};
