import { NextRequest, NextResponse } from 'next/server';
import { callGemini, PredictionResult, ViolationPrediction } from '@/lib/gemini';

const DL_API_URL = process.env.DL_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
    try {
        const { vehicleType, location, timeOfDay, dayOfWeek } = await request.json();

        // ─── Run BOTH DL and Gemini in parallel ───────────────
        const [dlResult, geminiResult] = await Promise.allSettled([
            fetchDLPrediction(vehicleType, location, timeOfDay, dayOfWeek),
            fetchGeminiPrediction(vehicleType, location, timeOfDay, dayOfWeek),
        ]);

        const dlOk = dlResult.status === 'fulfilled' ? dlResult.value : null;
        const geminiOk = geminiResult.status === 'fulfilled' ? geminiResult.value : null;

        // ─── Best-of selection based on confidence ─────────────
        let bestResult: PredictionResult;

        if (dlOk && geminiOk) {
            // Both succeeded — pick the one with higher confidence
            const dlConfidence = getConfidence(dlOk);
            const geminiConfidence = getConfidence(geminiOk);

            if (dlConfidence >= geminiConfidence) {
                bestResult = { ...dlOk, modelUsed: dlOk.modelUsed || 'DL Ensemble (DNN+LSTM+CNN)' };
            } else {
                bestResult = { ...geminiOk, modelUsed: 'Gemini AI' };
            }
        } else if (dlOk) {
            bestResult = { ...dlOk, modelUsed: dlOk.modelUsed || 'DL Ensemble (DNN+LSTM+CNN)' };
        } else if (geminiOk) {
            bestResult = { ...geminiOk, modelUsed: 'Gemini AI' };
        } else {
            // Both failed — use rule-based fallback
            bestResult = generateFallbackPrediction(vehicleType, location, timeOfDay, dayOfWeek);
            bestResult.modelUsed = 'Rule-Based Fallback';
        }

        return NextResponse.json(bestResult);

    } catch (error: any) {
        console.error('Prediction error:', error);
        const fallback = generateFallbackPrediction('unknown', 'unknown', '12:00', 'monday');
        fallback.modelUsed = 'Rule-Based Fallback';
        return NextResponse.json(fallback);
    }
}


// ─── DL Backend (FastAPI) ─────────────────────────────────────
async function fetchDLPrediction(
    vehicleType: string, location: string, timeOfDay: string, dayOfWeek: string
): Promise<PredictionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
        const res = await fetch(`${DL_API_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vehicleType,
                location,
                timeOfDay,
                dayOfWeek,
                model: 'ensemble',
            }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) throw new Error(`DL API returned ${res.status}`);
        const data = await res.json();

        return {
            predictions: data.predictions,
            overallRisk: data.overallRisk,
            recommendation: data.recommendation,
            hotspotAnalysis: data.hotspotAnalysis,
            modelUsed: data.modelUsed || 'DL Ensemble (DNN+LSTM+CNN)',
            confidence: data.confidence,
        };
    } catch (err) {
        clearTimeout(timeout);
        throw err;
    }
}


// ─── Gemini AI ────────────────────────────────────────────────
async function fetchGeminiPrediction(
    vehicleType: string, location: string, timeOfDay: string, dayOfWeek: string
): Promise<PredictionResult> {
    const prompt = `You are an AI traffic violation prediction system for law enforcement. Based on historical patterns and traffic behavior analysis, predict likely violations.

INPUT DATA:
- Vehicle Type: ${vehicleType || 'unknown'}
- Location: ${location || 'unknown'}
- Time of Day: ${timeOfDay || 'unknown'}
- Day of Week: ${dayOfWeek || 'unknown'}

VIOLATION TYPES TO CONSIDER:
- no_helmet: Two-wheeler riders without helmets
- signal_jump: Running red lights
- overspeeding: Speed limit violations
- wrong_side: Wrong lane/side driving  
- triple_riding: More than 2 people on two-wheeler
- no_seatbelt: Four-wheeler drivers without seatbelt
- using_phone: Driver using mobile phone
- drunk_driving: Intoxicated driving
- overloading: Vehicle exceeding capacity

Based on typical traffic patterns:
- Morning rush (8-10 AM): High signal violations, helmet violations
- Evening rush (5-8 PM): High speeding, signal violations, drunk driving risk increases
- Late night (11 PM - 5 AM): High drunk driving, speeding
- Weekends: More recreational overspeeding, drunk driving
- Near schools/colleges: Helmet violations, triple riding
- Highways: Overspeeding, overloading
- Junctions: Signal violations

Respond ONLY with a valid JSON object (no markdown):
{
    "predictions": [
        { "type": "violation_type", "probability": 0.0-1.0, "riskLevel": "low/medium/high" }
    ],
    "overallRisk": "low/medium/high",
    "recommendation": "Specific patrol recommendation",
    "hotspotAnalysis": "Brief analysis of why this location/time has these risks"
}

Provide 3-5 most likely violations.`;

    const response = await callGemini(prompt);
    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    const result: PredictionResult = JSON.parse(cleanResponse);

    // Validate predictions
    result.predictions = result.predictions.map(p => ({
        ...p,
        probability: Math.min(1, Math.max(0, p.probability))
    }));

    // Calculate confidence for comparison
    const topProbs = result.predictions
        .map(p => p.probability)
        .sort((a, b) => b - a)
        .slice(0, 3);
    result.confidence = topProbs.reduce((a, b) => a + b, 0) / topProbs.length;

    return result;
}


// ─── Confidence Calculator ────────────────────────────────────
function getConfidence(result: PredictionResult): number {
    if (result.confidence !== undefined) return result.confidence;
    const probs = result.predictions
        .map(p => p.probability)
        .sort((a, b) => b - a)
        .slice(0, 3);
    return probs.reduce((a, b) => a + b, 0) / (probs.length || 1);
}


// ─── Rule-based Fallback ──────────────────────────────────────
function generateFallbackPrediction(
    vehicleType: string,
    location: string,
    timeOfDay: string,
    dayOfWeek: string
): PredictionResult {
    const predictions: ViolationPrediction[] = [];
    const locationLower = (location || '').toLowerCase();
    const hour = parseInt(timeOfDay?.split(':')[0] || '12');
    const isWeekend = ['saturday', 'sunday'].includes(dayOfWeek?.toLowerCase());
    const isTwoWheeler = ['two_wheeler', 'bike', 'scooter', 'motorcycle'].includes(vehicleType?.toLowerCase());

    // Time-based predictions
    if (hour >= 17 && hour <= 21) {
        predictions.push({ type: 'signal_jump', probability: 0.72, riskLevel: 'high' });
        predictions.push({ type: 'overspeeding', probability: 0.65, riskLevel: 'medium' });
    } else if (hour >= 22 || hour <= 5) {
        predictions.push({ type: 'drunk_driving', probability: 0.68, riskLevel: 'high' });
        predictions.push({ type: 'overspeeding', probability: 0.75, riskLevel: 'high' });
    } else if (hour >= 8 && hour <= 10) {
        predictions.push({ type: 'signal_jump', probability: 0.70, riskLevel: 'high' });
    }

    // Vehicle type predictions
    if (isTwoWheeler) {
        predictions.push({ type: 'no_helmet', probability: 0.78, riskLevel: 'high' });
        predictions.push({ type: 'triple_riding', probability: 0.45, riskLevel: 'medium' });
    } else {
        predictions.push({ type: 'no_seatbelt', probability: 0.52, riskLevel: 'medium' });
        predictions.push({ type: 'using_phone', probability: 0.48, riskLevel: 'medium' });
    }

    // Location predictions
    if (locationLower.includes('highway') || locationLower.includes('ring road')) {
        predictions.push({ type: 'overspeeding', probability: 0.82, riskLevel: 'high' });
    }
    if (locationLower.includes('junction') || locationLower.includes('signal') || locationLower.includes('crossing')) {
        predictions.push({ type: 'signal_jump', probability: 0.75, riskLevel: 'high' });
    }

    // Weekend adjustment
    if (isWeekend) {
        const drunkIndex = predictions.findIndex(p => p.type === 'drunk_driving');
        if (drunkIndex >= 0) {
            predictions[drunkIndex].probability = Math.min(0.95, predictions[drunkIndex].probability + 0.15);
            predictions[drunkIndex].riskLevel = 'high';
        } else {
            predictions.push({ type: 'drunk_driving', probability: 0.55, riskLevel: 'medium' });
        }
    }

    // Deduplicate and sort
    const uniquePredictions = Array.from(
        new Map(predictions.map(p => [p.type, p])).values()
    ).sort((a, b) => b.probability - a.probability).slice(0, 5);

    const avgProbability = uniquePredictions.reduce((sum, p) => sum + p.probability, 0) / uniquePredictions.length;
    const overallRisk: 'low' | 'medium' | 'high' = avgProbability > 0.65 ? 'high' : avgProbability > 0.45 ? 'medium' : 'low';

    const topViolation = uniquePredictions[0]?.type || 'general violations';
    const recommendations: Record<string, string> = {
        no_helmet: 'Deploy helmet check drive at this location',
        signal_jump: 'Position traffic camera and patrol near signal',
        overspeeding: 'Set up speed trap with radar guns',
        drunk_driving: 'Conduct breathalyzer checkpoints',
        triple_riding: 'Focus on two-wheeler violations at this point',
        default: 'General patrol recommended for this area'
    };

    return {
        predictions: uniquePredictions,
        overallRisk,
        recommendation: recommendations[topViolation] || recommendations.default,
        hotspotAnalysis: `Based on ${isTwoWheeler ? 'two-wheeler' : 'four-wheeler'} traffic patterns at ${timeOfDay} on ${dayOfWeek}${isWeekend ? ' (weekend)' : ''}, this location shows elevated risk for ${topViolation.replace('_', ' ')} violations.`,
        modelUsed: 'Rule-Based Fallback',
    };
}
