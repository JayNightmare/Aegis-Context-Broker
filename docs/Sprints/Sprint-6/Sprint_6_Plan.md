# Sprint 6: Aegis Core Prediction Engine

The existing pipeline scaffold (Vertex AI → insightResolver → GitHub search) is wired up correctly, but it currently predicts from only a file name and branch. This means Gemini is guessing in the dark. We need to feed it real IDE signals and close the loop back to the UI.

## Proposed Changes

---

### Component 1: Richer Context Signals

#### [MODIFY] [firestore.ts](file:///Volumes/Temp%20Drive/Aegis-Context-Broker/backend/src/services/firestore.ts)
Extend [ContextSnapshotPayload](file:///Volumes/Temp%20Drive/Aegis-Context-Broker/backend/src/services/firestore.ts#27-33) with:
- `openSymbols: string[]` — function/class names visible in the active file
- `recentFiles: string[]` — up to 5 recently visited files
- `diagnostics: string[]` — active error/warning messages from the Problems panel

#### [MODIFY] [contextExtractor.ts](file:///Volumes/Temp%20Drive/Aegis-Context-Broker/client/src/contextExtractor.ts)
Extract and send the new fields using the VSCode API:
- `vscode.languages.getDiagnostics()` for errors/warnings
- `vscode.window.visibleTextEditors` for symbols (via `executeDocumentSymbolProvider`)

---

### Component 2: Smarter AI Prompt

#### [MODIFY] [aiPrompt.ts](file:///Volumes/Temp%20Drive/Aegis-Context-Broker/backend/src/services/aiPrompt.ts)
Rewrite the prompt template to include the new context fields. Also pass a `githubRepo` hint so Gemini can suggest same-repo targets first. Update the schema to include a `repo` field in insights.

---

### Component 3: Live GitHub Search

#### [MODIFY] [githubSearch.ts](file:///Volumes/Temp%20Drive/Aegis-Context-Broker/backend/src/services/githubSearch.ts)
The current implementation searches `issues?q=title in:title` globally — it will return irrelevant results from unrelated repos. Fix:
- Accept an optional `repoHint` param (e.g., `owner/repo`) to scope the query
- Search both Issues and PRs via `type:pr` and `type:issue` qualifiers
- Return a richer `GitHubResult` object: `{ title, url, number, state, type }`

#### [MODIFY] [insightResolver.ts](file:///Volumes/Temp%20Drive/Aegis-Context-Broker/backend/src/services/insightResolver.ts)
- Thread the `repoHint` from the snapshot through to [resolveGithubUrl](file:///Volumes/Temp%20Drive/Aegis-Context-Broker/backend/src/services/githubSearch.ts#22-70)
- Enrich [ResolvedInsight](file:///Volumes/Temp%20Drive/Aegis-Context-Broker/backend/src/services/insightResolver.ts#24-27) to include `itemNumber`, `itemState` (`open`/`closed`), `itemType` (`pr`/`issue`) alongside the URL

---

### Component 4: Webview Prediction Panel

#### [MODIFY] [AIPredictions.tsx](file:///Volumes/Temp%20Drive/Aegis-Context-Broker/client/webview/src/components/AIPredictions.tsx)
The current UI renders raw JSON-like text. Replace with:
- **Card per insight**: title, type badge (🔀 PR / 🐛 Issue / 📄 Doc), PR number, `open`/`closed` chip
- **Confidence bar**: visual fill bar using the `confidence` score from Gemini
- **Reasoning tooltip**: show `reasoning` field on hover/expand
- **Animated skeleton loader** while the prediction fetch is in-flight

> [!IMPORTANT]
> We do NOT add Jira UI support in this sprint (no Jira token exists yet). The Jira `resolveUrl` path will remain a no-op that returns `null` gracefully.

---

## Verification Plan

### Automated Tests
Run the full existing test suite after changes:
```bash
cd /Volumes/Temp\ Drive/Aegis-Context-Broker/backend && npm test
```
Expected: all 6 test files pass. We will also update [aiPrompt.test.ts](file:///Volumes/Temp%20Drive/Aegis-Context-Broker/backend/src/__tests__/aiPrompt.test.ts) to assert the new context fields appear in the prompt.

### Manual End-to-End Test
1. Start backend: `cd backend && npm run dev`
2. Open any [.ts](file:///Volumes/Temp%20Drive/Aegis-Context-Broker/backend/src/index.ts) file in VSCode
3. Open the Aegis Vault panel (Cmd+Shift+P → "Aegis: Open Context Vault")
4. Click "Refresh Predictions"
5. Verify the predictions panel shows cards with GitHub PR/Issue badges and real links
6. Click a link — it should open a real GitHub PR or Issue relevant to your open file

