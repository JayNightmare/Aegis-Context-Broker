import { generatePredictiveInsights } from "../services/vertexAi";
import { VertexAI } from "@google-cloud/vertexai";

// Mock the Vertex AI module
jest.mock("@google-cloud/vertexai", () => {
    const mockGenerateContent = jest.fn();
    return {
        VertexAI: jest.fn().mockImplementation(() => {
            return {
                preview: {
                    getGenerativeModel: jest.fn().mockReturnValue({
                        generateContent: mockGenerateContent,
                    }),
                },
            };
        }),
    };
});

// Helper to grab the mock to assert against it
const getMockGenerateContent = () => {
    const vertexAIInstance = new VertexAI({
        project: "mock",
        location: "mock",
    });
    const model = vertexAIInstance.preview.getGenerativeModel({
        model: "mock",
    });
    return model.generateContent as jest.Mock;
};

describe("vertexAi Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should successfully parse a valid JSON response from Gemini", async () => {
        const mockPrompt = "Test Prompt";
        const mockResponse = {
            response: {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: '```json\n{"insights": [{"title": "Mock Ticket", "type": "Jira", "confidence": 0.9, "reasoning": "Test"}]}\n```',
                                },
                            ],
                        },
                    },
                ],
            },
        };

        const mockGenerate = getMockGenerateContent();
        mockGenerate.mockResolvedValue(mockResponse);

        const result = await generatePredictiveInsights(mockPrompt);

        expect(result.insights).toBeDefined();
        expect(result.insights[0].title).toBe("Mock Ticket");
        expect(mockGenerate).toHaveBeenCalledWith({
            contents: [{ role: "user", parts: [{ text: mockPrompt }] }],
        });
    });

    it("should throw an error if Vertex returns no candidates", async () => {
        const mockGenerate = getMockGenerateContent();
        mockGenerate.mockResolvedValue({ response: { candidates: [] } });

        await expect(generatePredictiveInsights("Test")).rejects.toThrow(
            "Failed to generate predictive context from AI model.",
        );
    });
});
