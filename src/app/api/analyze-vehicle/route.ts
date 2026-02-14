import { NextRequest, NextResponse } from 'next/server';
import { callGeminiVision } from '@/lib/gemini';

interface DetectedVehicle {
    license_plate: string;
    plate_readable: boolean;
    model: string;
    color: string;
    vehicle_type: string;
    helmet_detected: boolean | null;
    seatbelt_detected: boolean | null;
    violation_type: string;
    violations: string[];
    rider_count: number;
    confidence: number;
    bbox?: number[];
}

const VISION_PROMPT = `You are an expert Indian traffic surveillance AI. Analyze this traffic/road image carefully.

For EACH vehicle visible in the image, detect:
1. **License plate** — read the exact plate text if visible (Indian format like KA-01-AB-1234). If not readable, use "Not readable".
2. **Vehicle type** — one of: 2W (two-wheeler/bike/scooter), CAR (car/SUV/sedan), CV (truck/tempo/pickup), BUS (bus/minibus), AUTO (auto-rickshaw)
3. **Model** — best guess of vehicle make/model (e.g., "Honda Activa", "Maruti Swift", "Tata Truck"). If unsure, give a general description like "White Sedan" or "Red Scooter".
4. **Color** — the vehicle's color
5. **Helmet detected** — for two-wheelers ONLY: is the rider wearing a helmet? (true/false/null). null if not applicable or can't determine.
6. **Seatbelt detected** — for cars ONLY: is the driver wearing a seatbelt? (true/false/null). null if not visible or not applicable.
7. **Violations** — an ARRAY of ALL visible violations for this vehicle. Choose from: "No Helmet", "Triple Riding", "No Seatbelt", "Wrong Side", "Using Phone", "No License Plate", "Overloading", "Signal Jump", "Reckless Driving". Use empty array [] if no violations.
8. **Rider count** — number of people ON or IN the vehicle (riders for bikes, occupants for cars). 0 if can't determine.
9. **Confidence** — how confident you are in this detection (0.0 to 1.0)

IMPORTANT RULES:
- Only report vehicles you can ACTUALLY SEE in the image
- Do NOT invent or fabricate vehicle data
- If you cannot read a number plate, say "Not readable" — NEVER make up a plate number
- If the image has no vehicles, return an empty array
- Be conservative with violations — only flag what you can clearly see
- For two-wheelers with 3+ riders, include BOTH "No Helmet" (if applicable) AND "Triple Riding" in violations
- "violation_type" should be the most severe violation, or "None" if no violations

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{"vehicles": [{"license_plate": "XX-00-XX-0000", "plate_readable": true, "model": "Vehicle Model", "color": "Color", "vehicle_type": "CAR", "helmet_detected": null, "seatbelt_detected": true, "violation_type": "None", "violations": [], "rider_count": 1, "confidence": 0.85}]}`;

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { imageData, mimeType } = body;

    if (!imageData) {
        return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    // Strip data URL prefix if present
    let base64Data = imageData;
    let detectedMime = mimeType || 'image/jpeg';

    if (imageData.startsWith('data:')) {
        const match = imageData.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (match) {
            detectedMime = match[1];
            base64Data = match[2];
        }
    }

    // ─── Strategy 1: Try local YOLO backend FIRST ───
    // YOLOv8 has dedicated motorcycle detection (COCO class 3) and is
    // much more reliable for vehicle type classification than Gemini Vision.
    try {
        const yoloResponse = await fetch('http://localhost:8000/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData }),
            signal: AbortSignal.timeout(30000),
        });

        if (yoloResponse.ok) {
            const yoloData = await yoloResponse.json();
            // Ensure YOLO results have the violations array
            const vehicles = (yoloData.vehicles || []).map((v: any) => ({
                ...v,
                violations: v.violations || (v.violation_type && v.violation_type !== 'None' ? [v.violation_type] : []),
                rider_count: v.rider_count ?? 0,
                seatbelt_detected: v.seatbelt_detected ?? null,
            }));
            return NextResponse.json({
                ...yoloData,
                vehicles,
                analysisSource: 'YOLOv8 + Deep Vision (Local DL)',
                analysisMode: 'yolo',
            });
        }
    } catch (yoloError: any) {
        console.error('YOLO backend not available:', yoloError.message);
    }

    // ─── Strategy 2: Gemini Vision fallback ───
    // Used when YOLO backend is not running
    try {
        const rawResponse = await callGeminiVision(VISION_PROMPT, base64Data, detectedMime);

        let jsonStr = rawResponse.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const parsed: { vehicles: DetectedVehicle[] } = JSON.parse(jsonStr);

        const vehicles = (parsed.vehicles || []).map((v: any) => {
            const violations: string[] = Array.isArray(v.violations) ? v.violations :
                (v.violation_type && v.violation_type !== 'None' ? [v.violation_type] : []);

            return {
                license_plate: v.license_plate || 'Not readable',
                plate_readable: v.plate_readable ?? (v.license_plate && v.license_plate !== 'Not readable'),
                model: v.model || 'Unknown Vehicle',
                color: v.color || 'Unknown',
                vehicle_type: v.vehicle_type || 'CAR',
                helmet_detected: v.helmet_detected ?? null,
                seatbelt_detected: v.seatbelt_detected ?? null,
                violation_type: v.violation_type || (violations.length > 0 ? violations[0] : 'None'),
                violations,
                rider_count: v.rider_count ?? 0,
                confidence: Math.min(1, Math.max(0, v.confidence || 0.5)),
            };
        });

        return NextResponse.json({
            vehicles,
            totalDetected: vehicles.length,
            violationCount: vehicles.filter((v: DetectedVehicle) => v.violations.length > 0).length,
            analysisSource: 'Gemini Vision AI',
            analysisMode: 'gemini',
            warning: 'YOLO backend not running — using Gemini Vision. Start the ML backend for best results: cd ml_backend && python server.py',
        });
    } catch (geminiError: any) {
        console.error('Gemini Vision also failed:', geminiError.message);
    }

    // ─── Strategy 3: Last resort ───
    return NextResponse.json({
        vehicles: [{
            license_plate: 'Not readable',
            plate_readable: false,
            model: 'Vehicle detected',
            color: 'Unknown',
            vehicle_type: 'CAR',
            helmet_detected: null,
            seatbelt_detected: null,
            violation_type: 'None',
            violations: [],
            rider_count: 0,
            confidence: 0.3,
        }],
        totalDetected: 1,
        violationCount: 0,
        analysisSource: 'Fallback',
        analysisMode: 'fallback',
        warning: 'Both YOLO and Gemini unavailable. Start the Python backend: cd ml_backend && python server.py',
    });
}
