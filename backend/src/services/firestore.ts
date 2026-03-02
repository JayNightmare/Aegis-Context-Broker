/**
 * ============================================================================
 * File: backend/src/services/firestore.ts
 * ============================================================================
 * * Objective:
 * Manages interactions with Google Cloud Firestore to persist active developer
 * context snapshots synchronously.
 * * Architectural Considerations & Sceptical Analysis:
 * - Direct database writes for every IDE cursor change is unscalable. The client
 *   MUST debounce heavily.
 * - Firestore is NoSQL; we should structure the document under `users/{userId}/snapshots/latest`
 *   to allow rapid overwrites and retrieval of the most recent known state.
 * * Core Dependencies:
 * - firebase-admin
 * ============================================================================
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin (assuming default application credentials on Cloud Run)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

export interface ContextSnapshotPayload {
    timestamp: number;
    activeFile: string | null;
    activeBranch: string | null;
    workspaceRoot: string | null;
}

export const saveSnapshot = async (
    userId: string,
    snapshot: ContextSnapshotPayload,
): Promise<void> => {
    try {
        const docRef = db
            .collection("users")
            .doc(userId)
            .collection("snapshots")
            .doc("latest");

        // We use set() to completely overwrite the 'latest' document
        await docRef.set({
            ...snapshot,
            serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`[Firestore] Saved latest snapshot for user ${userId}`);
    } catch (error) {
        console.error(
            `[Firestore] Error saving snapshot for user ${userId}:`,
            error,
        );
        throw new Error("Failed to persist state snapshot to database.");
    }
};

export const getLatestSnapshot = async (
    userId: string,
): Promise<ContextSnapshotPayload | null> => {
    try {
        const docRef = db
            .collection("users")
            .doc(userId)
            .collection("snapshots")
            .doc("latest");
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            return docSnap.data() as ContextSnapshotPayload;
        }

        return null;
    } catch (error) {
        console.error(
            `[Firestore] Error retrieving snapshot for user ${userId}:`,
            error,
        );
        return null;
    }
};
