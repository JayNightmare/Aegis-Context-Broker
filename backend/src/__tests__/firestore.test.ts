import { saveSnapshot, getLatestSnapshot } from "../services/firestore";
import * as admin from "firebase-admin";

// Mock Firebase Admin
jest.mock("firebase-admin", () => {
	const setMock = jest.fn();
	const getMock = jest.fn();

	return {
		apps: ["mockApp"],
		initializeApp: jest.fn(),
		firestore: Object.assign(
			jest.fn(() => ({
				collection: jest.fn(() => ({
					doc: jest.fn(() => ({
						collection: jest.fn(() => ({
							doc: jest.fn(() => ({
								set: setMock,
								get: getMock,
							})),
						})),
					})),
				})),
			})),
			{
				FieldValue: {
					serverTimestamp: jest.fn(
						() => "mock-server-timestamp",
					),
				},
			},
		),
	};
});

describe("Firestore Service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should save a context snapshot", async () => {
		const userId = "user-123";
		const snapshot = {
			timestamp: 1678886400000,
			activeFile: "/test/file.ts",
			activeBranch: "main",
			workspaceRoot: "/test",
			openSymbols: ["MyClass"],
			recentFiles: ["/test/other.ts"],
			diagnostics: [],
			repoHint: "owner/repo",
			serverTimestamp: "mock-server-timestamp",
		};

		const db = admin.firestore();
		const setMock = db
			.collection("")
			.doc("")
			.collection("")
			.doc("").set;

		await saveSnapshot(userId, snapshot);

		expect(setMock).toHaveBeenCalledWith(
			expect.objectContaining({
				timestamp: snapshot.timestamp,
				activeFile: snapshot.activeFile,
			}),
		);
	});

	it("should retrieve the latest snapshot", async () => {
		const userId = "user-123";
		const snapshotData = {
			timestamp: 1678886400000,
			activeFile: "/test/file.ts",
			activeBranch: "main",
			workspaceRoot: "/test",
		};

		const db = admin.firestore();
		const getMock = db.collection("").doc("").collection("").doc("")
			.get as jest.Mock;
		getMock.mockResolvedValue({
			exists: true,
			data: () => snapshotData,
		});

		const result = await getLatestSnapshot(userId);

		expect(getMock).toHaveBeenCalled();
		expect(result).toEqual(snapshotData);
	});
});
