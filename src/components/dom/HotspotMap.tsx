'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Hotspot data type
interface Hotspot {
    id: string;
    name: string;
    lat: number;
    lng: number;
    violations: number;
    riskLevel: 'high' | 'medium' | 'low';
    topViolations: string[];
}

// Sample hotspot data for demonstration
const sampleHotspots: Hotspot[] = [
    { id: '1', name: 'MG Road Junction', lat: 12.9716, lng: 77.5946, violations: 45, riskLevel: 'high', topViolations: ['Signal Jump', 'No Helmet'] },
    { id: '2', name: 'Highway NH-44', lat: 12.9352, lng: 77.6245, violations: 38, riskLevel: 'high', topViolations: ['Overspeeding', 'Wrong Side'] },
    { id: '3', name: 'City Center Mall', lat: 12.9783, lng: 77.6408, violations: 22, riskLevel: 'medium', topViolations: ['Illegal Parking', 'No Helmet'] },
    { id: '4', name: 'Railway Station Area', lat: 12.9766, lng: 77.5713, violations: 18, riskLevel: 'medium', topViolations: ['Triple Riding', 'No Helmet'] },
    { id: '5', name: 'Industrial Zone', lat: 12.9545, lng: 77.5501, violations: 12, riskLevel: 'low', topViolations: ['Overloading', 'No Permit'] },
    { id: '6', name: 'University Road', lat: 12.9867, lng: 77.5951, violations: 8, riskLevel: 'low', topViolations: ['Wrong Side', 'Phone Usage'] },
];

// Risk level colors with glow effects
const riskColors = {
    high: {
        bg: 'bg-rose-500',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        glow: 'rgba(244, 63, 94, 0.5)',
        gradient: 'from-rose-500 to-red-600'
    },
    medium: {
        bg: 'bg-amber-500',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        glow: 'rgba(245, 158, 11, 0.5)',
        gradient: 'from-amber-500 to-orange-600'
    },
    low: {
        bg: 'bg-emerald-500',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        glow: 'rgba(16, 185, 129, 0.5)',
        gradient: 'from-emerald-500 to-green-600'
    },
};

// Animated Counter Component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(Math.floor(easeOutQuart * value));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <span>{displayValue}</span>;
}

// Radar Sweep Animation Component
function RadarSweep() {
    return (
        <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
                background: 'conic-gradient(from 0deg, transparent 0deg, rgba(0, 240, 255, 0.1) 30deg, transparent 60deg)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
    );
}

// Hotspot Marker with pulsing animation
function HotspotMarker({
    hotspot,
    position,
    isActive,
    onClick,
    onHoverStart,
    onHoverEnd
}: {
    hotspot: Hotspot;
    position: { x: number; y: number };
    isActive: boolean;
    onClick: () => void;
    onHoverStart: () => void;
    onHoverEnd: () => void;
}) {
    const colors = riskColors[hotspot.riskLevel];

    return (
        <motion.div
            className="absolute cursor-pointer z-10"
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            onClick={onClick}
            onMouseEnter={onHoverStart}
            onMouseLeave={onHoverEnd}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
                type: "spring",
                stiffness: 200,
                delay: Math.random() * 0.3
            }}
        >
            {/* Outer pulse ring */}
            <motion.div
                className={`absolute rounded-full ${colors.bg}`}
                style={{
                    width: 50,
                    height: 50,
                    marginLeft: -25,
                    marginTop: -25,
                    opacity: 0.2
                }}
                animate={{
                    scale: [1, 2, 1],
                    opacity: [0.3, 0, 0.3]
                }}
                transition={{
                    duration: hotspot.riskLevel === 'high' ? 1.5 : 2.5,
                    repeat: Infinity,
                    ease: "easeOut"
                }}
            />

            {/* Middle pulse ring */}
            <motion.div
                className={`absolute rounded-full ${colors.bg}`}
                style={{
                    width: 35,
                    height: 35,
                    marginLeft: -17.5,
                    marginTop: -17.5,
                    opacity: 0.3
                }}
                animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.4, 0.1, 0.4]
                }}
                transition={{
                    duration: hotspot.riskLevel === 'high' ? 1 : 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2
                }}
            />

            {/* Glow effect */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    width: 24,
                    height: 24,
                    marginLeft: -12,
                    marginTop: -12,
                    boxShadow: `0 0 ${isActive ? '20px' : '10px'} ${colors.glow}`
                }}
                animate={isActive ? {
                    boxShadow: [
                        `0 0 10px ${colors.glow}`,
                        `0 0 25px ${colors.glow}`,
                        `0 0 10px ${colors.glow}`
                    ]
                } : {}}
                transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
            />

            {/* Marker dot */}
            <motion.div
                className={`relative w-4 h-4 rounded-full bg-gradient-to-br ${colors.gradient} shadow-lg border-2 border-white/50`}
                style={{ marginLeft: -8, marginTop: -8 }}
                whileHover={{ scale: 1.5 }}
                animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5, repeat: isActive ? Infinity : 0 }}
            />

            {/* Violation count badge */}
            <motion.div
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 }}
            >
                <span className="text-[10px] font-bold text-white">{hotspot.violations}</span>
            </motion.div>

            {/* Tooltip */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        className="absolute left-1/2 -translate-x-1/2 -top-20 bg-gray-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl px-4 py-3 whitespace-nowrap z-20 shadow-2xl"
                        style={{ boxShadow: `0 0 20px ${colors.glow}` }}
                    >
                        <p className="text-sm font-medium text-white">{hotspot.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-lg font-orbitron font-bold ${colors.text}`}>{hotspot.violations}</span>
                            <span className="text-xs text-gray-400">violations</span>
                        </div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-cyan-500/30" />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Hotspot Card Component with enhanced animations
function HotspotCard({ hotspot, isSelected, onClick, index }: { hotspot: Hotspot; isSelected: boolean; onClick: () => void; index: number }) {
    const colors = riskColors[hotspot.riskLevel];

    return (
        <motion.div
            onClick={onClick}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            className={`relative p-4 rounded-xl cursor-pointer transition-all border overflow-hidden ${isSelected
                ? 'bg-cyan-500/10 border-cyan-500/40'
                : 'bg-gray-900/40 border-gray-800/50 hover:border-gray-700/50'
                }`}
        >
            {/* Animated background gradient */}
            <motion.div
                className={`absolute inset-0 bg-gradient-to-r ${colors.gradient} opacity-0`}
                whileHover={{ opacity: 0.05 }}
                transition={{ duration: 0.3 }}
            />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white text-sm truncate flex-1">{hotspot.name}</h4>
                    <motion.span
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${colors.bg} bg-opacity-20 ${colors.text}`}
                        whileHover={{ scale: 1.1 }}
                    >
                        {hotspot.riskLevel.toUpperCase()}
                    </motion.span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <motion.span
                            className="font-orbitron text-lg font-bold text-white"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            {hotspot.violations}
                        </motion.span>
                        <span>violations</span>
                    </div>

                    {/* Progress bar showing relative violations */}
                    <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                            className={`h-full bg-gradient-to-r ${colors.gradient}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(hotspot.violations / 50) * 100}%` }}
                            transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                        />
                    </div>
                </div>
            </div>

            {/* Selection indicator */}
            {isSelected && (
                <motion.div
                    className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-500"
                    layoutId="selectedIndicator"
                />
            )}
        </motion.div>
    );
}

// Main HotspotMap Component
export default function HotspotMap() {
    const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
    const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);

    useEffect(() => {
        // Simulate map loading
        const timer = setTimeout(() => setIsMapLoaded(true), 500);
        return () => clearTimeout(timer);
    }, []);

    // Calculate position for hotspots on the static map visual
    const getHotspotPosition = (hotspot: Hotspot) => {
        const minLat = 12.93, maxLat = 12.99;
        const minLng = 77.55, maxLng = 77.65;
        const x = ((hotspot.lng - minLng) / (maxLng - minLng)) * 100;
        const y = ((maxLat - hotspot.lat) / (maxLat - minLat)) * 100;
        return { x: Math.min(85, Math.max(15, x)), y: Math.min(85, Math.max(15, y)) };
    };

    const totalViolations = sampleHotspots.reduce((sum, h) => sum + h.violations, 0);
    const highRiskCount = sampleHotspots.filter(h => h.riskLevel === 'high').length;

    return (
        <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Header with animated stats */}
            <motion.div
                className="flex items-center justify-between"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <motion.h2
                        className="font-orbitron text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <motion.span
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            🗺️
                        </motion.span>
                        Violation Hotspots
                    </motion.h2>
                    <motion.p
                        className="text-gray-500 text-sm mt-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Real-time violation density map
                    </motion.p>
                </div>
                <div className="flex items-center gap-6">
                    <motion.div
                        className="text-right"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ scale: 1.05 }}
                    >
                        <p className="font-orbitron text-2xl font-bold text-cyan-400">
                            <AnimatedCounter value={totalViolations} />
                        </p>
                        <p className="text-xs text-gray-500">Total Violations</p>
                    </motion.div>
                    <motion.div
                        className="text-right"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        whileHover={{ scale: 1.05 }}
                    >
                        <p className="font-orbitron text-2xl font-bold text-rose-400">
                            <AnimatedCounter value={highRiskCount} />
                        </p>
                        <p className="text-xs text-gray-500">High Risk Zones</p>
                    </motion.div>
                </div>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Map Visualization */}
                <div className="lg:col-span-2">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 100 }}
                        className="relative h-96 rounded-2xl overflow-hidden bg-gray-900/60 backdrop-blur-xl border border-gray-800/50"
                    >
                        {/* Radar sweep effect */}
                        {isMapLoaded && <RadarSweep />}

                        {/* Grid overlay for map effect */}
                        <motion.div
                            className="absolute inset-0 opacity-20"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.2 }}
                            transition={{ delay: 0.3 }}
                            style={{
                                backgroundImage: `
                                    linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px),
                                    linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)
                                `,
                                backgroundSize: '30px 30px',
                            }}
                        />

                        {/* Animated scanning line */}
                        <motion.div
                            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                            animate={{ top: ['0%', '100%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />

                        {/* Hotspot markers */}
                        {isMapLoaded && sampleHotspots.map((hotspot) => {
                            const pos = getHotspotPosition(hotspot);
                            const isActive = selectedHotspot?.id === hotspot.id || hoveredHotspot === hotspot.id;

                            return (
                                <HotspotMarker
                                    key={hotspot.id}
                                    hotspot={hotspot}
                                    position={pos}
                                    isActive={isActive}
                                    onClick={() => setSelectedHotspot(hotspot)}
                                    onHoverStart={() => setHoveredHotspot(hotspot.id)}
                                    onHoverEnd={() => setHoveredHotspot(null)}
                                />
                            );
                        })}

                        {/* Legend with animation */}
                        <motion.div
                            className="absolute bottom-4 left-4 flex items-center gap-4 bg-gray-900/90 backdrop-blur-xl rounded-xl px-4 py-2.5 border border-gray-800/50"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            {['high', 'medium', 'low'].map((level, i) => (
                                <motion.div
                                    key={level}
                                    className="flex items-center gap-2"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 + i * 0.1 }}
                                    whileHover={{ scale: 1.1 }}
                                >
                                    <motion.div
                                        className={`w-3 h-3 rounded-full ${riskColors[level as keyof typeof riskColors].bg}`}
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                                    />
                                    <span className="text-xs text-gray-400 capitalize">{level}</span>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Live indicator */}
                        <motion.div
                            className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-xl rounded-lg px-3 py-1.5 border border-cyan-500/30 flex items-center gap-2"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <motion.div
                                className="w-2 h-2 rounded-full bg-cyan-400"
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <p className="text-xs text-cyan-400 font-orbitron">LIVE VIEW</p>
                        </motion.div>

                        {/* Corner decorations */}
                        <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-cyan-500/30 rounded-tl-lg" />
                        <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-cyan-500/30 rounded-tr-lg" />
                        <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-cyan-500/30 rounded-bl-lg" />
                        <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-cyan-500/30 rounded-br-lg" />
                    </motion.div>
                </div>

                {/* Hotspot List */}
                <div className="space-y-3">
                    <motion.h3
                        className="font-orbitron text-sm text-gray-400 uppercase tracking-wider flex items-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        >
                            📍
                        </motion.span>
                        Top Hotspots
                    </motion.h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                        {sampleHotspots
                            .sort((a, b) => b.violations - a.violations)
                            .map((hotspot, index) => (
                                <HotspotCard
                                    key={hotspot.id}
                                    hotspot={hotspot}
                                    isSelected={selectedHotspot?.id === hotspot.id}
                                    onClick={() => setSelectedHotspot(hotspot)}
                                    index={index}
                                />
                            ))}
                    </div>
                </div>
            </div>

            {/* Selected Hotspot Details */}
            <AnimatePresence>
                {selectedHotspot && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 100 }}
                        className="p-6 rounded-2xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50 relative overflow-hidden"
                    >
                        {/* Animated background gradient */}
                        <motion.div
                            className={`absolute inset-0 bg-gradient-to-r ${riskColors[selectedHotspot.riskLevel].gradient} opacity-5`}
                            animate={{ opacity: [0.03, 0.08, 0.03] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        />

                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <motion.h3
                                        className="font-orbitron text-lg font-bold text-white"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                    >
                                        {selectedHotspot.name}
                                    </motion.h3>
                                    <motion.p
                                        className="text-sm text-gray-400"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        Coordinates: {selectedHotspot.lat.toFixed(4)}, {selectedHotspot.lng.toFixed(4)}
                                    </motion.p>
                                </div>
                                <motion.button
                                    onClick={() => setSelectedHotspot(null)}
                                    className="w-8 h-8 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 flex items-center justify-center transition-all"
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    ✕
                                </motion.button>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                {[
                                    { label: 'Total Violations', value: selectedHotspot.violations, color: 'text-cyan-400' },
                                    { label: 'Risk Level', value: selectedHotspot.riskLevel.toUpperCase(), color: riskColors[selectedHotspot.riskLevel].text },
                                ].map((item, i) => (
                                    <motion.div
                                        key={item.label}
                                        className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 + i * 0.1 }}
                                        whileHover={{ scale: 1.02, borderColor: 'rgba(0, 240, 255, 0.3)' }}
                                    >
                                        <p className={`text-3xl font-orbitron font-bold ${item.color}`}>
                                            {typeof item.value === 'number' ? <AnimatedCounter value={item.value} /> : item.value}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                                    </motion.div>
                                ))}
                                <motion.div
                                    className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <div className="flex flex-wrap gap-1">
                                        {selectedHotspot.topViolations.map((v, i) => (
                                            <motion.span
                                                key={i}
                                                className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-300"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.4 + i * 0.1 }}
                                                whileHover={{ scale: 1.1, backgroundColor: 'rgba(0, 240, 255, 0.2)' }}
                                            >
                                                {v}
                                            </motion.span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Top Violations</p>
                                </motion.div>
                            </div>

                            <div className="flex gap-3">
                                <motion.button
                                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 font-medium hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-2"
                                    whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)' }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <motion.span
                                        animate={{ y: [0, -3, 0] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    >
                                        📍
                                    </motion.span>
                                    Deploy Patrol
                                </motion.button>
                                <motion.button
                                    className="flex-1 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl text-purple-400 font-medium hover:bg-purple-500/30 transition-all flex items-center justify-center gap-2"
                                    whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)' }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <motion.span
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        📊
                                    </motion.span>
                                    View Analytics
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
