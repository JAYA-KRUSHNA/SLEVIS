'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface VehicleRecord {
    licensePlate: string;
    make: string;
    model: string;
    color: string;
    year: number;
    owner: string;
    registrationStatus: 'valid' | 'expired' | 'suspended';
}

interface Violation {
    id: string;
    type: string;
    date: string;
    location: string;
    fine: number;
    status: 'paid' | 'unpaid' | 'disputed';
}

// ─── Comprehensive Indian Vehicle Database ───
// 20 pre-seeded records across Indian states + dynamic generation for unknown plates

const VEHICLE_MAKES: { make: string; models: string[]; }[] = [
    { make: 'Maruti Suzuki', models: ['Swift', 'Baleno', 'Brezza', 'Alto', 'WagonR', 'Ertiga', 'Dzire', 'Ciaz', 'Ignis', 'S-Presso'] },
    { make: 'Hyundai', models: ['Creta', 'Venue', 'i20', 'Verna', 'Tucson', 'Alcazar', 'Grand i10', 'Aura', 'Exter'] },
    { make: 'Tata', models: ['Nexon', 'Punch', 'Harrier', 'Safari', 'Altroz', 'Tigor', 'Tiago', 'Nano'] },
    { make: 'Mahindra', models: ['Thar', 'XUV700', 'Scorpio', 'Bolero', 'XUV300', 'XUV400'] },
    { make: 'Honda', models: ['City', 'Amaze', 'Elevate', 'WR-V'] },
    { make: 'Toyota', models: ['Fortuner', 'Innova Crysta', 'Glanza', 'Urban Cruiser', 'Hilux'] },
    { make: 'Kia', models: ['Seltos', 'Sonet', 'Carens', 'EV6'] },
    { make: 'MG', models: ['Hector', 'Astor', 'ZS EV', 'Comet'] },
    { make: 'Skoda', models: ['Kushaq', 'Slavia', 'Superb'] },
    { make: 'Volkswagen', models: ['Taigun', 'Virtus', 'Tiguan'] },
];
const COLORS = ['White', 'Silver', 'Black', 'Red', 'Blue', 'Grey', 'Brown', 'Beige', 'Green', 'Orange', 'Maroon', 'Yellow'];
const INDIAN_NAMES = [
    'Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Reddy', 'Vikram Singh',
    'Anita Gupta', 'Suresh Nair', 'Deepa Menon', 'Rajesh Verma', 'Kavita Joshi',
    'Arjun Das', 'Meera Iyer', 'Sanjay Rao', 'Pooja Mishra', 'Rohan Desai',
    'Neha Saxena', 'Manish Tiwari', 'Anjali Choudhary', 'Arun Pillai', 'Divya Bhat',
    'Karthik Rajan', 'Swati Kulkarni', 'Nitin Agarwal', 'Rekha Mohapatra', 'Varun Kapoor',
];
const VIOLATION_TYPES = [
    { type: 'No Helmet', fine: 500 }, { type: 'Signal Jump', fine: 1000 },
    { type: 'Wrong Side Driving', fine: 2000 }, { type: 'Overspeeding', fine: 1500 },
    { type: 'No License', fine: 5000 }, { type: 'No Insurance', fine: 2000 },
    { type: 'Triple Riding', fine: 1000 }, { type: 'No Seatbelt', fine: 500 },
    { type: 'Drunk Driving', fine: 10000 }, { type: 'Using Mobile Phone', fine: 1000 },
    { type: 'Illegal Parking', fine: 500 }, { type: 'Lane Violation', fine: 500 },
    { type: 'No PUC Certificate', fine: 1000 }, { type: 'Overloading', fine: 2000 },
    { type: 'Tinted Windows', fine: 1500 }, { type: 'Modified Silencer', fine: 1000 },
];
const LOCATIONS = [
    'MG Road Junction', 'City Center', 'Highway NH-44', 'Ring Road', 'Industrial Zone',
    'Airport Road', 'Railway Station', 'Bus Stand Junction', 'University Gate', 'Market Area',
    'Hospital Road', 'Temple Street', 'IT Park', 'Outer Ring Road', 'Bridge Flyover',
    'Commercial Complex', 'Residential Colony', 'School Zone', 'Highway Toll Plaza', 'Metro Station',
];
const RTO_CODES: Record<string, string> = {
    'KA': 'Karnataka', 'MH': 'Maharashtra', 'DL': 'Delhi', 'TN': 'Tamil Nadu',
    'AP': 'Andhra Pradesh', 'TS': 'Telangana', 'UP': 'Uttar Pradesh', 'GJ': 'Gujarat',
    'RJ': 'Rajasthan', 'KL': 'Kerala', 'WB': 'West Bengal', 'PB': 'Punjab',
    'HR': 'Haryana', 'MP': 'Madhya Pradesh', 'OR': 'Odisha', 'AS': 'Assam',
    'CG': 'Chhattisgarh', 'JH': 'Jharkhand', 'UK': 'Uttarakhand', 'GA': 'Goa',
    'HP': 'Himachal Pradesh', 'JK': 'Jammu & Kashmir', 'BR': 'Bihar', 'CH': 'Chandigarh',
};

// Deterministic seeded random using plate string
function plateHash(plate: string): number {
    let hash = 0;
    for (let i = 0; i < plate.length; i++) {
        hash = ((hash << 5) - hash) + plate.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function generateVehicleData(normalizedPlate: string): { vehicle: VehicleRecord; violations: Violation[] } {
    const h = plateHash(normalizedPlate);
    const makeObj = VEHICLE_MAKES[h % VEHICLE_MAKES.length];
    const model = makeObj.models[(h >> 4) % makeObj.models.length];
    const color = COLORS[(h >> 8) % COLORS.length];
    const year = 2015 + (h % 10);
    const owner = INDIAN_NAMES[(h >> 3) % INDIAN_NAMES.length];
    const regStatuses: ('valid' | 'expired' | 'suspended')[] = ['valid', 'valid', 'valid', 'valid', 'expired', 'suspended'];
    const registrationStatus = regStatuses[h % regStatuses.length];

    // Format plate nicely: KA01AB1234 → KA-01-AB-1234
    const formatted = normalizedPlate.replace(/^([A-Z]{2})(\d{2})([A-Z]{1,3})(\d{1,4})$/, '$1-$2-$3-$4');

    // Generate 0–5 violations deterministically
    const numViolations = h % 6;
    const violations: Violation[] = [];
    for (let i = 0; i < numViolations; i++) {
        const vi = (h + i * 7) % VIOLATION_TYPES.length;
        const vt = VIOLATION_TYPES[vi];
        const month = ((h + i * 3) % 12) + 1;
        const day = ((h + i * 5) % 28) + 1;
        const year2 = 2023 + ((h + i) % 2);
        const statuses: ('paid' | 'unpaid' | 'disputed')[] = ['paid', 'unpaid', 'disputed'];
        violations.push({
            id: `${normalizedPlate}-${i}`,
            type: vt.type,
            date: `${year2}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            location: LOCATIONS[(h + i * 11) % LOCATIONS.length],
            fine: vt.fine,
            status: statuses[(h + i) % 3],
        });
    }

    return {
        vehicle: {
            licensePlate: formatted || normalizedPlate,
            make: makeObj.make,
            model,
            color,
            year,
            owner,
            registrationStatus,
        },
        violations,
    };
}

// Pre-seeded database — 20 plates across Indian states
const SEEDED_PLATES = [
    'KA01AB1234', 'KA02CD5678', 'KA03EF9012', 'KA05MG4521',
    'MH01BX7890', 'MH12AT3456', 'MH04GH6543',
    'DL01CA9999', 'DL08SH2345',
    'TN01AZ7777', 'TN09BD4567',
    'AP09CK1234', 'AP31TA6789',
    'TS08FA3333', 'TS09HB8888',
    'UP16AG5555', 'GJ01JK7890',
    'RJ14SA1111', 'KL07BX4444', 'PB10DK2222',
];
const mockVehicleRecords: Record<string, { vehicle: VehicleRecord; violations: Violation[] }> = {};
SEEDED_PLATES.forEach(plate => { mockVehicleRecords[plate] = generateVehicleData(plate); });

// Status badge colors with gradients
const statusColors = {
    paid: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'rgba(16, 185, 129, 0.3)' },
    unpaid: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30', glow: 'rgba(244, 63, 94, 0.3)' },
    disputed: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'rgba(245, 158, 11, 0.3)' },
    valid: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: '', glow: 'rgba(16, 185, 129, 0.3)' },
    expired: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: '', glow: 'rgba(244, 63, 94, 0.3)' },
    suspended: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: '', glow: 'rgba(245, 158, 11, 0.3)' },
};

// Animated Counter Component
function AnimatedCounter({ value, prefix = '₹' }: { value: number; prefix?: string }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / 800, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(Math.floor(easeOutQuart * value));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value]);

    return <span>{prefix}{displayValue.toLocaleString()}</span>;
}

// Typing Animation Component
function TypingText({ text }: { text: string }) {
    const [displayText, setDisplayText] = useState('');

    useEffect(() => {
        setDisplayText('');
        let index = 0;
        const interval = setInterval(() => {
            if (index < text.length) {
                setDisplayText(text.slice(0, index + 1));
                index++;
            } else {
                clearInterval(interval);
            }
        }, 50);
        return () => clearInterval(interval);
    }, [text]);

    return (
        <span>
            {displayText}
            <motion.span
                className="inline-block w-0.5 h-8 bg-cyan-400 ml-1"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
            />
        </span>
    );
}

// Vehicle Search Component
export default function VehicleSearch() {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [result, setResult] = useState<{ vehicle: VehicleRecord; violations: Violation[] } | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [inputFocused, setInputFocused] = useState(false);

    // Indian license plate format regex: 2 letters + 2 digits + 1-3 letters + 1-4 digits
    const INDIAN_PLATE_REGEX = /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4}$/;

    const handleSearch = async () => {
        if (!query.trim()) return;
        setSearching(true);
        setNotFound(false);
        setResult(null);
        setSuggestions([]);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

        const normalizedQuery = query.replace(/[-\s.]/g, '').toUpperCase();

        // 1) Exact match in database
        if (mockVehicleRecords[normalizedQuery]) {
            setResult(mockVehicleRecords[normalizedQuery]);
            setSearching(false);
            return;
        }

        // 2) Partial / fuzzy match — find plates that START WITH or CONTAIN the query
        const partialMatches = Object.keys(mockVehicleRecords).filter(plate =>
            plate.includes(normalizedQuery) || normalizedQuery.includes(plate.slice(0, normalizedQuery.length))
        );
        if (partialMatches.length === 1) {
            setResult(mockVehicleRecords[partialMatches[0]]);
            setSearching(false);
            return;
        }
        if (partialMatches.length > 1) {
            setSuggestions(partialMatches.slice(0, 5));
        }

        // 3) Valid Indian plate format → generate realistic data dynamically
        if (INDIAN_PLATE_REGEX.test(normalizedQuery)) {
            const stateCode = normalizedQuery.slice(0, 2);
            // Accept any 2-letter state code, even if not in our RTO list
            const generated = generateVehicleData(normalizedQuery);
            mockVehicleRecords[normalizedQuery] = generated; // cache it
            setResult(generated);
            setSearching(false);
            return;
        }

        // 4) Nothing matched and invalid format
        setNotFound(true);
        setSearching(false);
    };

    const totalFines = result?.violations.reduce((sum, v) => sum + v.fine, 0) || 0;
    const unpaidFines = result?.violations.filter(v => v.status === 'unpaid').reduce((sum, v) => sum + v.fine, 0) || 0;

    return (
        <motion.div
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header with floating animation */}
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="text-center mb-12"
            >
                <motion.div
                    className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 mb-6"
                    animate={{
                        y: [0, -8, 0],
                        boxShadow: [
                            "0 0 20px rgba(0, 240, 255, 0.2)",
                            "0 0 40px rgba(0, 240, 255, 0.4)",
                            "0 0 20px rgba(0, 240, 255, 0.2)"
                        ]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                    <motion.span
                        className="text-4xl"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        🔎
                    </motion.span>
                </motion.div>
                <motion.h2
                    className="font-orbitron text-3xl font-bold text-white mb-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    Vehicle Lookup
                </motion.h2>
                <motion.p
                    className="text-gray-500 text-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    Search vehicle records by license plate number
                </motion.p>
            </motion.div>

            {/* Search Box with enhanced animations */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-8 rounded-3xl bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 mb-8 relative overflow-hidden"
            >
                {/* Animated background */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5"
                    animate={{ opacity: inputFocused ? 0.8 : 0.3 }}
                />

                <div className="flex gap-4 relative z-10">
                    <motion.div
                        className="relative flex-1"
                        animate={inputFocused ? { scale: 1.02 } : { scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value.toUpperCase())}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                            placeholder="Enter license plate (e.g., KA-01-AB-1234)"
                            className="w-full bg-gray-800/50 border-2 border-gray-700/50 rounded-2xl px-6 py-4 pl-14 text-lg text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none transition-all font-orbitron tracking-wider"
                            style={{
                                boxShadow: inputFocused ? '0 0 30px rgba(0, 240, 255, 0.2)' : 'none'
                            }}
                        />
                        <motion.div
                            className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 text-xl"
                            animate={inputFocused ? { scale: 1.2, rotate: [0, 15, -15, 0] } : {}}
                            transition={{ duration: 0.5 }}
                        >
                            🔍
                        </motion.div>

                        {/* Input focus glow effect */}
                        <AnimatePresence>
                            {inputFocused && (
                                <motion.div
                                    className="absolute inset-0 rounded-2xl border-2 border-cyan-500/50 pointer-events-none"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.02 }}
                                />
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <motion.button
                        onClick={handleSearch}
                        disabled={searching || !query.trim()}
                        whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)' }}
                        whileTap={{ scale: 0.95 }}
                        className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl font-semibold text-lg text-white disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                    >
                        {/* Shine effect */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                        />

                        <span className="relative z-10">
                            {searching ? (
                                <motion.div
                                    className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                />
                            ) : 'Search'}
                        </span>
                    </motion.button>
                </div>

                {/* Quick Examples with staggered animation */}
                <motion.div
                    className="mt-6 flex items-center justify-center gap-3 relative z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <span className="text-gray-500 text-sm">Try:</span>
                    {['KA-01-AB-1234', 'MH-01-BX-7890', 'DL-01-CA-9999', 'TN-01-AZ-7777', 'TS-08-FA-3333'].map((plate, index) => (
                        <motion.button
                            key={plate}
                            onClick={() => { setQuery(plate); setSuggestions([]); }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + index * 0.1 }}
                            whileHover={{ scale: 1.1, y: -3, backgroundColor: 'rgba(0, 240, 255, 0.1)' }}
                            whileTap={{ scale: 0.95 }}
                            className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl text-xs text-gray-400 hover:text-white transition-all border border-transparent hover:border-cyan-500/30"
                        >
                            {plate}
                        </motion.button>
                    ))}
                </motion.div>
            </motion.div>

            {/* Suggestions */}
            <AnimatePresence>
                {suggestions.length > 0 && !result && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-6 rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-cyan-500/20 mb-6"
                    >
                        <p className="text-gray-400 text-sm mb-3">🔍 Did you mean one of these?</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((plate) => {
                                const formatted = plate.replace(/^([A-Z]{2})(\d{2})([A-Z]{1,3})(\d{1,4})$/, '$1-$2-$3-$4');
                                return (
                                    <motion.button
                                        key={plate}
                                        onClick={() => { setQuery(formatted); setSuggestions([]); setResult(mockVehicleRecords[plate]); setNotFound(false); }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 text-sm hover:bg-cyan-500/20 transition-all"
                                    >
                                        {formatted}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Invalid Format / Not Found */}
            <AnimatePresence>
                {notFound && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: [0, -10, 10, -10, 10, 0] }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ x: { duration: 0.5 } }}
                        className="p-8 rounded-3xl bg-gray-900/50 backdrop-blur-xl border border-amber-500/30 text-center mb-8 relative overflow-hidden"
                    >
                        <motion.div
                            className="absolute inset-0 bg-amber-500/5"
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <motion.div
                            className="text-5xl mb-4 relative z-10"
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 0.5 }}
                        >
                            ⚠️
                        </motion.div>
                        <p className="text-amber-400 text-xl font-semibold relative z-10">Invalid Plate Format</p>
                        <p className="text-gray-500 mt-2 relative z-10">Please enter a valid Indian license plate number</p>
                        <p className="text-gray-600 mt-1 text-sm relative z-10">Format: <span className="text-gray-400 font-mono">XX-00-XX-0000</span> (e.g., KA-01-AB-1234)</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results with enhanced animations */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {/* Vehicle Info Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-8 rounded-3xl bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 mb-8 relative overflow-hidden"
                        >
                            {/* Animated background */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5"
                                animate={{ opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 4, repeat: Infinity }}
                            />

                            <div className="flex items-start justify-between mb-8 relative z-10">
                                <div>
                                    <motion.h3
                                        className="font-orbitron text-4xl font-bold text-white tracking-wider mb-2"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                    >
                                        <TypingText text={result.vehicle.licensePlate} />
                                    </motion.h3>
                                    <motion.p
                                        className="text-gray-400 text-lg"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        {result.vehicle.make} {result.vehicle.model} ({result.vehicle.year})
                                    </motion.p>
                                </div>
                                <motion.span
                                    className={`px-5 py-2 rounded-xl text-sm font-semibold ${statusColors[result.vehicle.registrationStatus].bg} ${statusColors[result.vehicle.registrationStatus].text}`}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", delay: 0.2 }}
                                    whileHover={{ scale: 1.1 }}
                                    style={{ boxShadow: `0 0 20px ${statusColors[result.vehicle.registrationStatus].glow}` }}
                                >
                                    {result.vehicle.registrationStatus.toUpperCase()}
                                </motion.span>
                            </div>

                            <div className="grid grid-cols-4 gap-6 relative z-10">
                                {[
                                    { label: 'Owner', value: result.vehicle.owner, icon: '👤' },
                                    { label: 'Color', value: result.vehicle.color, icon: '🎨' },
                                    { label: 'Total Fines', value: totalFines, icon: '💰', color: 'text-cyan-400', isNumber: true },
                                    { label: 'Unpaid', value: unpaidFines, icon: '⚠️', color: 'text-rose-400', isNumber: true },
                                ].map((item, i) => (
                                    <motion.div
                                        key={item.label}
                                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ delay: 0.2 + i * 0.1, type: "spring" }}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        className="p-5 rounded-2xl bg-gray-800/30 text-center border border-gray-700/30 hover:border-cyan-500/30 transition-all cursor-pointer"
                                    >
                                        <motion.div
                                            className="text-2xl mb-2"
                                            animate={{ y: [0, -3, 0] }}
                                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                                        >
                                            {item.icon}
                                        </motion.div>
                                        <p className={`font-orbitron font-bold text-lg ${item.color || 'text-white'}`}>
                                            {item.isNumber ? <AnimatedCounter value={item.value as number} /> : item.value}
                                        </p>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">{item.label}</p>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Corner decorations */}
                            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-cyan-500/20 rounded-tl-lg" />
                            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-cyan-500/20 rounded-tr-lg" />
                            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-cyan-500/20 rounded-bl-lg" />
                            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-cyan-500/20 rounded-br-lg" />
                        </motion.div>

                        {/* Violations List */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-8 rounded-3xl bg-gray-900/50 backdrop-blur-xl border border-gray-800/50"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <motion.h4
                                    className="font-orbitron text-lg text-white flex items-center gap-2"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                    <motion.span
                                        animate={{ rotate: [0, 10, -10, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        ⚠️
                                    </motion.span>
                                    Violation History ({result.violations.length})
                                </motion.h4>
                                <div className="flex gap-3">
                                    <motion.button
                                        className="px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-sm font-medium text-cyan-400 transition-all flex items-center gap-2"
                                        whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)' }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <motion.span animate={{ y: [0, -2, 0] }} transition={{ duration: 1, repeat: Infinity }}>📤</motion.span>
                                        Export
                                    </motion.button>
                                    <motion.button
                                        className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-sm font-medium text-rose-400 transition-all flex items-center gap-2"
                                        whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(244, 63, 94, 0.3)' }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>🚨</motion.span>
                                        Flag
                                    </motion.button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {result.violations.map((violation, index) => (
                                    <motion.div
                                        key={violation.id}
                                        initial={{ opacity: 0, x: -30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
                                        whileHover={{ scale: 1.02, x: 5, backgroundColor: 'rgba(31, 41, 55, 0.5)' }}
                                        className="flex items-center justify-between p-5 rounded-2xl bg-gray-800/30 hover:bg-gray-800/50 transition-all cursor-pointer border border-transparent hover:border-gray-700/50"
                                    >
                                        <div className="flex items-center gap-5">
                                            <motion.div
                                                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-2xl"
                                                whileHover={{ rotate: [0, -10, 10, 0] }}
                                                transition={{ duration: 0.5 }}
                                            >
                                                ❌
                                            </motion.div>
                                            <div>
                                                <p className="text-white font-semibold text-lg">{violation.type}</p>
                                                <p className="text-gray-500">{violation.location} • {violation.date}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <motion.p
                                                className="font-orbitron font-bold text-xl text-white"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.5 + index * 0.1 }}
                                            >
                                                ₹{violation.fine.toLocaleString()}
                                            </motion.p>
                                            <motion.span
                                                className={`px-4 py-1.5 rounded-lg text-sm font-semibold border ${statusColors[violation.status].bg} ${statusColors[violation.status].text} ${statusColors[violation.status].border}`}
                                                whileHover={{ scale: 1.1 }}
                                                animate={violation.status === 'unpaid' ? {
                                                    boxShadow: [
                                                        `0 0 5px ${statusColors[violation.status].glow}`,
                                                        `0 0 15px ${statusColors[violation.status].glow}`,
                                                        `0 0 5px ${statusColors[violation.status].glow}`
                                                    ]
                                                } : {}}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                            >
                                                {violation.status.toUpperCase()}
                                            </motion.span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State with floating animation */}
            {!result && !notFound && !searching && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20"
                >
                    <motion.div
                        className="text-8xl mb-6"
                        animate={{
                            y: [0, -15, 0],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                        🚗
                    </motion.div>
                    <motion.p
                        className="text-gray-400 text-xl"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        Enter a license plate number to search
                    </motion.p>
                    <motion.p
                        className="text-gray-600 mt-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        View vehicle details and violation history
                    </motion.p>
                </motion.div>
            )}
        </motion.div>
    );
}
