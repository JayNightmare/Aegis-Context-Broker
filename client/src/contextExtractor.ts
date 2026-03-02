/**
 * ============================================================================
 * File: client/src/contextExtractor.ts
 * ============================================================================
 * * Objective:
 * Listens for VSCode workspace changes (active text editor, git branch) and
 * packages them into a context snapshot for the Aegis backend.
 * * Architectural Considerations & Sceptical Analysis:
 * - Extremely High Risk of Latency/Spam: A developer switching rapidly between
 *   files could trigger hundreds of events. We MUST strongly debounce this.
 * - Sceptical note: The Git extension API can be slow to initialize. We must
 *   handle cases where Git is not yet available without crashing the extension.
 * * Core Dependencies:
 * - vscode API
 * ============================================================================
 */

import * as vscode from "vscode";

export interface ContextSnapshot {
    timestamp: number;
    activeFile: string | null;
    activeBranch: string | null;
    workspaceRoot: string | null;
}

export class ContextExtractor {
    private debounceTimer: NodeJS.Timeout | null = null;
    private readonly debounceDelayMs = 2000; // Wait 2 seconds of inactivity before firing
    private lastSnapshot: ContextSnapshot | null = null;
    private onSnapshotUpdateCallback:
        | ((snapshot: ContextSnapshot) => void)
        | null = null;

    constructor(private context: vscode.ExtensionContext) {
        // Listen for active text editor changes
        vscode.window.onDidChangeActiveTextEditor(
            () => this.triggerEvaluation(),
            null,
            this.context.subscriptions,
        );

        // Listen for document saves as an additional context cue
        vscode.workspace.onDidSaveTextDocument(
            () => this.triggerEvaluation(),
            null,
            this.context.subscriptions,
        );

        // Initial evaluation
        this.triggerEvaluation();
    }

    public onSnapshotUpdate(callback: (snapshot: ContextSnapshot) => void) {
        this.onSnapshotUpdateCallback = callback;
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

        let activeBranch = null;
        try {
            activeBranch = await this.getGitBranch();
        } catch (e) {
            console.error("Aegis: Failed to retrieve Git branch", e);
        }

        const snapshot: ContextSnapshot = {
            timestamp: Date.now(),
            activeFile: activeEditor ? activeEditor.document.uri.fsPath : null,
            activeBranch: activeBranch,
            workspaceRoot: workspaceFolder ? workspaceFolder.uri.fsPath : null,
        };

        // Only fire if the snapshot has meaningfully changed (excluding timestamp)
        if (this.hasSnapshotChanged(snapshot)) {
            this.lastSnapshot = snapshot;
            if (this.onSnapshotUpdateCallback) {
                this.onSnapshotUpdateCallback(snapshot);
            }
        }
    }

    private hasSnapshotChanged(newSnapshot: ContextSnapshot): boolean {
        if (!this.lastSnapshot) return true;

        return (
            this.lastSnapshot.activeFile !== newSnapshot.activeFile ||
            this.lastSnapshot.activeBranch !== newSnapshot.activeBranch ||
            this.lastSnapshot.workspaceRoot !== newSnapshot.workspaceRoot
        );
    }

    private async getGitBranch(): Promise<string | null> {
        // Access the built-in VSCode Git extension to grab branch data securely
        const gitExtension = vscode.extensions.getExtension("vscode.git");
        if (!gitExtension) {
            return null;
        }

        // Ensure it's activated
        if (!gitExtension.isActive) {
            await gitExtension.activate();
        }

        const gitApi = gitExtension.exports.getAPI(1);
        if (gitApi.repositories.length > 0) {
            // Grab the branch of the primary repository
            const repo = gitApi.repositories[0];
            return repo.state.HEAD?.name || null;
        }

        return null;
    }

    public dispose() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }
}
