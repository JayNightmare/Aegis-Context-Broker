/**
 * ============================================================================
 * File: backend/src/services/githubAuth.ts
 * ============================================================================
 * * Objective:
 * Service responsible for completing the OAuth exchange with GitHub and 
 * saving the resulting token to the vault.
 * * Architectural Considerations & Sceptical Analysis:
 * - Sceptical note: The GitHub Client Secret must never be hardcoded or logged.
 *   It should be injected as an environment variable in Cloud Run.
 * - If the token exchange fails, we must bubble up a clean error to the UI
 *   without exposing the GitHub API error details.
 * * Core Dependencies:
 * - secretManager (Internal secure storage)
 * ============================================================================
 */

import { storeToken } from './secretManager';

export const exchangeGitHubCodeForToken = async (userId: string, authCode: string): Promise<boolean> => {
  try {
    console.log(`[GitHub Auth Service] Exchanging mock code ${authCode} for token...`);
    
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockAccessToken = `gho_${Math.random().toString(36).substring(2, 15)}mock`;

    await storeToken(userId, 'github', mockAccessToken);

    console.log(`[GitHub Auth Service] Successfully exchanged and stored token.`);
    return true;
  } catch (error) {
    console.error('[GitHub Auth Service] Token exchange failed:', error);
    return false;
  }
};
