/**
 * ============================================================================
 * File: client/src/contextExtractor.ts
 * ============================================================================
 * * Objective:
 * Listens for VSCode workspace changes (active text editor, git branch) and
 * packages them into a context snapshot for the Aegis backend. Extracts rich
 * signals — symbols, recent files, diagnostics, and GitHub repo hint — to
 * power meaningful AI predictions.
 * * Architectural Considerations & Sceptical Analysis:
 * - Extremely High Risk of Latency/Spam: A developer switching rapidly between
 *   files could trigger hundreds of events. We MUST strongly debounce this.
 * - Document Symbol Provider: executeDocumentSymbolProvider is async and may
 *   fail on unsupported file types. We must time-box it and fail gracefully.
 * - Sceptical note: The Git extension API can be slow to initialize. We must
 *   handle cases where Git is not yet available without crashing the extension.
 * * Core Dependencies:
 * - vscode API
 * ============================================================================
 */

import * as vscode from "vscode";
import * as path from "path";

export interface ContextSnapshot {
	timestamp: number;
	activeFile: string | null;
	activeBranch: string | null;
	workspaceRoot: string | null;
	openSymbols: string[];
	recentFiles: string[];
	diagnostics: string[];
	repoHint: string | null;
}

export class ContextExtractor {
	private debounceTimer: NodeJS.Timeout | null = null;
	private readonly debounceDelayMs = 2000;
	private lastSnapshot: ContextSnapshot | null = null;
	private recentFiles: string[] = [];
	private onSnapshotUpdateCallback:
		| ((snapshot: ContextSnapshot) => void)
		| null = null;

	constructor(private context: vscode.ExtensionContext) {
		vscode.window.onDidChangeActiveTextEditor(
			(editor) => {
				if (editor?.document.uri.scheme === "file") {
					this.trackRecentFile(
						editor.document.uri.fsPath,
					);
				}
				this.triggerEvaluation();
			},
			null,
			this.context.subscriptions,
		);

		vscode.workspace.onDidSaveTextDocument(
			() => this.triggerEvaluation(),
			null,
			this.context.subscriptions,
		);

		vscode.languages.onDidChangeDiagnostics(
			() => this.triggerEvaluation(),
			null,
			this.context.subscriptions,
		);

		this.triggerEvaluation();
	}

	public onSnapshotUpdate(callback: (snapshot: ContextSnapshot) => void) {
		this.onSnapshotUpdateCallback = callback;
	}

	private trackRecentFile(filePath: string) {
		this.recentFiles = [
			filePath,
			...this.recentFiles.filter((f) => f !== filePath),
		].slice(0, 5);
	}

	private triggerEvaluation() {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		this.debounceTimer = setTimeout(async () => {
			await this.evaluateContext();
		}, this.debounceDelayMs);
	}

	private async evaluateContext() {
		const activeEditor = vscode.window.activeTextEditor;
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

		let activeBranch: string | null = null;
		let repoHint: string | null = null;
		try {
			const gitData = await this.getGitData();
			activeBranch = gitData.branch;
			repoHint = gitData.repoHint;
		} catch (e) {
			console.error(
				"Aegis: Failed to retrieve Git branch/remote",
				e,
			);
		}

		const openSymbols = activeEditor
			? await this.getDocumentSymbols(activeEditor.document)
			: [];

		const diagnostics = this.getActiveDiagnostics(activeEditor);

		const snapshot: ContextSnapshot = {
			timestamp: Date.now(),
			activeFile: activeEditor
				? activeEditor.document.uri.fsPath
				: null,
			activeBranch,
			workspaceRoot: workspaceFolder
				? workspaceFolder.uri.fsPath
				: null,
			openSymbols,
			recentFiles: [...this.recentFiles],
			diagnostics,
			repoHint,
		};

		if (this.hasSnapshotChanged(snapshot)) {
			this.lastSnapshot = snapshot;
			if (this.onSnapshotUpdateCallback) {
				this.onSnapshotUpdateCallback(snapshot);
			}
		}
	}

	/**
	 * Extracts top-level symbol names (functions, classes, interfaces) from the
	 * active document. Time-boxed to 1500ms to avoid blocking on large files.
	 */
	private async getDocumentSymbols(
		document: vscode.TextDocument,
	): Promise<string[]> {
		try {
			const symbols = await Promise.race([
				vscode.commands.executeCommand<
					| vscode.DocumentSymbol[]
					| vscode.SymbolInformation[]
				>(
					"vscode.executeDocumentSymbolProvider",
					document.uri,
				),
				new Promise<undefined>((resolve) =>
					setTimeout(
						() => resolve(undefined),
						1500,
					),
				),
			]);

			if (!symbols || symbols.length === 0) {
				return [];
			}

			return symbols
				.map((s) => s.name)
				.filter(
					(name) =>
						name &&
						!name.startsWith("_") &&
						name.length > 1,
				)
				.slice(0, 10);
		} catch {
			return [];
		}
	}

	/**
	 * Collects error and warning messages from the active file via the
	 * VSCode diagnostics API (same source as the Problems panel).
	 */
	private getActiveDiagnostics(
		editor: vscode.TextEditor | undefined,
	): string[] {
		if (!editor) {
			return [];
		}
		return vscode.languages
			.getDiagnostics(editor.document.uri)
			.filter(
				(d) =>
					d.severity ===
						vscode.DiagnosticSeverity
							.Error ||
					d.severity ===
						vscode.DiagnosticSeverity
							.Warning,
			)
			.map((d) => d.message)
			.slice(0, 5);
	}

	/**
	 * Retrieves the current Git branch and derives the GitHub owner/repo
	 * hint from the primary remote's URL (ssh or https formats).
	 */
	private async getGitData(): Promise<{
		branch: string | null;
		repoHint: string | null;
	}> {
		const gitExtension =
			vscode.extensions.getExtension("vscode.git");
		if (!gitExtension) {
			return { branch: null, repoHint: null };
		}

		if (!gitExtension.isActive) {
			await gitExtension.activate();
		}

		const gitApi = gitExtension.exports.getAPI(1);
		if (gitApi.repositories.length === 0) {
			return { branch: null, repoHint: null };
		}

		const repo = gitApi.repositories[0];
		const branch = repo.state.HEAD?.name || null;
		const remoteUrl: string | undefined =
			repo.state.remotes?.[0]?.fetchUrl;

		const repoHint = remoteUrl
			? this.parseRepoHint(remoteUrl)
			: null;

		return { branch, repoHint };
	}

	/**
	 * Parses an owner/repo string from both SSH and HTTPS GitHub remote URLs.
	 * e.g. "git@github.com:owner/repo.git" → "owner/repo"
	 * e.g. "https://github.com/owner/repo.git" → "owner/repo"
	 */
	private parseRepoHint(remoteUrl: string): string | null {
		const sshMatch = remoteUrl.match(
			/github\.com[:/](.+?)(?:\.git)?$/,
		);
		if (sshMatch) {
			return sshMatch[1];
		}
		return null;
	}

	private hasSnapshotChanged(newSnapshot: ContextSnapshot): boolean {
		if (!this.lastSnapshot) {
			return true;
		}
		return (
			this.lastSnapshot.activeFile !==
				newSnapshot.activeFile ||
			this.lastSnapshot.activeBranch !==
				newSnapshot.activeBranch ||
			this.lastSnapshot.workspaceRoot !==
				newSnapshot.workspaceRoot ||
			JSON.stringify(this.lastSnapshot.diagnostics) !==
				JSON.stringify(newSnapshot.diagnostics)
		);
	}

	public dispose() {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
	}
}
