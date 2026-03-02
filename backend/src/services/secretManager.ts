/**
 * ============================================================================
 * File: backend/src/services/secretManager.ts
 * ============================================================================
 * * Objective:
 * A wrapper over Google Secret Manager to securely store and retrieve
 * user-specific OAuth tokens.
 * * Architectural Considerations & Sceptical Analysis:
 * - Direct queries to Secret Manager add latency. We should only retrieve
 *   the token when the backend needs to actually make a 3rd party API call.
 * - Need strict IAM permissions to ensure the Cloud Run service account
 *   is the ONLY entity that can read these secrets.
 * - Sceptical note: Secret names must be deterministic yet cryptographically
 *   tied to the user ID to prevent unauthorized access vectors.
 * * Core Dependencies:
 * - @google-cloud/secret-manager
 * ============================================================================
 */

import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || "aegis-488920";
const client = new SecretManagerServiceClient();

const getSecretName = (userId: string, platform: string): string => {
    const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `projects/${PROJECT_ID}/secrets/user-${cleanUserId}-${platform}-token/versions/latest`;
};

export const storeToken = async (
    userId: string,
    platform: string,
    token: string,
): Promise<void> => {
    const secretId = `user-${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}-${platform}-token`;
    const parent = `projects/${PROJECT_ID}`;

    try {
        try {
            await client.getSecret({ name: `${parent}/secrets/${secretId}` });
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
    const name = getSecretName(userId, platform);
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
