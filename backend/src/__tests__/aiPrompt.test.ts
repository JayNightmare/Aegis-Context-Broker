import { buildContextPrompt } from "../services/aiPrompt";
import { ContextSnapshotPayload } from "../services/firestore";

describe("aiPrompt Service", () => {
	it("should generate a rigidly formatted prompt containing the snapshot data", () => {
		const snapshot: ContextSnapshotPayload = {
			activeFile: "/test/workspace/src/utils.ts",
			activeBranch: "feature/auth-login",
			workspaceRoot: "/test/workspace",
			timestamp: Date.now(),
			openSymbols: ["authenticateUser", "AuthMiddleware"],
			recentFiles: ["/test/workspace/src/auth.ts"],
			diagnostics: ["Cannot find module './token'"],
			repoHint: "owner/repo",
		};

		const result = buildContextPrompt(snapshot);

		expect(result).toContain(
			"Active File: /test/workspace/src/utils.ts",
		);
		expect(result).toContain("Git Branch: feature/auth-login");
		expect(result).toContain("Workspace Root: /test/workspace");
		expect(result).toContain("SCHEMA:");
		expect(result).toContain("insights");
		expect(result).toContain(
			"Open Symbols: authenticateUser, AuthMiddleware",
		);
		expect(result).toContain("GitHub Repository: owner/repo");
	});

	it("should handle missing contextual data gracefully", () => {
		const snapshot: ContextSnapshotPayload = {
			activeFile: "",
			activeBranch: "",
			workspaceRoot: "",
			timestamp: Date.now(),
			openSymbols: [],
			recentFiles: [],
			diagnostics: [],
			repoHint: null,
		};

		const result = buildContextPrompt(snapshot);

		expect(result).toContain("No active file detected.");
		expect(result).toContain("No branch detected.");
		expect(result).toContain("Unknown workspace.");
	});
});
