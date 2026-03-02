/**
 * ============================================================================
 * File: client/webview/src/App.tsx
 * ============================================================================
 * * Objective:
 * Root React component for the Aegis Context Vault Webview. Provides the UI
 * for the developer to authenticate and view context data.
 * * Architectural Considerations & Sceptical Analysis:
 * - This runs inside VSCode's iframe-like webview.
 * - Sceptical note: Avoid heavy client-side state management initially; keep
 *   the UI as a dumb terminal communicating with the extension backend.
 * * Core Dependencies:
 * - React
 * ============================================================================
 */

import React, { useState, useEffect } from "react";
import StateIndicator from "./components/StateIndicator";
import AIPredictions from "./components/AIPredictions";

const vscode = (window as any).acquireVsCodeApi
    ? (window as any).acquireVsCodeApi()
    : null;

function App() {
    const [status, setStatus] = useState("Disconnected");

    const handleConnect = () => {
        setStatus("Connecting to Vault...");
        if (vscode) {
            vscode.postMessage({
                command: "initiate_github_oauth",
                platform: "github",
            });
        }
    };

    // Request initial state on mount and listen for IPC messages
    useEffect(() => {
        if (vscode) {
            vscode.postMessage({ command: "request_initial_state" });
        }

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case "github_connected":
                    setStatus("Connected");
                    break;
                case "github_connection_failed":
                    setStatus(`Failed: ${message.error || "Unknown error"}`);
                    break;
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    return (
        <div
            style={{
                padding: "20px",
                fontFamily: "sans-serif",
                color: "var(--vscode-editor-foreground)",
                background: "var(--vscode-editor-background)",
            }}
        >
            <h1>Aegis Context Vault</h1>
            <p>Securely connect to your third-party integrations.</p>

            <div
                style={{
                    marginTop: "20px",
                    padding: "15px",
                    background: "var(--vscode-editorWidget-background)",
                    borderRadius: "5px",
                    border: "1px solid var(--vscode-editorWidget-border)",
                }}
            >
                <h2>GitHub Integration</h2>
                <p>
                    Status:{" "}
                    <span style={{ color: "var(--vscode-charts-blue)" }}>
                        {status}
                    </span>
                </p>
                <button
                    onClick={handleConnect}
                    style={{
                        padding: "10px 15px",
                        background: "var(--vscode-button-background)",
                        color: "var(--vscode-button-foreground)",
                        border: "none",
                        borderRadius: "3px",
                        cursor: "pointer",
                    }}
                >
                    Connect GitHub
                </button>
            </div>

            <StateIndicator />
            <AIPredictions vscodeApi={vscode} />
        </div>
    );
}

export default App;
