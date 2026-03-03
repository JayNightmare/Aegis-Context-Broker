/**
 * ============================================================================
 * File: backend/src/services/secretManager.ts
 * ============================================================================
 * * Objective:
 * A wrapper over Google Secret Manager to securely store and retrieve
 * user-specific OAuth tokens. In local development mode (NODE_ENV=development),
 * an in-memory store is used as a fallback to avoid requiring GCP credentials
 * on the developer's machine.
 * * Architectural Considerations & Sceptical Analysis:
 * - Forward-Thinking: The lazy client instantiation pattern means the server
 *   always starts successfully, and credential errors are deferred until the
 *   first actual vault operation, making them far more debuggable.
 * - Bottlenecks/Latency: Direct queries to Secret Manager add latency. We
 *   should only retrieve the token when the backend actually needs it.
 * - Security: The in-memory store is INTENTIONALLY NOT persistent — it lives
 *   only for the duration of the dev server process. It must never be used in
 *   a production build.
 * - IAM: In production, the Cloud Run service account must be the ONLY entity
 *   with Secret Manager accessor permissions.
 * * Core Dependencies:
 * - @google-cloud/secret-manager
 * ============================================================================
 */

import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || "aegis-488920";
const IS_DEV = process.env.NODE_ENV !== "production";

/** In-memory store used exclusively during local development. */
const localTokenStore = new Map<string, string>();

/** Lazily instantiated to avoid crashing the server on startup if credentials are absent. */
let _client: SecretManagerServiceClient | null = null;
const getClient = (): SecretManagerServiceClient => {
	if (!_client) {
		_client = new SecretManagerServiceClient();
	}
	return _client;
};

const getSecretName = (userId: string, platform: string): string => {
	const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
	return `projects/${PROJECT_ID}/secrets/user-${cleanUserId}-${platform}-token/versions/latest`;
};

const getLocalKey = (userId: string, platform: string): string =>
	`${userId}::${platform}`;

export const storeToken = async (
	userId: string,
	platform: string,
	token: string,
): Promise<void> => {
	if (IS_DEV) {
		const key = getLocalKey(userId, platform);
		localTokenStore.set(key, token);
		console.log(
			`[DEV] Token for user ${userId} / ${platform} stored in local in-memory store.`,
		);
		return;
	}

	const secretId = `user-${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}-${platform}-token`;
	const parent = `projects/${PROJECT_ID}`;
	const client = getClient();

	try {
		try {
			await client.getSecret({
				name: `${parent}/secrets/${secretId}`,
			});
		} catch (e: any) {
			if (e.code === 5 || e.message?.includes("NOT_FOUND")) {
				await client.createSecret({
					parent,
					secretId,
					secret: {
						replication: { automatic: {} },
					},
				});
			} else {
				throw e;
			}
		}

		await client.addSecretVersion({
			parent: `${parent}/secrets/${secretId}`,
			payload: { data: Buffer.from(token, "utf8") },
		});

		console.log(
			`Successfully securely stored token for user ${userId} / ${platform}`,
		);
	} catch (error) {
		console.error("Error storing token in Secret Manager:", error);
		throw new Error("Failed to securely store token.");
	}
};

export const retrieveToken = async (
	userId: string,
	platform: string,
): Promise<string> => {
	if (IS_DEV) {
		const key = getLocalKey(userId, platform);
		const token = localTokenStore.get(key);
		if (!token) {
			throw new Error(
				`[DEV] No local token found for user ${userId} / ${platform}.`,
			);
		}
		console.log(
			`[DEV] Token for user ${userId} / ${platform} retrieved from local in-memory store.`,
		);
		return token;
	}

	const name = getSecretName(userId, platform);
	const client = getClient();

	try {
		const [version] = await client.accessSecretVersion({ name });
		const payload = version.payload?.data?.toString();

		if (!payload) {
			throw new Error("Token payload is empty.");
		}
		return payload;
	} catch (error) {
		console.error(
			`Error retrieving token for user ${userId} / ${platform}:`,
			error,
		);
		throw new Error("Failed to securely retrieve token.");
	}
};
