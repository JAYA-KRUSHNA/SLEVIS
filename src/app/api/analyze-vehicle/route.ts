import { NextRequest, NextResponse } from 'next/server';
import { callGeminiVision } from '@/lib/gemini';

interface DetectedVehicle {
    license_plate: string;
    plate_readable: boolean;
    model: string;
    color: string;
    vehicle_type: string; // '2W' | 'CAR' | 'CV' | 'BUS' | 'AUTO'
    helmet_detected: boolean;
    violation_type: string;
    confidence: number;
}

const VISION_PROMPT = `You are an expert Indian traffic surveillance AI. Analyze this traffic/road image carefully.

For EACH vehicle visible in the image, detect:
1. **License plate** — read the exact plate text if visible (Indian format like KA-01-AB-1234). If not readable, use "Not readable".
2. **Vehicle type** — one of: 2W (two-wheeler/bike/scooter), CAR (car/SUV/sedan), CV (truck/tempo/pickup), BUS (bus/minibus), AUTO (auto-rickshaw)
3. **Model** — best guess of vehicle make/model (e.g., "Honda Activa", "Maruti Swift", "Tata Truck"). If unsure, give a general description like "White Sedan" or "Red Scooter".
4. **Color** — the vehicle's color
5. **Helmet detected** — for two-wheelers ONLY: is the rider wearing a helmet? (true/false). For other vehicles, always true.
6. **Violation** — any visible violation: "No Helmet", "Triple Riding", "No Seatbelt", "Wrong Side", "Using Phone", "No License Plate", "Overloading", "Signal Jump", or "None" if no violation visible.
7. **Confidence** — how confident you are in this detection (0.0 to 1.0)

IMPORTANT RULES:
- Only report vehicles you can ACTUALLY SEE in the image
- Do NOT invent or fabricate vehicle data
- If you cannot read a number plate, say "Not readable" — NEVER make up a plate number
- If the image has no vehicles, return an empty array
- Be conservative with violations — only flag what you can clearly see

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{"vehicles": [{"license_plate": "XX-00-XX-0000", "plate_readable": true, "model": "Vehicle Model", "color": "Color", "vehicle_type": "CAR", "helmet_detected": true, "violation_type": "None", "confidence": 0.85}]}`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { imageData, mimeType } = body;

        if (!imageData) {
            return NextResponse.json(
                { error: 'No image data provided' },
                { status: 400 }
            );
        }

        // Strip data URL prefix if present (e.g., "data:image/jpeg;base64,...")
        let base64Data = imageData;
        let detectedMime = mimeType || 'image/jpeg';

        if (imageData.startsWith('data:')) {
            const match = imageData.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            if (match) {
                detectedMime = match[1];
                base64Data = match[2];
            }
        }

        // Call Gemini Vision
        const rawResponse = await callGeminiVision(VISION_PROMPT, base64Data, detectedMime);

        // Parse JSON from response (handle potential markdown wrapping)
        let jsonStr = rawResponse.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        let parsed: { vehicles: DetectedVehicle[] };
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            console.error('Failed to parse Gemini response:', rawResponse);
            return NextResponse.json(
                { error: 'Failed to parse AI response', raw: rawResponse },
                { status: 500 }
            );
        }

        // Validate and clean results
        const vehicles = (parsed.vehicles || []).map((v: any) => ({
            license_plate: v.license_plate || 'Not readable',
            plate_readable: v.plate_readable ?? (v.license_plate && v.license_plate !== 'Not readable'),
            model: v.model || 'Unknown Vehicle',
            color: v.color || 'Unknown',
            vehicle_type: v.vehicle_type || 'CAR',
            helmet_detected: v.helmet_detected ?? true,
            violation_type: v.violation_type || 'None',
            confidence: Math.min(1, Math.max(0, v.confidence || 0.5)),
        }));

        return NextResponse.json({
            vehicles,
            totalDetected: vehicles.length,
            violationCount: vehicles.filter((v: DetectedVehicle) => v.violation_type !== 'None').length,
            analysisSource: 'Gemini Vision AI',
        });

    } catch (error: any) {
        console.error('Vehicle analysis error:', error);
        return NextResponse.json(
            { error: error.message || 'Analysis failed' },
            { status: 500 }
        );
    }
}
