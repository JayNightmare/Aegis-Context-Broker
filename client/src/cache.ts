/**
 * ============================================================================
 * File: client/src/cache.ts
 * ============================================================================
 * * Objective:
 * Provides an encrypted local cache using VSCode's SecretStorage to store
 * non-sensitive (or slightly sensitive) context metadata to avoid redundant
 * cloud round-trips.
 * * Architectural Considerations & Sceptical Analysis:
 * - We are choosing SecretStorage over globalState for defense-in-depth,
 *   layering the OS-level encryption over our stored data.
 * - Sceptical note: SecretStorage access is asynchronous and can be slow.
 *   We should probably maintain an in-memory copy of the cache object that
 *   syncs periodically to disk, rather than awaiting Disk I/O on every
 *   context change.
 * * Core Dependencies:
 * - vscode API
 * ============================================================================
 */

import * as vscode from "vscode";
import { ContextSnapshot } from "./contextExtractor";

export class LocalStateCache {
    private inMemoryCache: ContextSnapshot | null = null;
    private readonly SECRET_KEY = "aegis.lastKnownState";

    constructor(private secretStorage: vscode.SecretStorage) {
        // Hydrate from disk on startup
        this.hydrate();
    }

    private async hydrate() {
        try {
            const stored = await this.secretStorage.get(this.SECRET_KEY);
            if (stored) {
                this.inMemoryCache = JSON.parse(stored) as ContextSnapshot;
                console.log(
                    "Aegis: Hydrated local state cache from encrypted storage.",
                );
            }
        } catch (error) {
            console.error("Aegis: Failed to hydrate cache:", error);
        }
    }

    public async set(snapshot: ContextSnapshot) {
        // Fast sync to memory
        this.inMemoryCache = snapshot;

        // Slow sync to encrypted disk layer (non-blocking)
        try {
            await this.secretStorage.store(
                this.SECRET_KEY,
                JSON.stringify(snapshot),
            );
        } catch (error) {
            console.error("Aegis: Failed to flush cache to disk:", error);
        }
    }

    public get(): ContextSnapshot | null {
        // Extremely fast in-memory read
        return this.inMemoryCache;
    }
}
