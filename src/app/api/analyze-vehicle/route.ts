import { NextRequest, NextResponse } from 'next/server';
import { callGeminiVision } from '@/lib/gemini';

interface ViolationDetail {
    type: string;
    severity: string;
    fine: number;
    legal_section: string;
    penalty_points: number;
    description: string;
    confidence: number;
}

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
    violation_details: ViolationDetail[];
    total_fine: number;
    total_penalty_points: number;
    max_severity: string;
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
            // Ensure YOLO results have the violations array and new detail fields
            const vehicles = (yoloData.vehicles || []).map((v: any) => ({
                ...v,
                violations: v.violations || (v.violation_type && v.violation_type !== 'None' ? [v.violation_type] : []),
                violation_details: v.violation_details || [],
                total_fine: v.total_fine ?? 0,
                total_penalty_points: v.total_penalty_points ?? 0,
                max_severity: v.max_severity || 'none',
                rider_count: v.rider_count ?? 0,
                seatbelt_detected: v.seatbelt_detected ?? null,
            }));
            return NextResponse.json({
                ...yoloData,
                vehicles,
                riskScore: yoloData.riskScore ?? 0,
                riskLevel: yoloData.riskLevel || 'none',
                totalEstimatedFine: yoloData.totalEstimatedFine ?? 0,
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

        // Indian MV Act violation database for Gemini fallback
        const VIOLATION_FINES: Record<string, { severity: string; fine: number; section: string; points: number; description: string }> = {
            'No Helmet': { severity: 'high', fine: 1000, section: 'Section 129 MV Act', points: 3, description: 'Riding without protective headgear' },
            'Triple Riding': { severity: 'high', fine: 1000, section: 'Section 128 MV Act', points: 3, description: 'More than 2 persons on a two-wheeler' },
            'No Seatbelt': { severity: 'medium', fine: 1000, section: 'Section 194B MV Act', points: 2, description: 'Driving without seatbelt fastened' },
            'Overloading': { severity: 'high', fine: 2000, section: 'Section 194 MV Act', points: 4, description: 'Vehicle exceeding passenger/cargo capacity' },
            'No License Plate': { severity: 'medium', fine: 5000, section: 'Section 192 MV Act', points: 2, description: 'Missing or obscured registration plate' },
            'Using Phone': { severity: 'medium', fine: 5000, section: 'Section 184 MV Act', points: 2, description: 'Using mobile phone while driving' },
            'Wrong Side': { severity: 'high', fine: 5000, section: 'Section 184 MV Act', points: 4, description: 'Driving on wrong side of the road' },
            'Signal Jump': { severity: 'high', fine: 5000, section: 'Section 184 MV Act', points: 4, description: 'Disobeying traffic signal' },
            'Reckless Driving': { severity: 'critical', fine: 5000, section: 'Section 184 MV Act', points: 5, description: 'Driving in a rash or negligent manner' },
        };

        const sevWeights: Record<string, number> = { critical: 1.0, high: 0.75, medium: 0.5, low: 0.25, none: 0 };
        let allViolationsFlat: string[] = [];
        let totalEstimatedFine = 0;

        const vehicles = (parsed.vehicles || []).map((v: any) => {
            const violations: string[] = Array.isArray(v.violations) ? v.violations :
                (v.violation_type && v.violation_type !== 'None' ? [v.violation_type] : []);

            // Build violation_details for Gemini results
            const violation_details: ViolationDetail[] = violations.map((viol: string) => {
                const info = VIOLATION_FINES[viol] || { severity: 'medium', fine: 1000, section: 'MV Act', points: 1, description: viol };
                return {
                    type: viol,
                    severity: info.severity,
                    fine: info.fine,
                    legal_section: info.section,
                    penalty_points: info.points,
                    description: info.description,
                    confidence: Math.min(1, Math.max(0, v.confidence || 0.5)),
                };
            });

            const total_fine = violation_details.reduce((s: number, d: ViolationDetail) => s + d.fine, 0);
            const total_penalty_points = violation_details.reduce((s: number, d: ViolationDetail) => s + d.penalty_points, 0);
            const sevOrder = ['none', 'low', 'medium', 'high', 'critical'];
            let max_severity = 'none';
            for (const d of violation_details) {
                if (sevOrder.indexOf(d.severity) > sevOrder.indexOf(max_severity)) {
                    max_severity = d.severity;
                }
            }

            allViolationsFlat.push(...violations);
            totalEstimatedFine += total_fine;

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
                violation_details,
                total_fine,
                total_penalty_points,
                max_severity,
                rider_count: v.rider_count ?? 0,
                confidence: Math.min(1, Math.max(0, v.confidence || 0.5)),
            };
        });

        // Calculate aggregate risk score
        let totalWeight = 0;
        for (const v of allViolationsFlat) {
            const info = VIOLATION_FINES[v];
            totalWeight += sevWeights[info?.severity || 'medium'] || 0.5;
        }
        const riskScore = Math.min(1, totalWeight / 5);
        const riskLevel = riskScore >= 0.8 ? 'critical' : riskScore >= 0.6 ? 'high' : riskScore >= 0.35 ? 'medium' : riskScore > 0 ? 'low' : 'none';

        return NextResponse.json({
            vehicles,
            totalDetected: vehicles.length,
            violationCount: vehicles.filter((v: DetectedVehicle) => v.violations.length > 0).length,
            riskScore: Math.round(riskScore * 1000) / 1000,
            riskLevel,
            totalEstimatedFine,
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
            violation_details: [],
            total_fine: 0,
            total_penalty_points: 0,
            max_severity: 'none',
            rider_count: 0,
            confidence: 0.3,
        }],
        totalDetected: 1,
        violationCount: 0,
        riskScore: 0,
        riskLevel: 'none',
        totalEstimatedFine: 0,
        analysisSource: 'Fallback',
        analysisMode: 'fallback',
        warning: 'Both YOLO and Gemini unavailable. Start the Python backend: cd ml_backend && python server.py',
    });
}
