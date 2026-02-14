import { NextRequest, NextResponse } from 'next/server';
import { callGemini, ClassificationResult, COMPLAINT_CATEGORIES } from '@/lib/gemini';

export async function POST(request: NextRequest) {
    try {
        const { text } = await request.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid text parameter' },
                { status: 400 }
            );
        }

        // Build the classification prompt
        const prompt = `You are an AI classifier for a traffic violation complaint system. Analyze the following complaint and classify it.

COMPLAINT TEXT:
"${text}"

AVAILABLE CATEGORIES:
- reckless_driving: Dangerous or aggressive driving behavior
- signal_jump: Running red lights or traffic signals
- no_helmet: Rider not wearing helmet
- wrong_side: Driving on wrong side of road or wrong lane
- overspeeding: Excessive speed violations
- parking: Illegal or improper parking
- noise_pollution: Loud vehicle exhaust or horn misuse
- road_rage: Aggressive behavior, threatening other drivers
- drunk_driving: Suspected intoxicated driving
- other: Does not fit any category

Respond ONLY with a valid JSON object in this exact format (no markdown, no code blocks):
{
    "category": "one of the categories above",
    "confidence": 0.0 to 1.0,
    "severity": "low" or "medium" or "high" or "critical",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "summary": "Brief 1-line summary of the complaint"
}`;

        const response = await callGemini(prompt);

        // Parse the JSON response
        let result: ClassificationResult;
        try {
            // Clean up the response (remove any markdown formatting)
            const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
            result = JSON.parse(cleanResponse);

            // Validate category
            if (!COMPLAINT_CATEGORIES.includes(result.category as any)) {
                result.category = 'other';
            }

            // Ensure confidence is between 0 and 1
            result.confidence = Math.min(1, Math.max(0, result.confidence));

        } catch (parseError) {
            // Fallback if parsing fails
            result = {
                category: 'other',
                confidence: 0.5,
                severity: 'medium',
                keywords: text.split(' ').slice(0, 3),
                summary: text.slice(0, 100)
            };
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Classification error:', error);

        // If API key not configured, use fallback classification
        if (error.message?.includes('API_KEY')) {
            const fallbackResult = classifyWithKeywords(await request.clone().json().then(r => r.text));
            return NextResponse.json(fallbackResult);
        }

        return NextResponse.json(
            { error: error.message || 'Classification failed' },
            { status: 500 }
        );
    }
}

// Fallback keyword-based classification when API is unavailable
function classifyWithKeywords(text: string): ClassificationResult {
    const lowerText = text.toLowerCase();

    const patterns: Record<string, { keywords: string[], severity: 'low' | 'medium' | 'high' | 'critical' }> = {
        signal_jump: { keywords: ['signal', 'red light', 'traffic light', 'jumped'], severity: 'high' },
        no_helmet: { keywords: ['helmet', 'no helmet', 'without helmet', 'head'], severity: 'medium' },
        reckless_driving: { keywords: ['reckless', 'dangerous', 'rash', 'speeding fast', 'zig zag'], severity: 'high' },
        overspeeding: { keywords: ['speed', 'fast', 'overspeeding', 'racing'], severity: 'high' },
        wrong_side: { keywords: ['wrong side', 'wrong lane', 'opposite', 'one way'], severity: 'high' },
        parking: { keywords: ['parking', 'parked', 'no parking', 'double park'], severity: 'low' },
        drunk_driving: { keywords: ['drunk', 'alcohol', 'intoxicated', 'drink and drive'], severity: 'critical' },
        road_rage: { keywords: ['fight', 'abuse', 'threatening', 'road rage', 'angry'], severity: 'high' },
        noise_pollution: { keywords: ['noise', 'loud', 'horn', 'silencer', 'exhaust'], severity: 'low' },
    };

    let bestMatch: { category: 'reckless_driving' | 'signal_jump' | 'no_helmet' | 'wrong_side' | 'overspeeding' | 'parking' | 'drunk_driving' | 'road_rage' | 'noise_pollution' | 'other', score: number, severity: 'low' | 'medium' | 'high' | 'critical' } = { category: 'other', score: 0, severity: 'medium' };
    const foundKeywords: string[] = [];

    for (const [category, { keywords, severity }] of Object.entries(patterns)) {
        let score = 0;
        for (const keyword of keywords) {
            if (lowerText.includes(keyword)) {
                score++;
                foundKeywords.push(keyword);
            }
        }
        if (score > bestMatch.score) {
            bestMatch = { category: category as any, score, severity };
        }
    }

    return {
        category: bestMatch.category,
        confidence: Math.min(0.9, 0.5 + bestMatch.score * 0.15),
        severity: bestMatch.severity,
        keywords: foundKeywords.slice(0, 5),
        summary: text.slice(0, 100)
    };
}
