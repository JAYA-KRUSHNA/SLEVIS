// Google Gemini AI Client for SLEVIS
// Used for NLP classification and violation prediction

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

interface GeminiResponse {
    candidates?: Array<{
        content: {
            parts: Array<{ text: string }>;
        };
    }>;
    error?: {
        message: string;
    };
}

export async function callGemini(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [{ text: prompt }],
                },
            ],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1024,
            },
        }),
    });

    const data: GeminiResponse = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini');
    }

    return data.candidates[0].content.parts[0].text;
}

export async function callGeminiVision(prompt: string, imageBase64: string, mimeType: string = 'image/jpeg'): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: imageBase64,
                            },
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2048,
            },
        }),
    });

    const data: GeminiResponse = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini Vision');
    }

    return data.candidates[0].content.parts[0].text;
}

// Complaint Classification Categories
export const COMPLAINT_CATEGORIES = [
    'reckless_driving',
    'signal_jump',
    'no_helmet',
    'wrong_side',
    'overspeeding',
    'parking',
    'noise_pollution',
    'road_rage',
    'drunk_driving',
    'other'
] as const;

export type ComplaintCategory = typeof COMPLAINT_CATEGORIES[number];

export interface ClassificationResult {
    category: ComplaintCategory;
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    keywords: string[];
    summary: string;
}

export interface ViolationPrediction {
    type: string;
    probability: number;
    riskLevel: 'low' | 'medium' | 'high';
}

export interface PredictionResult {
    predictions: ViolationPrediction[];
    overallRisk: 'low' | 'medium' | 'high';
    recommendation: string;
    hotspotAnalysis: string;
    modelUsed?: string;
    confidence?: number;
}
