import * as vscode from "vscode";
import { ContextExtractor } from "../contextExtractor";

jest.useFakeTimers();

describe("ContextExtractor", () => {
    let mockContext: vscode.ExtensionContext;
    let extractor: ContextExtractor;

    beforeEach(() => {
        mockContext = {
            subscriptions: [],
        } as any;

        // Reset any vscode API mocks if needed
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (extractor) {
            extractor.dispose();
        }
        jest.clearAllTimers();
    });

    it("should debounce active text editor changes", () => {
        // Arrange
        const mockCallback = jest.fn();

        // Mock vscode.window.onDidChangeActiveTextEditor to manually trigger it
        let listener: () => void = () => {};
        (vscode.window as any).onDidChangeActiveTextEditor = jest.fn((cb) => {
            listener = cb;
        });

        // Mock getting the active file path to simulate a "change"
        (vscode.window as any).activeTextEditor = {
            document: { uri: { fsPath: "/test/file.ts" } },
        };

        extractor = new ContextExtractor(mockContext);
        extractor.onSnapshotUpdate(mockCallback);

        // First initial check triggers immediately (or after timeout loop starts)
        jest.advanceTimersByTime(2000);
        expect(mockCallback).toHaveBeenCalledTimes(1);

        // Act - Simulate rapid editor switching
        (vscode.window as any).activeTextEditor = {
            document: { uri: { fsPath: "/test/file2.ts" } },
        };
        listener(); // trigger 1
        listener(); // trigger 2
        listener(); // trigger 3

        // Assert - Callback should NOT be called yet due to debounce
        expect(mockCallback).toHaveBeenCalledTimes(1);

        // Act - Wait for debounce timer (2000ms)
        jest.advanceTimersByTime(2000);

        // Assert - Callback should now be called exactly once for the rapid burst
        expect(mockCallback).toHaveBeenCalledTimes(2);
        expect(mockCallback.mock.calls[1][0].activeFile).toBe("/test/file2.ts");
    });
});
