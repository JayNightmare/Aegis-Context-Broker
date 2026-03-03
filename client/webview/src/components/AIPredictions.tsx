/**
 * ============================================================================
 * File: client/webview/src/components/AIPredictions.tsx
 * ============================================================================
 * * Objective:
 * Displays pre-fetched AI predictions as expandable cards. Predictions are
 * auto-loaded from cache on mount — no button click required. Each card
 * shows the PR/Issue title, type badge, state chip, confidence bar, and
 * expands to reveal the full description, labels, and metadata.
 * * Architectural Considerations & Sceptical Analysis:
 * - Auto-load: on mount we request cached predictions via IPC. If the
 *   PredictionEngine already has results, they appear instantly.
 * - Expandable cards: body text is rendered as plain text (HTML stripped)
 *   to prevent XSS in the Webview sandbox.
 * - "Last updated" timestamp is shown so the developer knows how stale
 *   the predictions are and can manually refresh if needed.
 * * Core Dependencies:
 * - React
 * ============================================================================
 */

import React, { useEffect, useState, useCallback } from "react";

interface GitHubResult {
	title: string;
	url: string;
	number: number;
	state: "open" | "closed";
	itemType: "pr" | "issue";
	body: string | null;
	labels: string[];
	changedFilesCount: number;
	commentCount: number;
}

interface Insight {
	title: string;
	type: string;
	confidence: number;
	reasoning: string;
	searchQuery?: string;
	githubResult: GitHubResult | null;
}

interface PredictionPayload {
	insights: Insight[];
	repoHint: string | null;
}

interface AIPredictionsProps {
	vscodeApi: any;
}

const TYPE_CONFIG: Record<
	string,
	{ emoji: string; color: string; label: string }
> = {
	"github pr": { emoji: "🔀", color: "#6f42c1", label: "PR" },
	"github issue": { emoji: "🐛", color: "#0969da", label: "Issue" },
	documentation: { emoji: "📄", color: "#1a7f37", label: "Docs" },
};

const getTypeConfig = (type: string) => {
	const key = type.toLowerCase();
	return (
		Object.entries(TYPE_CONFIG).find(([k]) =>
			key.includes(k),
		)?.[1] ?? {
			emoji: "🔗",
			color: "var(--vscode-badge-background)",
			label: type,
		}
	);
};

const LABEL_COLORS: string[] = [
	"#6f42c1",
	"#0969da",
	"#1a7f37",
	"#d97706",
	"#cf222e",
	"#8250df",
	"#0550ae",
	"#116329",
];

const timeAgo = (timestamp: number): string => {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	if (seconds < 10) return "just now";
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	return `${Math.floor(minutes / 60)}h ago`;
};

/** Skeleton card shown during loading. */
const SkeletonCard: React.FC = () => (
	<div style={styles.card}>
		<div
			style={{
				...styles.skeletonLine,
				width: "60%",
				height: "14px",
				marginBottom: "10px",
			}}
		/>
		<div
			style={{
				...styles.skeletonLine,
				width: "90%",
				height: "11px",
				marginBottom: "6px",
			}}
		/>
		<div
			style={{
				...styles.skeletonLine,
				width: "40%",
				height: "8px",
			}}
		/>
	</div>
);

/** Expandable insight card with inline content preview. */
const InsightCard: React.FC<{ insight: Insight }> = ({ insight }) => {
	const [expanded, setExpanded] = useState(false);
	const cfg = getTypeConfig(insight.type);
	const gh = insight.githubResult;
	const confidencePct = Math.round(insight.confidence * 100);

	const title = gh?.title ?? insight.title;
	const url = gh?.url ?? null;
	const isOpen = gh?.state === "open";
	const hasPreview = gh?.body || (gh?.labels && gh.labels.length > 0);

	return (
		<div
			style={{
				...styles.card,
				cursor: hasPreview ? "pointer" : "default",
			}}
			onClick={() => hasPreview && setExpanded(!expanded)}
		>
			{/* Header row */}
			<div style={styles.cardHeader}>
				<span
					style={{
						...styles.badge,
						background: cfg.color,
					}}
				>
					{cfg.emoji} {cfg.label}
				</span>
				{gh && (
					<span
						style={{
							...styles.chip,
							background: isOpen
								? "#1a7f3722"
								: "#6e768166",
							color: isOpen
								? "#1a7f37"
								: "#8b949e",
							border: `1px solid ${isOpen ? "#1a7f3744" : "#6e768144"}`,
						}}
					>
						{isOpen ? "● Open" : "✓ Closed"}
					</span>
				)}
				{gh?.number && (
					<span style={styles.prNumber}>
						#{gh.number}
					</span>
				)}
				{hasPreview && (
					<span style={styles.expandArrow}>
						{expanded ? "▾" : "▸"}
					</span>
				)}
			</div>

			{/* Title */}
			{url ? (
				<a
					href={url}
					style={styles.titleLink}
					title={title}
					onClick={(e) => e.stopPropagation()}
				>
					{title}
				</a>
			) : (
				<p style={styles.titleText}>{title}</p>
			)}

			{/* Reasoning */}
			<p style={styles.reasoning}>{insight.reasoning}</p>

			{/* Metadata row */}
			{gh && (
				<div style={styles.metaRow}>
					{gh.changedFilesCount > 0 && (
						<span style={styles.metaItem}>
							📝{" "}
							{gh.changedFilesCount}{" "}
							files
						</span>
					)}
					{gh.commentCount > 0 && (
						<span style={styles.metaItem}>
							💬 {gh.commentCount}
						</span>
					)}
				</div>
			)}

			{/* Confidence bar */}
			<div style={styles.confidenceRow}>
				<span style={styles.confidenceLabel}>
					Confidence: {confidencePct}%
				</span>
				<div style={styles.confidenceTrack}>
					<div
						style={{
							...styles.confidenceFill,
							width: `${confidencePct}%`,
							background:
								confidencePct >=
								75
									? "#1a7f37"
									: confidencePct >=
										  50
										? "#d97706"
										: "#cf222e",
						}}
					/>
				</div>
			</div>

			{/* Expanded preview */}
			{expanded && gh && (
				<div style={styles.previewSection}>
					{gh.labels.length > 0 && (
						<div style={styles.labelRow}>
							{gh.labels.map(
								(label, i) => (
									<span
										key={
											label
										}
										style={{
											...styles.labelChip,
											background: `${LABEL_COLORS[i % LABEL_COLORS.length]}22`,
											color: LABEL_COLORS[
												i %
													LABEL_COLORS.length
											],
											border: `1px solid ${LABEL_COLORS[i % LABEL_COLORS.length]}44`,
										}}
									>
										{
											label
										}
									</span>
								),
							)}
						</div>
					)}
					{gh.body && (
						<p style={styles.bodyText}>
							{gh.body}
						</p>
					)}
					{!gh.body && (
						<p style={styles.bodyEmpty}>
							No description provided.
						</p>
					)}
				</div>
			)}
		</div>
	);
};

const AIPredictions: React.FC<AIPredictionsProps> = ({ vscodeApi }) => {
	const [payload, setPayload] = useState<PredictionPayload | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [cachedAt, setCachedAt] = useState<number>(0);

	const handleMessage = useCallback((event: MessageEvent) => {
		const message = event.data;
		switch (message.command) {
			case "prediction_loading":
				setLoading(true);
				setError(null);
				break;
			case "receive_predictions":
				setLoading(false);
				if (message.payload?.insights) {
					setPayload(
						message.payload as PredictionPayload,
					);
					setCachedAt(
						message.cachedAt ?? Date.now(),
					);
				} else if (message.error) {
					setError(message.error);
				}
				break;
		}
	}, []);

	useEffect(() => {
		window.addEventListener("message", handleMessage);

		// Request cached predictions immediately on mount
		vscodeApi?.postMessage({
			command: "request_cached_predictions",
		});

		return () =>
			window.removeEventListener("message", handleMessage);
	}, [handleMessage, vscodeApi]);

	const requestRefresh = () => {
		setLoading(true);
		setError(null);
		setPayload(null);
		vscodeApi?.postMessage({ command: "request_predictions" });
	};

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<div>
					<h3 style={styles.heading}>
						Predicted Contexts
					</h3>
					{payload?.repoHint && (
						<span style={styles.repoLabel}>
							📦 {payload.repoHint}
						</span>
					)}
					{cachedAt > 0 && !loading && (
						<span
							style={
								styles.timestampLabel
							}
						>
							Updated{" "}
							{timeAgo(cachedAt)}
						</span>
					)}
				</div>
				<button
					id="refresh-predictions-btn"
					onClick={requestRefresh}
					disabled={loading}
					style={{
						...styles.button,
						opacity: loading ? 0.6 : 1,
						cursor: loading
							? "wait"
							: "pointer",
					}}
				>
					{loading ? "Analysing…" : "↻ Refresh"}
				</button>
			</div>

			{error && <p style={styles.errorText}>{error}</p>}

			{loading && (
				<>
					<p style={styles.loadingHint}>
						<span style={styles.spinner} />{" "}
						Querying Vertex AI and searching
						GitHub…
					</p>
					<SkeletonCard />
					<SkeletonCard />
					<SkeletonCard />
				</>
			)}

			{!loading && !payload && !error && (
				<p style={styles.emptyHint}>
					Aegis is preparing predictions in the
					background. They'll appear here
					automatically when ready.
				</p>
			)}

			{!loading &&
				payload?.insights.map((insight, i) => (
					<InsightCard
						key={i}
						insight={insight}
					/>
				))}

			<style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes shimmer {
                    from { background-position: -200% 0; }
                    to   { background-position:  200% 0; }
                }
            `}</style>
		</div>
	);
};

const styles: Record<string, React.CSSProperties> = {
	container: {
		marginTop: "20px",
		padding: "16px",
		background: "var(--vscode-editorWidget-background)",
		borderRadius: "6px",
		border: "1px solid var(--vscode-editorWidget-border)",
	},
	header: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: "14px",
	},
	heading: { margin: 0, fontSize: "13px", fontWeight: 600 },
	repoLabel: {
		fontSize: "11px",
		color: "var(--vscode-descriptionForeground)",
		marginTop: "2px",
		display: "block",
	},
	timestampLabel: {
		fontSize: "10px",
		color: "var(--vscode-descriptionForeground)",
		marginTop: "2px",
		display: "block",
		fontStyle: "italic",
	},
	button: {
		padding: "5px 10px",
		background: "var(--vscode-button-background)",
		color: "var(--vscode-button-foreground)",
		border: "none",
		borderRadius: "4px",
		fontSize: "12px",
		flexShrink: 0,
	},
	card: {
		padding: "12px",
		marginBottom: "10px",
		background: "var(--vscode-editor-background)",
		borderRadius: "5px",
		border: "1px solid var(--vscode-widget-border, #3c3c3c)",
		transition: "border-color 0.2s ease",
	},
	cardHeader: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
		marginBottom: "7px",
		flexWrap: "wrap",
	},
	badge: {
		fontSize: "10px",
		fontWeight: 600,
		padding: "2px 7px",
		borderRadius: "10px",
		color: "#fff",
		letterSpacing: "0.3px",
	},
	chip: {
		fontSize: "10px",
		padding: "2px 7px",
		borderRadius: "10px",
		fontWeight: 500,
	},
	prNumber: {
		fontSize: "10px",
		color: "var(--vscode-descriptionForeground)",
	},
	expandArrow: {
		fontSize: "10px",
		color: "var(--vscode-descriptionForeground)",
		marginLeft: "auto",
	},
	titleLink: {
		display: "block",
		fontSize: "12px",
		fontWeight: 600,
		color: "var(--vscode-textLink-foreground)",
		textDecoration: "none",
		marginBottom: "5px",
		lineHeight: "1.4",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	titleText: {
		fontSize: "12px",
		fontWeight: 600,
		margin: "0 0 5px 0",
		color: "var(--vscode-editor-foreground)",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	reasoning: {
		fontSize: "11px",
		margin: "0 0 6px 0",
		color: "var(--vscode-descriptionForeground)",
		lineHeight: "1.4",
	},
	metaRow: {
		display: "flex",
		gap: "10px",
		marginBottom: "6px",
	},
	metaItem: {
		fontSize: "10px",
		color: "var(--vscode-descriptionForeground)",
	},
	confidenceRow: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
	},
	confidenceLabel: {
		fontSize: "10px",
		color: "var(--vscode-descriptionForeground)",
		whiteSpace: "nowrap",
		width: "90px",
		flexShrink: 0,
	},
	confidenceTrack: {
		flex: 1,
		height: "4px",
		background: "var(--vscode-scrollbarSlider-background, #3c3c3c)",
		borderRadius: "2px",
		overflow: "hidden",
	},
	confidenceFill: {
		height: "100%",
		borderRadius: "2px",
		transition: "width 0.4s ease",
	},
	previewSection: {
		marginTop: "10px",
		paddingTop: "10px",
		borderTop: "1px solid var(--vscode-widget-border, #3c3c3c)",
	},
	labelRow: {
		display: "flex",
		flexWrap: "wrap",
		gap: "4px",
		marginBottom: "8px",
	},
	labelChip: {
		fontSize: "10px",
		padding: "2px 6px",
		borderRadius: "8px",
		fontWeight: 500,
	},
	bodyText: {
		fontSize: "11px",
		color: "var(--vscode-editor-foreground)",
		lineHeight: "1.5",
		margin: 0,
		whiteSpace: "pre-wrap",
		wordBreak: "break-word",
	},
	bodyEmpty: {
		fontSize: "11px",
		color: "var(--vscode-descriptionForeground)",
		fontStyle: "italic",
		margin: 0,
	},
	loadingHint: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		fontSize: "11px",
		color: "var(--vscode-descriptionForeground)",
		fontStyle: "italic",
		marginBottom: "10px",
	},
	spinner: {
		display: "inline-block",
		width: "12px",
		height: "12px",
		border: "2px solid var(--vscode-descriptionForeground)",
		borderTop: "2px solid transparent",
		borderRadius: "50%",
		animation: "spin 0.8s linear infinite",
		flexShrink: 0,
	},
	emptyHint: {
		fontSize: "11px",
		color: "var(--vscode-descriptionForeground)",
		lineHeight: "1.5",
	},
	errorText: {
		fontSize: "11px",
		color: "var(--vscode-errorForeground)",
	},
	skeletonLine: {
		borderRadius: "3px",
		background: "linear-gradient(90deg, var(--vscode-widget-border, #3c3c3c) 25%, var(--vscode-editor-background) 50%, var(--vscode-widget-border, #3c3c3c) 75%)",
		backgroundSize: "200% 100%",
		animation: "shimmer 1.4s ease infinite",
	},
};

export default AIPredictions;
