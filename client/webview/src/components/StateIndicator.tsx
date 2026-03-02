/**
 * ============================================================================
 * File: client/webview/src/components/StateIndicator.tsx
 * ============================================================================
 * * Objective:
 * Displays the current Aegis Context Snapshot (active file, branch) to the user
 * within the Webview to provide transparency on what Vertex AI will analyze.
 * * Architectural Considerations & Sceptical Analysis:
 * - This component relies entirely on the VSCode host pushing messages to it.
 *   It maintains no direct connection to the Node.js backend to enforce the
 *   strict boundary design.
 * * Core Dependencies:
 * - React
 * ============================================================================
 */

import React, { useEffect, useState } from "react";

interface ContextSnapshot {
    timestamp: number;
    activeFile: string | null;
    activeBranch: string | null;
    workspaceRoot: string | null;
}

const StateIndicator: React.FC = () => {
    const [snapshot, setSnapshot] = useState<ContextSnapshot | null>(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === "update_context") {
                setSnapshot(message.payload as ContextSnapshot);
            }
        };

        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, []);

    if (!snapshot) {
        return (
            <div
                style={{
                    marginTop: "20px",
                    padding: "15px",
                    background: "var(--vscode-editorWidget-background)",
                    borderRadius: "5px",
                    border: "1px solid var(--vscode-editorWidget-border)",
                }}
            >
                <h3>Context Vault Status</h3>
                <p style={{ color: "var(--vscode-descriptionForeground)" }}>
                    Waiting for workspace activity...
                </p>
            </div>
        );
    }

    const formatTime = (ts: number) => new Date(ts).toLocaleTimeString();

    // Extract filename from the full path for cleaner display
    const fileName = snapshot.activeFile
        ? snapshot.activeFile.split(/[\\/]/).pop()
        : "None";

    return (
        <div
            style={{
                marginTop: "20px",
                padding: "15px",
                background: "var(--vscode-editorWidget-background)",
                borderRadius: "5px",
                border: "1px solid var(--vscode-editorWidget-border)",
            }}
        >
            <h3>Context Vault Status</h3>
            <ul style={{ listStyleType: "none", padding: 0, margin: "10px 0" }}>
                <li style={{ marginBottom: "8px" }}>
                    <strong>Active File:</strong>{" "}
                    <span
                        style={{
                            fontFamily: "monospace",
                            color: "var(--vscode-textPreformat-foreground)",
                        }}
                    >
                        {fileName}
                    </span>
                </li>
                <li style={{ marginBottom: "8px" }}>
                    <strong>Git Branch:</strong>{" "}
                    <span
                        style={{
                            fontFamily: "monospace",
                            color: "var(--vscode-textPreformat-foreground)",
                        }}
                    >
                        {snapshot.activeBranch || "None"}
                    </span>
                </li>
                <li style={{ marginBottom: "8px" }}>
                    <strong>Last Sync:</strong>{" "}
                    <span
                        style={{
                            color: "var(--vscode-textPreformat-foreground)",
                        }}
                    >
                        {formatTime(snapshot.timestamp)}
                    </span>
                </li>
            </ul>
        </div>
    );
};

export default StateIndicator;
