/**
 * ============================================================================
 * File: client/webview/src/components/AIPredictions.tsx
 * ============================================================================
 * * Objective:
 * Displays AI-generated contextual insights (links to Jira, GitHub, Docs)
 * based on the developer's current workspace state.
 * * Architectural Considerations & Sceptical Analysis:
 * - Network calls from the Webview back to the VSCode extension host are done
 *   via IPC message passing to maintain the security sandbox.
 * - Sceptical note: AI prediction takes 3-10 seconds. We MUST show a loading
 *   indicator so the user knows the system isn't hanging.
 * * Core Dependencies:
 * - React
 * ============================================================================
 */

import React, { useEffect, useState } from "react";

interface Insight {
    title: string;
    type: string;
    confidence: number;
    reasoning: string;
    actualUrl?: string | null;
}

interface AIPredictionsProps {
    vscodeApi: any;
}

const AIPredictions: React.FC<AIPredictionsProps> = ({ vscodeApi }) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Listen for messages from the VSCode extension host
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === "receive_predictions") {
                setLoading(false);
                if (message.payload && message.payload.insights) {
                    setInsights(message.payload.insights);
                } else if (message.error) {
                    setError(message.error);
                }
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const requestPredictions = () => {
        setLoading(true);
        setError(null);
        setInsights([]);

        if (vscodeApi) {
            vscodeApi.postMessage({ command: "request_predictions" });
        }
    };

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
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "15px",
                }}
            >
                <h3 style={{ margin: 0 }}>Predicted Contexts</h3>
                <button
                    onClick={requestPredictions}
                    disabled={loading}
                    style={{
                        padding: "6px 12px",
                        background: "var(--vscode-button-background)",
                        color: "var(--vscode-button-foreground)",
                        border: "none",
                        borderRadius: "3px",
                        cursor: loading ? "wait" : "pointer",
                        opacity: loading ? 0.6 : 1,
                    }}
                >
                    {loading ? "Analyzing..." : "Generate Insights"}
                </button>
            </div>

            {error && (
                <p style={{ color: "var(--vscode-errorForeground)" }}>
                    {error}
                </p>
            )}

            {loading && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        color: "var(--vscode-descriptionForeground)",
                        fontStyle: "italic",
                    }}
                >
                    <div
                        style={{
                            width: "14px",
                            height: "14px",
                            border: "2px solid var(--vscode-descriptionForeground)",
                            borderTop: "2px solid transparent",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                            marginRight: "8px",
                        }}
                    />
                    Thinking... Vertex AI is generating insights and searching
                    external tools.
                </div>
            )}
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>

            {!loading && insights.length === 0 && !error && (
                <p style={{ color: "var(--vscode-descriptionForeground)" }}>
                    Click 'Generate Insights' to see relevant documentation.
                </p>
            )}

            {!loading && insights.length > 0 && (
                <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
                    {insights.map((insight, index) => (
                        <li
                            key={index}
                            style={{
                                marginBottom: "15px",
                                paddingBottom: "15px",
                                borderBottom:
                                    index < insights.length - 1
                                        ? "1px solid var(--vscode-widget-border)"
                                        : "none",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "baseline",
                                }}
                            >
                                <strong>
                                    {insight.actualUrl ? (
                                        <a
                                            href={insight.actualUrl}
                                            style={{
                                                color: "var(--vscode-textLink-foreground)",
                                                textDecoration: "none",
                                            }}
                                        >
                                            {insight.title}
                                        </a>
                                    ) : (
                                        insight.title
                                    )}
                                </strong>
                                <span
                                    style={{
                                        fontSize: "0.8em",
                                        padding: "2px 6px",
                                        background:
                                            "var(--vscode-badge-background)",
                                        color: "var(--vscode-badge-foreground)",
                                        borderRadius: "10px",
                                    }}
                                >
                                    {insight.type} (
                                    {Math.round(insight.confidence * 100)}%)
                                </span>
                            </div>
                            <p
                                style={{
                                    margin: "5px 0 0 0",
                                    fontSize: "0.9em",
                                    color: "var(--vscode-descriptionForeground)",
                                }}
                            >
                                {insight.reasoning}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AIPredictions;
