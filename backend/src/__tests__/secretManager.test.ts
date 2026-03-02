/**
 * ============================================================================
 * File: backend/src/__tests__/secretManager.test.ts
 * ============================================================================
 * * Objective:
 * Integration tests for the Secret Manager wrapper to prove the strict token
 * storage protocol is working correctly via Jest mocking.
 * ============================================================================
 */

const mockAddSecretVersion = jest.fn();
const mockCreateSecret = jest.fn();
const mockGetSecret = jest.fn();
const mockAccessSecretVersion = jest.fn();

jest.mock("@google-cloud/secret-manager", () => {
    return {
        SecretManagerServiceClient: jest.fn().mockImplementation(() => {
            return {
                addSecretVersion: mockAddSecretVersion,
                createSecret: mockCreateSecret,
                getSecret: mockGetSecret,
                accessSecretVersion: mockAccessSecretVersion,
            };
        }),
    };
});

import { storeToken, retrieveToken } from "../services/secretManager";

describe("Google Secret Manager Wrapper", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("stores token successfully and creates secret if not exists", async () => {
        mockGetSecret.mockRejectedValue({ code: 5, message: "NOT_FOUND" });
        mockCreateSecret.mockResolvedValue([{}]);
        mockAddSecretVersion.mockResolvedValue([{}]);

        await storeToken("user_123", "github", "fake_token_value");

        expect(mockCreateSecret).toHaveBeenCalled();
        expect(mockAddSecretVersion).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: { data: Buffer.from("fake_token_value", "utf8") },
            }),
        );
    });

    it("retrieves token successfully", async () => {
        mockAccessSecretVersion.mockResolvedValue([
            {
                payload: { data: Buffer.from("retrieved_fake_token", "utf8") },
            },
        ]);

        const token = await retrieveToken("user_123", "github");
        expect(token).toBe("retrieved_fake_token");
    });
});
