/**
 * ============================================================================
 * File: backend/src/services/aiPrompt.ts
 * ============================================================================
 * * Objective:
 * Translates the developer's rich ContextSnapshot into a rigid, deterministic
 * prompt for the Vertex AI model. Includes symbols, diagnostics, and recent
 * file history to enable meaningful cross-referenced predictions.
 * * Architectural Considerations & Sceptical Analysis:
 * - We cannot trust LLMs without strict constraints. The system prompt MUST
 *   mandate JSON output and forbid general Q&A to contain scope and cost.
 * - repoHint is injected deliberately so Gemini prefers same-repo results,
 *   reducing resolution miss-rate significantly.
 * - Must gracefully handle partial context (e.g., missing git branch or symbols).
 * * Core Dependencies:
 * - None (pure logic module)
 * ============================================================================
 */

import { ContextSnapshotPayload } from "./firestore";

export const buildContextPrompt = (
	snapshot: ContextSnapshotPayload,
): string => {
	const {
		activeFile,
		activeBranch,
		workspaceRoot,
		openSymbols,
		recentFiles,
		diagnostics,
		repoHint,
	} = snapshot;

	const fileCtx = activeFile
		? `Active File: ${activeFile}`
		: "No active file detected.";
	const branchCtx = activeBranch
		? `Git Branch: ${activeBranch}`
		: "No branch detected.";
	const rootCtx = workspaceRoot
		? `Workspace Root: ${workspaceRoot}`
		: "Unknown workspace.";
	const repoCtx = repoHint
		? `GitHub Repository: ${repoHint}`
		: "GitHub repository unknown.";
	const symbolsCtx =
		openSymbols && openSymbols.length > 0
			? `Open Symbols: ${openSymbols.join(", ")}`
			: "No symbols detected.";
	const recentCtx =
		recentFiles && recentFiles.length > 0
			? `Recently Visited Files:\n${recentFiles.map((f) => `  - ${f}`).join("\n")}`
			: "No recent file history.";
	const diagnosticsCtx =
		diagnostics && diagnostics.length > 0
			? `Active Diagnostics (Errors/Warnings):\n${diagnostics.map((d) => `  - ${d}`).join("\n")}`
			: "No active diagnostics.";

	return `
You are Aegis, a hyper-focused Context Broker integration assistant.
Your ONLY objective is to analyze the developer's current IDE context and predict which external GitHub PRs, GitHub Issues, or documentation pages they are most likely to need RIGHT NOW.

--- DEVELOPER CONTEXT ---
${rootCtx}
${repoCtx}
${branchCtx}
${fileCtx}
${symbolsCtx}
${recentCtx}
${diagnosticsCtx}
--------------------------

INSTRUCTIONS:
1. Do NOT answer general programming questions.
2. Deduce the feature or bug the developer is actively working on based on the branch name, file path, symbols, and any diagnostic errors.
3. If a GitHub repository is provided, PREFER targeting that specific repository in your predictions.
4. Return exactly 3 highly relevant predictions, ordered by descending confidence.
5. You MUST return your answer in strictly valid JSON matching the schema below. Do not output markdown code blocks or any explanation text.

SCHEMA:
{
  "insights": [
    {
      "title": "String (Short description of the PR, Issue, or doc page)",
      "type": "String (one of: 'GitHub PR', 'GitHub Issue', 'Documentation')",
      "confidence": Number (0.0 to 1.0 based on how relevant the prediction is),
      "reasoning": "String (1 concise sentence explaining why this is relevant right now)",
      "searchQuery": "String (an optimal search query string to find this on GitHub)"
    }
  ]
}
`.trim();
};
