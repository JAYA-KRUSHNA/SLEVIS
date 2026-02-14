'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore, useStatsStore } from '@/hooks/useStore';
import { supabase, Vehicle } from '@/lib/supabase';
import { ToastProvider, useToast } from './Toast';
import { StatsGridSkeleton, VehicleListSkeleton, ChartSkeleton } from './Skeleton';
import HotspotMap from './HotspotMap';
import AdvancedCharts from './AdvancedCharts';
import VehicleSearch from './VehicleSearch';
import ExportPanel from './ExportPanel';

// Animated Background Particles
function ParticleBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-cyan-500/30 rounded-full"
                    initial={{
                        x: Math.random() * window.innerWidth,
                        y: Math.random() * window.innerHeight,
                    }}
                    animate={{
                        x: Math.random() * window.innerWidth,
                        y: Math.random() * window.innerHeight,
                    }}
                    transition={{
                        duration: 10 + Math.random() * 10,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'linear',
                    }}
                />
            ))}
        </div>
    );
}

// Animated Grid Background
function GridBackground() {
    return (
        <div
            className="fixed inset-0 pointer-events-none opacity-5"
            style={{
                backgroundImage: `
                    linear-gradient(rgba(0, 240, 255, 0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 240, 255, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
            }}
        />
    );
}

// Icons
const IconDashboard = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
);

const IconScan = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
);

const IconReport = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const IconMail = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const IconAdmin = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const IconProfile = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const IconLogout = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

const IconPredict = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

const IconUpload = () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const IconMenu = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const IconClose = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const IconMap = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
);

const IconChart = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
);

const IconVehicleSearch = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11l-3 3m0 0l2 2m-2-2l-2 2m2-2l3 3" />
    </svg>
);

const IconExport = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const IconUsers = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

// Glass Card Component
const GlassCard = ({ children, className = '', delay = 0, glow = 'cyan' }: { children: React.ReactNode; className?: string; delay?: number; glow?: 'cyan' | 'pink' | 'purple' }) => {
    const glowColors = {
        cyan: 'shadow-cyan-500/10 hover:shadow-cyan-500/20 border-cyan-500/20 hover:border-cyan-500/40',
        pink: 'shadow-pink-500/10 hover:shadow-pink-500/20 border-pink-500/20 hover:border-pink-500/40',
        purple: 'shadow-purple-500/10 hover:shadow-purple-500/20 border-purple-500/20 hover:border-purple-500/40',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay, ease: 'easeOut' }}
            className={`
                backdrop-blur-xl bg-gray-900/40 rounded-2xl border shadow-2xl
                transition-all duration-300 ${glowColors[glow]} ${className}
            `}
        >
            {children}
        </motion.div>
    );
};

// Stat Card with Animation
const StatCard = ({ label, value, change, icon, delay = 0 }: { label: string; value: string; change: string; icon: React.ReactNode; delay?: number }) => (
    <GlassCard delay={delay} className="p-5">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{label}</p>
                <motion.p
                    className="font-orbitron text-3xl font-bold text-white"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: delay + 0.2 }}
                >
                    {value}
                </motion.p>
                <p className={`text-sm mt-1 ${change.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {change} this week
                </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-cyan-400">
                {icon}
            </div>
        </div>
    </GlassCard>
);

// Multi-Vehicle Analysis Panel
function VehicleAnalysis() {
    const [image, setImage] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState('');
    const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
    const [analyzing, setAnalyzing] = useState(false);
    const [results, setResults] = useState<Partial<Vehicle>[]>([]);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setImage(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setImage(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const loadImageFromUrl = () => {
        if (!imageUrl.trim()) {
            setError('Please enter a valid image URL');
            return;
        }
        setError('');
        setImage(imageUrl);
        setResults([]);
    };

    const analyzeImage = async () => {
        setAnalyzing(true);
        setError('');
        setProgress(0);

        // Animated progress
        const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + Math.random() * 15, 95));
        }, 200);

        await new Promise((resolve) => setTimeout(resolve, 3000));
        clearInterval(progressInterval);
        setProgress(100);

        // Generate multiple vehicles (5-12 for 75%+ detection rate)
        const vehicleCount = Math.floor(Math.random() * 8) + 5;
        const mockResults: Partial<Vehicle>[] = [];

        // Mixed vehicle types including cars, bikes, trucks, autos
        const vehicleCategories = [
            // Two-wheelers (bikes/scooters)
            { type: '2W', models: ['Honda Activa', 'Royal Enfield Classic 350', 'TVS Jupiter', 'Bajaj Pulsar NS200', 'Hero Splendor Plus', 'Yamaha FZ-S', 'KTM Duke 390', 'Suzuki Access 125', 'Ola S1 Pro', 'Ather 450X'] },
            // Cars
            { type: 'CAR', models: ['Maruti Swift Dzire', 'Hyundai i20', 'Toyota Innova Crysta', 'Honda City', 'Tata Nexon', 'Mahindra XUV700', 'Kia Seltos', 'MG Hector', 'Volkswagen Polo', 'Skoda Slavia'] },
            // Commercial vehicles
            { type: 'CV', models: ['Tata Ace', 'Mahindra Bolero Pickup', 'Ashok Leyland Truck', 'Eicher Truck', 'TATA 407', 'Force Tempo', 'Bajaj RE Auto', 'Piaggio Ape', 'Mahindra Treo', 'TVS King'] },
            // Buses
            { type: 'BUS', models: ['KSRTC Bus', 'BMTC Bus', 'Volvo Bus', 'Ashok Leyland Bus', 'Tata Starbus', 'Force Traveller'] },
        ];

        const colors = ['Midnight Black', 'Racing Red', 'Royal Blue', 'Pearl White', 'Metallic Silver', 'Sunset Orange', 'Graphite Grey', 'Forest Green', 'Champagne Gold', 'Electric Blue'];
        const states = ['KA', 'MH', 'TN', 'DL', 'GJ', 'RJ', 'AP', 'TS', 'UP', 'KL'];

        // Violation types for different vehicle categories
        const violationTypes = {
            '2W': ['No Helmet', 'Triple Riding', 'No License Plate', 'Wrong Side', 'No Side Mirror'],
            'CAR': ['No Seatbelt', 'Using Phone', 'No License Plate', 'Tinted Glass', 'Wrong Parking'],
            'CV': ['Overloading', 'No Permit', 'Expired Fitness', 'No Reflectors', 'Wrong Lane'],
            'BUS': ['Overcrowding', 'Speed Violation', 'Improper Stop', 'Expired Permit', 'Safety Violation'],
        };

        for (let i = 0; i < vehicleCount; i++) {
            // Random vehicle category
            const category = vehicleCategories[Math.floor(Math.random() * vehicleCategories.length)];
            const model = category.models[Math.floor(Math.random() * category.models.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const state = states[Math.floor(Math.random() * states.length)];

            // 60% chance of no violation
            const hasViolation = Math.random() > 0.6;
            const categoryViolations = violationTypes[category.type as keyof typeof violationTypes];
            const violation = hasViolation ? categoryViolations[Math.floor(Math.random() * categoryViolations.length)] : 'None';

            mockResults.push({
                license_plate: `${state}-${Math.floor(Math.random() * 99).toString().padStart(2, '0')}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(1000 + Math.random() * 9000)}`,
                model: model,
                color: color,
                helmet_detected: category.type === '2W' ? violation !== 'No Helmet' : true,
                violation_type: violation,
            });
        }

        await new Promise(r => setTimeout(r, 300));
        setResults(mockResults);
        setAnalyzing(false);
    };

    const resetAnalysis = () => {
        setImage(null);
        setImageUrl('');
        setResults([]);
        setError('');
        setProgress(0);
    };

    const violationCount = results.filter(r => r.violation_type !== 'None').length;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="font-orbitron text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        Vehicle Detection
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">AI-powered multi-vehicle analysis</p>
                </div>
                {results.length > 0 && (
                    <motion.button
                        onClick={resetAnalysis}
                        className="px-4 py-2 rounded-lg bg-gray-800/50 text-cyan-400 hover:bg-gray-700/50 transition-all text-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        ← New Scan
                    </motion.button>
                )}
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
                {['upload', 'url'].map((mode) => (
                    <motion.button
                        key={mode}
                        onClick={() => { setInputMode(mode as 'upload' | 'url'); resetAnalysis(); }}
                        className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${inputMode === mode
                            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'text-gray-400 hover:bg-gray-800/50 border border-transparent'
                            }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {mode === 'upload' ? '📁 Upload File' : '🔗 Image URL'}
                    </motion.button>
                ))}
            </div>

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="mb-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* URL Input */}
            {inputMode === 'url' && !image && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <label className="block text-sm text-gray-400 mb-3">Enter image URL from the internet</label>
                    <div className="flex gap-3">
                        <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadImageFromUrl()}
                            placeholder="https://example.com/traffic.jpg"
                            className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-all"
                        />
                        <motion.button
                            onClick={loadImageFromUrl}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold text-white"
                            whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)' }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Load
                        </motion.button>
                    </div>
                </motion.div>
            )}

            {/* Upload Zone */}
            {inputMode === 'upload' && !image && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => document.getElementById('file-input')?.click()}
                    className="flex-1 border-2 border-dashed border-gray-700 hover:border-cyan-500/50 rounded-2xl p-12 text-center transition-all cursor-pointer bg-gray-900/20 hover:bg-gray-900/40 group"
                >
                    <input type="file" id="file-input" className="hidden" accept="image/*" onChange={handleFileSelect} />
                    <motion.div
                        className="text-gray-600 group-hover:text-cyan-400 mx-auto w-fit mb-6 transition-colors"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <IconUpload />
                    </motion.div>
                    <p className="text-gray-400 mb-2 text-lg">Drop image here or click to upload</p>
                    <p className="text-gray-600 text-sm">AI will detect ALL vehicles in the image</p>
                </motion.div>
            )}

            {/* Image Preview & Analysis */}
            {image && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <GlassCard className="p-4 mb-4 relative overflow-hidden">
                        <img
                            src={image}
                            alt="Traffic"
                            className="max-h-52 mx-auto rounded-xl object-contain"
                            onError={() => {
                                setError('Failed to load image');
                                setImage(null);
                            }}
                        />

                        {/* Analysis Overlay */}
                        <AnimatePresence>
                            {analyzing && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl"
                                >
                                    <motion.div
                                        className="w-20 h-20 rounded-full border-4 border-cyan-500/30 border-t-cyan-400"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    />
                                    <p className="text-cyan-400 font-orbitron mt-4 text-lg">SCANNING</p>

                                    {/* Progress Bar */}
                                    <div className="w-48 h-1 bg-gray-800 rounded-full mt-4 overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-gray-500 text-xs mt-2">{Math.round(progress)}% Complete</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </GlassCard>

                    {!analyzing && results.length === 0 && (
                        <motion.button
                            onClick={analyzeImage}
                            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-orbitron font-semibold text-white text-lg"
                            whileHover={{ scale: 1.01, boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)' }}
                            whileTap={{ scale: 0.99 }}
                        >
                            🔍 ANALYZE ALL VEHICLES
                        </motion.button>
                    )}

                    {/* Results */}
                    {results.length > 0 && (
                        <motion.div
                            className="flex-1 overflow-y-auto space-y-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            {/* Summary */}
                            <GlassCard className="p-4" delay={0.1}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <motion.p
                                                className="font-orbitron text-4xl font-bold text-cyan-400"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: 'spring', delay: 0.2 }}
                                            >
                                                {results.length}
                                            </motion.p>
                                            <p className="text-xs text-gray-500 mt-1">DETECTED</p>
                                        </div>
                                        <div className="w-px h-12 bg-gray-700" />
                                        <div className="text-center">
                                            <motion.p
                                                className={`font-orbitron text-4xl font-bold ${violationCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: 'spring', delay: 0.3 }}
                                            >
                                                {violationCount}
                                            </motion.p>
                                            <p className="text-xs text-gray-500 mt-1">VIOLATIONS</p>
                                        </div>
                                    </div>
                                    {violationCount > 0 && (
                                        <motion.span
                                            className="px-4 py-2 bg-rose-500/20 text-rose-400 rounded-full text-sm font-semibold"
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            ⚠ ACTION REQUIRED
                                        </motion.span>
                                    )}
                                </div>
                            </GlassCard>

                            {/* Vehicle Cards */}
                            {results.map((result, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 + index * 0.1 }}
                                >
                                    <GlassCard
                                        className={`p-4 ${result.violation_type !== 'None' ? 'border-rose-500/30' : ''}`}
                                        glow={result.violation_type !== 'None' ? 'pink' : 'cyan'}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-orbitron font-bold ${result.violation_type !== 'None'
                                                    ? 'bg-gradient-to-br from-rose-500/30 to-orange-500/30 text-rose-400'
                                                    : 'bg-gradient-to-br from-cyan-500/30 to-blue-500/30 text-cyan-400'
                                                    }`}>
                                                    #{index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-orbitron text-lg text-white">{result.license_plate}</p>
                                                    <p className="text-sm text-gray-400">{result.model} • {result.color}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${result.helmet_detected
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-rose-500/20 text-rose-400'
                                                    }`}>
                                                    {result.helmet_detected ? '✓ Helmet OK' : '✕ No Helmet'}
                                                </span>
                                            </div>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </div>
            )}
        </div>
    );
}

// Analytics Panel with Charts (Admin Only)
function AnalyticsPanel() {
    const { totalScans, totalViolations, totalComplaints, resolvedComplaints } = useStatsStore();

    const stats = [
        { label: 'Total Scans', value: totalScans.toLocaleString(), change: '+12%', icon: <IconScan /> },
        { label: 'Violations', value: totalViolations.toLocaleString(), change: '+8%', icon: <IconReport /> },
        { label: 'Complaints', value: totalComplaints.toLocaleString(), change: '+5%', icon: <IconMail /> },
        { label: 'Resolved', value: resolvedComplaints.toLocaleString(), change: '+15%', icon: <IconDashboard /> },
    ];

    const chartData = [65, 40, 80, 55, 90, 45, 70];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-orbitron text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    Analytics Overview
                </h2>
                <p className="text-gray-500 text-sm mt-1">Real-time traffic monitoring statistics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <StatCard key={stat.label} {...stat} delay={i * 0.1} />
                ))}
            </div>

            {/* Chart */}
            <GlassCard className="p-6" delay={0.4}>
                <h3 className="font-orbitron text-sm text-gray-400 mb-6">VIOLATION TRENDS</h3>
                <div className="flex items-end justify-between h-40 gap-3">
                    {chartData.map((height, i) => (
                        <motion.div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-cyan-500/20 to-cyan-400 rounded-t-lg relative group"
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
                        >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 px-2 py-1 rounded text-xs">
                                {height}
                            </div>
                        </motion.div>
                    ))}
                </div>
                <div className="flex justify-between mt-4 text-xs text-gray-500">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <span key={day}>{day}</span>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
}

// Complaint Form with AI Auto-Classification
function ComplaintForm() {
    const { incrementComplaints } = useStatsStore();
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // AI Classification state
    const [aiClassifying, setAiClassifying] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<{
        category: string;
        confidence: number;
        severity: string;
        keywords: string[];
        summary: string;
    } | null>(null);

    // Debounced AI classification
    useEffect(() => {
        if (description.length < 20) {
            setAiSuggestion(null);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setAiClassifying(true);
            try {
                const response = await fetch('/api/classify-complaint', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: description }),
                });
                const data = await response.json();
                if (!data.error) {
                    setAiSuggestion(data);
                    // Auto-select category if confidence is high
                    if (data.confidence > 0.7 && !category) {
                        setCategory(data.category);
                    }
                }
            } catch (err) {
                console.error('Classification error:', err);
            }
            setAiClassifying(false);
        }, 800); // Debounce 800ms

        return () => clearTimeout(timeoutId);
    }, [description, category]);

    const handleSubmit = async () => {
        if (!description || !category) return;
        setSubmitting(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setSubmitting(false);
        setSubmitted(true);
        incrementComplaints();
        setDescription('');
        setCategory('');
        setAiSuggestion(null);
        setTimeout(() => setSubmitted(false), 3000);
    };

    const severityColors: Record<string, string> = {
        low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        critical: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    };

    const categoryLabels: Record<string, string> = {
        reckless_driving: 'Reckless Driving',
        signal_jump: 'Signal Jump',
        no_helmet: 'No Helmet',
        wrong_side: 'Wrong Side',
        overspeeding: 'Overspeeding',
        parking: 'Illegal Parking',
        noise_pollution: 'Noise Pollution',
        road_rage: 'Road Rage',
        drunk_driving: 'Drunk Driving',
        other: 'Other',
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-orbitron text-2xl font-bold bg-gradient-to-r from-pink-400 to-rose-500 bg-clip-text text-transparent">
                    Submit Report
                </h2>
                <p className="text-gray-500 text-sm mt-1">AI-powered complaint classification</p>
            </div>

            <AnimatePresence>
                {submitted && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -20, height: 0 }}
                        className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"
                    >
                        <p className="text-emerald-400 font-medium">✓ Report submitted successfully</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <GlassCard className="p-6 space-y-6" delay={0.1} glow="pink">
                {/* Description with AI Analysis */}
                <div>
                    <label className="block text-sm text-gray-400 mb-3">
                        Describe the Incident
                        {aiClassifying && (
                            <span className="ml-2 text-cyan-400">
                                <motion.span
                                    animate={{ opacity: [1, 0.3, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                    🤖 AI analyzing...
                                </motion.span>
                            </span>
                        )}
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what happened... (AI will auto-classify)"
                        rows={5}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none transition-all resize-none"
                    />
                    <p className="text-xs text-gray-600 mt-1">Type at least 20 characters for AI classification</p>
                </div>

                {/* AI Suggestion Card */}
                <AnimatePresence>
                    {aiSuggestion && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-cyan-400 text-sm font-medium">🤖 AI Classification</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${severityColors[aiSuggestion.severity]}`}>
                                        {aiSuggestion.severity.toUpperCase()}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {Math.round(aiSuggestion.confidence * 100)}% confidence
                                </span>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm text-gray-400">Detected:</span>
                                <motion.button
                                    onClick={() => setCategory(aiSuggestion.category)}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${category === aiSuggestion.category
                                        ? 'bg-cyan-500 text-white'
                                        : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                                        }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {categoryLabels[aiSuggestion.category] || aiSuggestion.category}
                                </motion.button>
                            </div>

                            {aiSuggestion.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {aiSuggestion.keywords.map((kw, i) => (
                                        <span key={i} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Category Dropdown */}
                <div>
                    <label className="block text-sm text-gray-400 mb-3">Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:border-pink-500 focus:outline-none transition-all appearance-none cursor-pointer"
                    >
                        <option value="">Select category...</option>
                        <option value="reckless_driving">Reckless Driving</option>
                        <option value="signal_jump">Signal Jump</option>
                        <option value="no_helmet">No Helmet</option>
                        <option value="wrong_side">Wrong Side Driving</option>
                        <option value="overspeeding">Overspeeding</option>
                        <option value="parking">Illegal Parking</option>
                        <option value="noise_pollution">Noise Pollution</option>
                        <option value="road_rage">Road Rage</option>
                        <option value="drunk_driving">Drunk Driving</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <motion.button
                    onClick={handleSubmit}
                    disabled={submitting || !description || !category}
                    className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: submitting ? 1 : 1.01 }}
                    whileTap={{ scale: submitting ? 1 : 0.99 }}
                >
                    {submitting ? (
                        <motion.div
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                    ) : 'Submit Report'}
                </motion.button>
            </GlassCard>
        </div>
    );
}

// Inbox Panel - Shows messages from admins for users, complaints for admins
function InboxPanel() {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Mock messages from admins (for regular users)
    const [messages, setMessages] = useState([
        { id: '1', from_admin_email: 'admin@slevis.gov', subject: 'Welcome to SLEVIS', content: 'Thank you for registering! Your account has been verified and you now have full access to the platform.', is_read: false, created_at: '2h ago' },
        { id: '2', from_admin_email: 'support@slevis.gov', subject: 'Account Verification Complete', content: 'Your submitted documents have been verified. You can now submit complaints and view your report history.', is_read: true, created_at: '1d ago' },
        { id: '3', from_admin_email: 'admin@slevis.gov', subject: 'Report Status Update', content: 'Your complaint #1234 has been resolved. The violator has been issued a challan of ₹500.', is_read: true, created_at: '3d ago' },
    ]);

    // Mock complaints (for admins)
    const complaints = [
        { id: '1', user: 'user123', description: 'Vehicle parked in no parking zone near MG Road junction...', status: 'pending', date: '2h ago' },
        { id: '2', user: 'citizen_x', description: 'Reckless driving on highway, bike without number plate...', status: 'resolved', date: '1d ago' },
        { id: '3', user: 'reporter42', description: 'Signal jump near main junction, caught on dash cam...', status: 'pending', date: '3d ago' },
    ];

    const unreadCount = messages.filter(m => !m.is_read).length;

    const markAsRead = (id: string) => {
        setMessages(messages.map(m => m.id === id ? { ...m, is_read: true } : m));
    };

    const handleMessageClick = (id: string) => {
        if (selectedId === id) {
            setSelectedId(null);
        } else {
            setSelectedId(id);
            if (!isAdmin) {
                markAsRead(id);
            }
        }
    };

    // User view - messages from admins
    if (!isAdmin) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-orbitron text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Inbox
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">{messages.length} messages</p>
                    </div>
                    {unreadCount > 0 && (
                        <motion.span
                            className="px-3 py-1.5 bg-rose-500/20 text-rose-400 rounded-full text-sm font-medium"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            {unreadCount} unread
                        </motion.span>
                    )}
                </div>

                <div className="space-y-3">
                    {messages.map((m, i) => (
                        <GlassCard
                            key={m.id}
                            className={`p-4 cursor-pointer ${selectedId === m.id ? 'ring-1 ring-cyan-500/50' : ''} ${!m.is_read ? 'border-l-4 border-l-cyan-400' : ''}`}
                            delay={i * 0.1}
                        >
                            <div onClick={() => handleMessageClick(m.id)}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-3">
                                        {!m.is_read && (
                                            <span className="w-2 h-2 mt-2 bg-cyan-400 rounded-full flex-shrink-0" />
                                        )}
                                        <div>
                                            <p className={`font-medium ${m.is_read ? 'text-gray-400' : 'text-white'}`}>{m.subject}</p>
                                            <p className="text-xs text-cyan-400/70 mt-0.5">From: {m.from_admin_email}</p>
                                            <p className="text-gray-500 text-sm mt-1 line-clamp-1">{m.content}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-600 flex-shrink-0">{m.created_at}</span>
                                </div>
                            </div>
                            <AnimatePresence>
                                {selectedId === m.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-4 mt-4 border-t border-gray-800">
                                            <p className="text-gray-300 text-sm">{m.content}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </GlassCard>
                    ))}
                </div>
            </div>
        );
    }

    // Admin view - complaints
    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-orbitron text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    Inbox
                </h2>
                <p className="text-gray-500 text-sm mt-1">{complaints.length} complaints</p>
            </div>

            <div className="space-y-3">
                {complaints.map((c, i) => (
                    <GlassCard
                        key={c.id}
                        className={`p-4 cursor-pointer ${selectedId === c.id ? 'ring-1 ring-cyan-500/50' : ''}`}
                        delay={i * 0.1}
                    >
                        <div onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-cyan-400">{c.user}</p>
                                    <p className="text-gray-400 text-sm mt-1 line-clamp-1">{c.description}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-2 py-1 rounded text-xs ${c.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                                        }`}>
                                        {c.status}
                                    </span>
                                    <p className="text-xs text-gray-600 mt-1">{c.date}</p>
                                </div>
                            </div>
                        </div>
                        <AnimatePresence>
                            {selectedId === c.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-4 mt-4 border-t border-gray-800">
                                        <p className="text-gray-300 text-sm mb-4">{c.description}</p>
                                        <motion.button
                                            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition-all"
                                            whileHover={{ scale: 1.02 }}
                                        >
                                            Reply
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
}

// Violation Predictor Panel (Admin Only)
function ViolationPredictor() {
    const [vehicleType, setVehicleType] = useState('two_wheeler');
    const [location, setLocation] = useState('');
    const [timeOfDay, setTimeOfDay] = useState('');
    const [dayOfWeek, setDayOfWeek] = useState('monday');
    const [predicting, setPredicting] = useState(false);
    const [result, setResult] = useState<{
        predictions: Array<{ type: string; probability: number; riskLevel: string }>;
        overallRisk: string;
        recommendation: string;
        hotspotAnalysis: string;
        modelUsed?: string;
        confidence?: number;
    } | null>(null);

    const handlePredict = async () => {
        if (!location) return;
        setPredicting(true);

        try {
            const response = await fetch('/api/predict-violation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vehicleType,
                    location,
                    timeOfDay: timeOfDay || new Date().toTimeString().slice(0, 5),
                    dayOfWeek,
                }),
            });
            const data = await response.json();
            setResult(data);
        } catch (err) {
            console.error('Prediction error:', err);
        }

        setPredicting(false);
    };

    const riskColors: Record<string, string> = {
        low: 'from-emerald-500 to-green-600',
        medium: 'from-amber-500 to-yellow-600',
        high: 'from-rose-500 to-red-600',
    };

    const riskBgColors: Record<string, string> = {
        low: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        medium: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        high: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    };

    const violationLabels: Record<string, string> = {
        no_helmet: '🪖 No Helmet',
        signal_jump: '🚦 Signal Jump',
        overspeeding: '💨 Overspeeding',
        wrong_side: '↩️ Wrong Side',
        triple_riding: '👥 Triple Riding',
        no_seatbelt: '🔒 No Seatbelt',
        using_phone: '📱 Phone Usage',
        drunk_driving: '🍺 Drunk Driving',
        overloading: '📦 Overloading',
    };

    const vehicleTypes = [
        { id: 'two_wheeler', emoji: '🏍️', label: 'Two Wheeler' },
        { id: 'four_wheeler', emoji: '🚗', label: 'Four Wheeler' },
        { id: 'auto_rickshaw', emoji: '🛺', label: 'Auto' },
        { id: 'commercial', emoji: '🚛', label: 'Commercial' },
    ];

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-6">
                    <span className="text-4xl">🔮</span>
                </div>
                <h2 className="font-orbitron text-3xl font-bold text-white mb-3">Violation Predictor</h2>
                <p className="text-gray-500 text-lg">AI-powered risk analysis for traffic violations</p>
            </motion.div>

            {/* Vehicle Type Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-6 text-center">Vehicle Type</h3>
                <div className="grid grid-cols-4 gap-6">
                    {vehicleTypes.map((vt) => (
                        <motion.button
                            key={vt.id}
                            onClick={() => setVehicleType(vt.id)}
                            whileHover={{ scale: 1.03, y: -4 }}
                            whileTap={{ scale: 0.97 }}
                            className={`p-6 rounded-3xl border-2 transition-all duration-300 ${vehicleType === vt.id
                                ? 'border-amber-500/50 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                                : 'border-gray-700/50 bg-gray-900/40 hover:border-gray-600/50'
                                }`}
                        >
                            <div className="text-4xl mb-3">{vt.emoji}</div>
                            <p className={`text-sm font-semibold ${vehicleType === vt.id ? 'text-white' : 'text-gray-400'}`}>
                                {vt.label}
                            </p>
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            {/* Location & Time Row */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid lg:grid-cols-3 gap-8"
            >
                {/* Location */}
                <div className="lg:col-span-2 p-8 rounded-3xl bg-gray-900/50 backdrop-blur-xl border border-gray-800/50">
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-3 block">📍 Location</label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g., MG Road Junction, Highway 44..."
                        className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-700 text-white text-lg placeholder-gray-600 focus:border-amber-500 focus:outline-none transition-all"
                    />
                </div>

                {/* Time */}
                <div className="p-8 rounded-3xl bg-gray-900/50 backdrop-blur-xl border border-gray-800/50">
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-3 block">⏰ Time</label>
                    <input
                        type="time"
                        value={timeOfDay}
                        onChange={(e) => setTimeOfDay(e.target.value)}
                        className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-700 text-white text-lg focus:border-amber-500 focus:outline-none transition-all"
                    />
                </div>
            </motion.div>

            {/* Day Selector */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-8 rounded-3xl bg-gray-900/50 backdrop-blur-xl border border-gray-800/50"
            >
                <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-6">📅 Day of Week</h3>
                <div className="flex justify-between gap-4">
                    {days.map((day) => (
                        <button
                            key={day}
                            onClick={() => setDayOfWeek(day)}
                            className={`flex-1 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 ${dayOfWeek === day
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                                : 'bg-gray-800/50 text-gray-500 hover:text-white hover:bg-gray-700/50'
                                }`}
                        >
                            {day.slice(0, 3).toUpperCase()}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Predict Button */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={handlePredict}
                disabled={predicting || !location}
                whileHover={{ scale: predicting || !location ? 1 : 1.01 }}
                whileTap={{ scale: predicting || !location ? 1 : 0.99 }}
                className="w-full p-6 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 font-semibold text-white text-xl disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
            >
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
                <div className="relative flex items-center justify-center gap-4">
                    {predicting ? (
                        <>
                            <motion.div
                                className="w-7 h-7 border-3 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                            <span>Analyzing...</span>
                        </>
                    ) : (
                        <>
                            <span className="text-3xl">🔮</span>
                            <span>Generate Prediction</span>
                        </>
                    )}
                </div>
            </motion.button>

            {/* Results */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {/* Overall Risk Card */}
                        <div className={`p-8 rounded-3xl border-2 mb-8 ${riskBgColors[result.overallRisk]}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-70 mb-2">Overall Risk Level</p>
                                    <p className="font-orbitron text-4xl font-bold uppercase">
                                        {result.overallRisk}
                                    </p>
                                </div>
                                <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${riskColors[result.overallRisk]} flex items-center justify-center`}>
                                    <span className="text-5xl">
                                        {result.overallRisk === 'high' ? '🚨' : result.overallRisk === 'medium' ? '⚠️' : '✅'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Model Source Badge */}
                        {result.modelUsed && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center justify-center gap-3 mb-8"
                            >
                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${result.modelUsed.includes('DL') || result.modelUsed.includes('Ensemble')
                                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                                        : result.modelUsed.includes('Gemini')
                                            ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                                            : 'bg-gray-500/15 border-gray-500/40 text-gray-400'
                                    }`}>
                                    <span className="relative flex h-2 w-2">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${result.modelUsed.includes('DL') || result.modelUsed.includes('Ensemble') ? 'bg-purple-400' :
                                                result.modelUsed.includes('Gemini') ? 'bg-blue-400' : 'bg-gray-400'
                                            }`}></span>
                                        <span className={`relative inline-flex rounded-full h-2 w-2 ${result.modelUsed.includes('DL') || result.modelUsed.includes('Ensemble') ? 'bg-purple-500' :
                                                result.modelUsed.includes('Gemini') ? 'bg-blue-500' : 'bg-gray-500'
                                            }`}></span>
                                    </span>
                                    <span>Powered by {result.modelUsed}</span>
                                    {result.confidence !== undefined && (
                                        <span className="opacity-70">• {Math.round(result.confidence * 100)}% confidence</span>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Predictions Grid */}
                        <div className="p-8 rounded-3xl bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 mb-8">
                            <h4 className="text-sm text-gray-400 uppercase tracking-wider mb-6">Predicted Violations</h4>
                            <div className="space-y-5">
                                {result.predictions.map((pred, i) => (
                                    <motion.div
                                        key={pred.type}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-semibold text-lg">
                                                {violationLabels[pred.type] || pred.type}
                                            </span>
                                            <span className={`text-lg font-bold ${pred.riskLevel === 'high' ? 'text-rose-400' :
                                                pred.riskLevel === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                                                }`}>
                                                {Math.round(pred.probability * 100)}%
                                            </span>
                                        </div>
                                        <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                                            <motion.div
                                                className={`h-full rounded-full bg-gradient-to-r ${riskColors[pred.riskLevel]}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pred.probability * 100}%` }}
                                                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Recommendation */}
                        <div className="p-8 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                            <div className="flex items-start gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-3xl flex-shrink-0">
                                    💡
                                </div>
                                <div>
                                    <p className="text-cyan-400 font-semibold text-lg mb-2">Recommendation</p>
                                    <p className="text-white text-lg">{result.recommendation}</p>
                                    <p className="text-gray-500 mt-3">{result.hotspotAnalysis}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State */}
            {!result && !predicting && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 text-gray-600"
                >
                    <p className="text-lg">Enter location and parameters above to generate a prediction</p>
                </motion.div>
            )}
        </div>
    );
}

// Avatar gradient presets — 16 premium gradients
const AVATAR_GRADIENTS = [
    { id: 0, from: 'from-cyan-400', to: 'to-blue-600', label: 'Arctic' },
    { id: 1, from: 'from-violet-500', to: 'to-purple-700', label: 'Nebula' },
    { id: 2, from: 'from-rose-400', to: 'to-pink-600', label: 'Blossom' },
    { id: 3, from: 'from-amber-400', to: 'to-orange-600', label: 'Sunset' },
    { id: 4, from: 'from-emerald-400', to: 'to-teal-600', label: 'Jade' },
    { id: 5, from: 'from-fuchsia-500', to: 'to-pink-700', label: 'Magenta' },
    { id: 6, from: 'from-sky-400', to: 'to-indigo-600', label: 'Ocean' },
    { id: 7, from: 'from-red-500', to: 'to-orange-600', label: 'Lava' },
    { id: 8, from: 'from-lime-400', to: 'to-emerald-600', label: 'Forest' },
    { id: 9, from: 'from-indigo-400', to: 'to-violet-700', label: 'Galaxy' },
    { id: 10, from: 'from-yellow-400', to: 'to-red-500', label: 'Solar' },
    { id: 11, from: 'from-teal-400', to: 'to-cyan-600', label: 'Lagoon' },
    { id: 12, from: 'from-pink-400', to: 'to-rose-600', label: 'Rose' },
    { id: 13, from: 'from-blue-400', to: 'to-purple-600', label: 'Cosmic' },
    { id: 14, from: 'from-orange-400', to: 'to-amber-700', label: 'Honey' },
    { id: 15, from: 'from-slate-400', to: 'to-zinc-600', label: 'Steel' },
];

// 36 diverse avatar emojis across categories
const AVATAR_EMOJIS = [
    '👤', '😎', '🤓', '😈', '👻', '💀',
    '🦊', '🐱', '🐸', '🦁', '🐼', '🦄',
    '🐲', '🦅', '🐺', '🦋', '🐙', '🦖',
    '🤖', '👾', '🎭', '🥷', '🧙', '🦸',
    '🌟', '💎', '🔥', '⚡', '🌊', '❄️',
    '🎯', '🚀', '🛡️', '⚔️', '🎮', '🏆',
];

function getAvatarGradient(index: number) {
    return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
}

// Profile Panel - Available to ALL users — fullscreen two-column layout
function ProfilePanel() {
    const { user, setUser } = useAuthStore();
    const [username, setUsername] = useState(user?.username || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [selectedGradient, setSelectedGradient] = useState(0);
    const [selectedEmoji, setSelectedEmoji] = useState('');
    const [savingAvatar, setSavingAvatar] = useState(false);
    const [activeTab, setActiveTab] = useState<'avatar' | 'account' | 'security'>('avatar');

    const currentGradient = getAvatarGradient(selectedGradient);

    const handleUpdateUsername = async () => {
        if (!username.trim() || username.trim().length < 2) {
            setError('Username must be at least 2 characters');
            return;
        }
        if (username.trim() === user?.username) return;

        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update-username', userId: user?.id, username: username.trim() }),
            });
            const result = await res.json();
            if (!res.ok) {
                setError(result.error || 'Failed to update username');
            } else {
                setUser({ ...user!, username: username.trim() });
                setSuccess('Username updated!');
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: any) {
            setError(err.message);
        }
        setSaving(false);
    };

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setChangingPassword(true);
        setError('');
        try {
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'change-password', userId: user?.id, password: newPassword }),
            });
            const result = await res.json();
            if (!res.ok) {
                setError(result.error || 'Failed to change password');
            } else {
                setSuccess('Password changed successfully!');
                setNewPassword('');
                setConfirmPassword('');
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: any) {
            setError(err.message);
        }
        setChangingPassword(false);
    };

    const handleSaveAvatar = async () => {
        setSavingAvatar(true);
        setError('');
        try {
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update-avatar', userId: user?.id, avatarGradient: selectedGradient, avatarEmoji: selectedEmoji }),
            });
            const result = await res.json();
            if (!res.ok) {
                setError(result.error || 'Failed to update avatar');
            } else {
                setSuccess('Avatar updated!');
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: any) {
            setError(err.message);
        }
        setSavingAvatar(false);
    };

    const roleBadge = user?.role === 'super_admin'
        ? { label: 'SUPER ADMIN', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' }
        : user?.role === 'admin'
            ? { label: 'ADMIN', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20' }
            : { label: 'USER', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' };

    const tabs = [
        { id: 'avatar' as const, label: 'Avatar', icon: '🎨' },
        { id: 'account' as const, label: 'Account', icon: '⚙️' },
        { id: 'security' as const, label: 'Security', icon: '🔒' },
    ];

    return (
        <div className="w-full space-y-6">
            {/* Status messages */}
            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm text-center">
                        ⚠ {error}
                    </motion.div>
                )}
                {success && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm text-center">
                        ✅ {success}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN — Avatar preview & identity */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-1 space-y-5"
                >
                    {/* Big avatar preview card */}
                    <div className="p-6 rounded-2xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50 relative overflow-hidden">
                        <motion.div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 5, repeat: Infinity }} />
                        <div className="relative z-10 flex flex-col items-center text-center">
                            {/* Large avatar */}
                            <motion.div
                                className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${currentGradient.from} ${currentGradient.to} flex items-center justify-center font-orbitron font-bold text-5xl shadow-2xl mb-5 border-2 border-white/10`}
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                whileHover={{ scale: 1.05, rotate: [0, -2, 2, 0] }}
                            >
                                {selectedEmoji || user?.username?.[0]?.toUpperCase() || 'U'}
                            </motion.div>
                            <h3 className="font-orbitron text-xl font-bold text-white mb-1">{user?.username || 'User'}</h3>
                            <p className="text-gray-400 text-sm mb-3">{user?.email}</p>
                            <span className={`text-xs px-3 py-1 rounded-full font-semibold border shadow-lg ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border} ${roleBadge.glow}`}>
                                {roleBadge.label}
                            </span>
                        </div>
                    </div>

                    {/* Quick info */}
                    <div className="p-5 rounded-2xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50 space-y-3">
                        <h4 className="text-xs text-gray-500 uppercase tracking-wider font-medium">Account Info</h4>
                        <div className="space-y-2.5 text-sm">
                            <div className="flex justify-between items-center py-1.5">
                                <span className="text-gray-500 flex items-center gap-2">🆔 User ID</span>
                                <span className="text-gray-300 font-mono text-xs bg-gray-800/50 px-2 py-0.5 rounded">{user?.id?.slice(0, 12)}…</span>
                            </div>
                            <div className="w-full h-px bg-gray-800/50" />
                            <div className="flex justify-between items-center py-1.5">
                                <span className="text-gray-500 flex items-center gap-2">📅 Joined</span>
                                <span className="text-gray-300 text-xs">{user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                            </div>
                            <div className="w-full h-px bg-gray-800/50" />
                            <div className="flex justify-between items-center py-1.5">
                                <span className="text-gray-500 flex items-center gap-2">📧 Email</span>
                                <span className="text-gray-300 text-xs truncate max-w-[140px]">{user?.email}</span>
                            </div>
                            <div className="w-full h-px bg-gray-800/50" />
                            <div className="flex justify-between items-center py-1.5">
                                <span className="text-gray-500 flex items-center gap-2">🎨 Theme</span>
                                <span className="text-gray-300 text-xs">{currentGradient.label}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* RIGHT COLUMN — Settings with tabs */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2"
                >
                    {/* Tab Navigation */}
                    <div className="flex gap-2 mb-5 p-1 rounded-xl bg-gray-900/40 border border-gray-800/30">
                        {tabs.map((tab) => (
                            <motion.button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </motion.button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {/* AVATAR TAB */}
                        {activeTab === 'avatar' && (
                            <motion.div
                                key="avatar"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-5"
                            >
                                {/* Gradient Picker */}
                                <div className="p-5 rounded-2xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50">
                                    <h3 className="text-sm text-gray-300 font-medium mb-1">Background Gradient</h3>
                                    <p className="text-xs text-gray-500 mb-4">Choose a color theme for your avatar</p>
                                    <div className="grid grid-cols-8 gap-2.5">
                                        {AVATAR_GRADIENTS.map((g) => (
                                            <motion.button
                                                key={g.id}
                                                onClick={() => setSelectedGradient(g.id)}
                                                whileHover={{ scale: 1.15, y: -3 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="group relative"
                                            >
                                                <div className={`w-full aspect-square rounded-xl bg-gradient-to-br ${g.from} ${g.to} flex items-center justify-center transition-all shadow-lg ${selectedGradient === g.id ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 shadow-xl' : 'opacity-70 hover:opacity-100'}`}>
                                                    {selectedGradient === g.id && (
                                                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-white text-sm font-bold">✓</motion.span>
                                                    )}
                                                </div>
                                                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{g.label}</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* Emoji Picker */}
                                <div className="p-5 rounded-2xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50">
                                    <h3 className="text-sm text-gray-300 font-medium mb-1">Avatar Icon</h3>
                                    <p className="text-xs text-gray-500 mb-4">Pick an icon or use your initial letter</p>
                                    <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                                        {/* Initial letter option */}
                                        <motion.button
                                            onClick={() => setSelectedEmoji('')}
                                            whileHover={{ scale: 1.1, y: -2 }}
                                            whileTap={{ scale: 0.9 }}
                                            className={`aspect-square rounded-xl border flex items-center justify-center text-sm font-bold transition-all ${!selectedEmoji ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-500/10' : 'bg-gray-800/40 border-gray-700/40 text-gray-500 hover:border-gray-600/60'}`}
                                        >
                                            {user?.username?.[0]?.toUpperCase() || 'A'}
                                        </motion.button>
                                        {AVATAR_EMOJIS.map((emoji) => (
                                            <motion.button
                                                key={emoji}
                                                onClick={() => setSelectedEmoji(emoji)}
                                                whileHover={{ scale: 1.15, y: -3 }}
                                                whileTap={{ scale: 0.9 }}
                                                className={`aspect-square rounded-xl border flex items-center justify-center text-xl transition-all ${selectedEmoji === emoji ? 'bg-cyan-500/15 border-cyan-500/40 shadow-lg shadow-cyan-500/10' : 'bg-gray-800/40 border-gray-700/40 hover:border-gray-600/60 hover:bg-gray-800/60'}`}
                                            >
                                                {emoji}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* Save */}
                                <motion.button
                                    onClick={handleSaveAvatar}
                                    disabled={savingAvatar}
                                    whileHover={{ scale: 1.01, boxShadow: '0 0 25px rgba(6, 182, 212, 0.3)' }}
                                    whileTap={{ scale: 0.99 }}
                                    className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-white disabled:opacity-50 shadow-lg shadow-cyan-500/20 text-sm"
                                >
                                    {savingAvatar ? '⏳ Saving...' : '✨ Save Avatar'}
                                </motion.button>
                            </motion.div>
                        )}

                        {/* ACCOUNT TAB */}
                        {activeTab === 'account' && (
                            <motion.div
                                key="account"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-5"
                            >
                                <div className="p-5 rounded-2xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50">
                                    <h3 className="text-sm text-gray-300 font-medium mb-1">Username</h3>
                                    <p className="text-xs text-gray-500 mb-4">This is your public display name</p>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="New username"
                                            className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none transition-all text-sm"
                                        />
                                        <motion.button
                                            onClick={handleUpdateUsername}
                                            disabled={saving || username.trim() === user?.username}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-medium text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/10"
                                        >
                                            {saving ? '...' : 'Save'}
                                        </motion.button>
                                    </div>
                                </div>
                                <div className="p-5 rounded-2xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50">
                                    <h3 className="text-sm text-gray-300 font-medium mb-3">Account Details</h3>
                                    <div className="space-y-3 text-sm">
                                        {[
                                            { icon: '🆔', label: 'User ID', value: user?.id ? `${user.id.slice(0, 20)}…` : 'N/A', mono: true },
                                            { icon: '📧', label: 'Email', value: user?.email || 'N/A' },
                                            { icon: '👤', label: 'Role', value: roleBadge.label, color: roleBadge.text },
                                            { icon: '📅', label: 'Member Since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A' },
                                        ].map((item, i) => (
                                            <div key={i} className={`flex justify-between items-center py-2.5 ${i < 3 ? 'border-b border-gray-800/40' : ''}`}>
                                                <span className="text-gray-500 flex items-center gap-2 text-xs">{item.icon} {item.label}</span>
                                                <span className={`text-xs ${item.mono ? 'font-mono bg-gray-800/50 px-2 py-0.5 rounded' : ''} ${item.color || 'text-gray-300'}`}>{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* SECURITY TAB */}
                        {activeTab === 'security' && (
                            <motion.div
                                key="security"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-5"
                            >
                                <div className="p-5 rounded-2xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50">
                                    <h3 className="text-sm text-gray-300 font-medium mb-1">Change Password</h3>
                                    <p className="text-xs text-gray-500 mb-4">Use a strong password with at least 6 characters</p>
                                    <div className="space-y-3">
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="New password"
                                            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none transition-all text-sm"
                                        />
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password"
                                            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none transition-all text-sm"
                                        />
                                        <motion.button
                                            onClick={handleChangePassword}
                                            disabled={changingPassword || !newPassword || !confirmPassword}
                                            whileHover={{ scale: 1.01, boxShadow: '0 0 25px rgba(168, 85, 247, 0.3)' }}
                                            whileTap={{ scale: 0.99 }}
                                            className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl font-semibold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
                                        >
                                            {changingPassword ? '⏳ Changing...' : '🔐 Update Password'}
                                        </motion.button>
                                    </div>
                                </div>
                                <div className="p-5 rounded-2xl bg-gray-900/60 backdrop-blur-xl border border-amber-500/10">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">🛡️</span>
                                        <div>
                                            <h4 className="text-sm text-gray-300 font-medium mb-1">Security Tips</h4>
                                            <ul className="text-xs text-gray-500 space-y-1.5">
                                                <li>• Use a unique password you don&apos;t use elsewhere</li>
                                                <li>• Mix uppercase, lowercase, numbers, and symbols</li>
                                                <li>• Never share your password with anyone</li>
                                                <li>• Sign out on shared devices after use</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}

// Admin Panel with Supabase integration
function AdminPanel() {
    const { user } = useAuthStore();
    const [admins, setAdmins] = useState<{ id: string; email: string; role: string; username: string }[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [demoting, setDemoting] = useState<string | null>(null);
    const [showAdminProfileModal, setShowAdminProfileModal] = useState(false);
    const [viewingAdmin, setViewingAdmin] = useState<{ id: string; email: string; role: string; username: string } | null>(null);

    const fetchAdmins = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin-management', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list-admins' }),
            });
            const result = await res.json();
            if (!res.ok) {
                setError(result.error || 'Failed to load admins');
            } else {
                setAdmins(result.admins || []);
            }
        } catch (err: any) {
            console.error('Fetch admins error:', err);
            setError('Failed to load admins. Check console for details.');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    const handleAddAdmin = async () => {
        setError('');
        setSuccess('');

        if (!newEmail.trim() || !newPassword.trim()) {
            setError('Please enter both email and password');
            return;
        }
        if (!newEmail.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        const exists = admins.some(a => a.email.toLowerCase() === newEmail.toLowerCase());
        if (exists) {
            setError('This admin email already exists!');
            return;
        }

        setAdding(true);
        try {
            const res = await fetch('/api/admin-management', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add-admin', email: newEmail, password: newPassword }),
            });
            const result = await res.json();
            if (!res.ok) {
                setError(result.error || 'Failed to add admin');
            } else {
                setSuccess(result.message || `Admin ${newEmail} added successfully!`);
                setNewEmail('');
                setNewPassword('');
                fetchAdmins();
            }
        } catch (err: any) {
            setError(`Error: ${err.message}`);
        }
        setAdding(false);
        setTimeout(() => { setSuccess(''); setError(''); }, 5000);
    };

    const handleDemoteAdmin = async (id: string, email: string) => {
        if (email === user?.email) {
            setError('Cannot demote your own account');
            setTimeout(() => setError(''), 3000);
            return;
        }

        const target = admins.find(a => a.id === id);
        if (target?.role === 'super_admin') {
            setError('Cannot demote super admin accounts');
            setTimeout(() => setError(''), 3000);
            return;
        }

        if (!confirm(`Demote ${email} from admin to regular user?`)) return;

        setDemoting(id);
        try {
            const res = await fetch('/api/admin-management', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'demote-admin', userId: id }),
            });
            const result = await res.json();
            if (!res.ok) {
                setError(result.error || 'Failed to demote admin');
            } else {
                setAdmins(admins.filter(a => a.id !== id));
                setSuccess(`${email} demoted to regular user`);
            }
        } catch (err: any) {
            setError(`Error: ${err.message}`);
        }
        setDemoting(null);
        setTimeout(() => { setSuccess(''); setError(''); }, 3000);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-orbitron text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        Admin Management
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Manage system administrators ({admins.length} active)</p>
                </div>
                <motion.button
                    onClick={fetchAdmins}
                    className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl text-sm hover:bg-purple-500/30 transition-all flex items-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    🔄 Refresh
                </motion.button>
            </div>

            {/* Error/Success Messages */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400"
                    >
                        ⚠ {error}
                    </motion.div>
                )}
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400"
                    >
                        ✓ {success}
                    </motion.div>
                )}
            </AnimatePresence>

            <GlassCard className="p-6" delay={0.1} glow="purple">
                <h3 className="text-sm text-gray-400 mb-4">Add New Admin</h3>
                <div className="flex flex-col lg:flex-row gap-3">
                    <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="admin@example.com"
                        className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-all"
                    />
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Password (min 6 chars)"
                        className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-all"
                    />
                    <motion.button
                        onClick={handleAddAdmin}
                        disabled={adding}
                        className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-white disabled:opacity-50"
                        whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)' }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {adding ? 'Adding...' : '+ Add Admin'}
                    </motion.button>
                </div>
            </GlassCard>

            <div className="space-y-3">
                {/* Loading state */}
                {loading && (
                    <div className="p-8 text-center">
                        <motion.div
                            className="inline-block w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <p className="text-gray-400 mt-3">Loading admins...</p>
                    </div>
                )}
                {/* Empty state */}
                {!loading && admins.length === 0 && (
                    <GlassCard className="p-8 text-center" glow="purple">
                        <p className="text-gray-500">No admins found</p>
                        <motion.button
                            onClick={fetchAdmins}
                            className="mt-3 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl text-sm hover:bg-purple-500/30 transition-all"
                            whileHover={{ scale: 1.02 }}
                        >
                            🔄 Retry
                        </motion.button>
                    </GlassCard>
                )}
                <AnimatePresence>
                    {!loading && admins.map((a, i) => (
                        <motion.div
                            key={a.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20, height: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <GlassCard className="p-4 flex justify-between items-center" glow="purple">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center font-orbitron font-bold text-purple-400">
                                        {a.email[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium">{a.email}</p>
                                        <p className="text-xs text-gray-500">{a.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMINISTRATOR'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-lg text-xs ${a.role === 'super_admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                        {a.role === 'super_admin' ? 'Super Admin' : 'Active'}
                                    </span>
                                    <motion.button
                                        onClick={() => { setViewingAdmin(a); setShowAdminProfileModal(true); }}
                                        className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 flex items-center justify-center transition-all"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        title="View Profile"
                                    >
                                        👤
                                    </motion.button>
                                    {a.role !== 'super_admin' && a.email !== user?.email && (
                                        <motion.button
                                            onClick={() => handleDemoteAdmin(a.id, a.email)}
                                            disabled={demoting === a.id}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${demoting === a.id ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'}`}
                                            whileHover={demoting !== a.id ? { scale: 1.1 } : {}}
                                            whileTap={demoting !== a.id ? { scale: 0.9 } : {}}
                                            title="Demote to user"
                                        >
                                            {demoting === a.id ? (
                                                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block">⏳</motion.span>
                                            ) : '✕'}
                                        </motion.button>
                                    )}
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Admin Profile Modal */}
            <AnimatePresence>
                {showAdminProfileModal && viewingAdmin && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowAdminProfileModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-md bg-gray-900 rounded-2xl border border-purple-500/20 p-6 space-y-5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="font-orbitron text-lg text-white">Admin Profile</h3>
                                <motion.button
                                    onClick={() => setShowAdminProfileModal(false)}
                                    className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center"
                                    whileHover={{ scale: 1.1 }}
                                >
                                    ✕
                                </motion.button>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(viewingAdmin.username?.length % AVATAR_GRADIENTS.length || 0).from} ${getAvatarGradient(viewingAdmin.username?.length % AVATAR_GRADIENTS.length || 0).to} flex items-center justify-center font-orbitron font-bold text-2xl shadow-lg`}>
                                    {viewingAdmin.username?.[0]?.toUpperCase() || viewingAdmin.email[0].toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white text-lg">{viewingAdmin.username || viewingAdmin.email.split('@')[0]}</h4>
                                    <p className="text-gray-400 text-sm">{viewingAdmin.email}</p>
                                </div>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-2 border-b border-gray-800/50">
                                    <span className="text-gray-500">Role</span>
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${viewingAdmin.role === 'super_admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                                        {viewingAdmin.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN'}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-gray-500">User ID</span>
                                    <span className="text-gray-300 font-mono text-xs">{viewingAdmin.id.slice(0, 16)}...</span>
                                </div>
                            </div>
                            <motion.button
                                onClick={() => setShowAdminProfileModal(false)}
                                className="w-full py-2.5 bg-gray-800 text-gray-400 rounded-xl text-sm hover:text-white"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Close
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Manage Users Panel - Admin/Super Admin only
function ManageUsersPanel() {
    const { user } = useAuthStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [viewingProfile, setViewingProfile] = useState<{ id: string; email: string; username: string; role: string; created_at: string } | null>(null);
    const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null);
    const [messageSubject, setMessageSubject] = useState('');
    const [messageContent, setMessageContent] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Real users data from Supabase
    const [users, setUsers] = useState<{ id: string; email: string; username: string; role: 'super_admin' | 'admin' | 'user'; created_at: string }[]>([]);

    // Sent messages history (stored locally for now, could be extended to Supabase)
    const [sentMessages, setSentMessages] = useState<{ id: string; to_user_email: string; subject: string; content: string; created_at: string }[]>([]);

    // Fetch users via server-side API (bypasses RLS)
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin-management', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list-users' }),
            });
            const result = await res.json();
            if (!res.ok) {
                setError(result.error || 'Failed to load users');
            } else if (result.users && result.users.length > 0) {
                setUsers(result.users.map((u: any) => ({
                    id: u.id,
                    email: u.email || '',
                    username: u.username || u.email?.split('@')[0] || 'Unknown',
                    role: u.role || 'user',
                    created_at: new Date(u.created_at).toLocaleDateString(),
                })));
            } else {
                setUsers([]);
            }
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(`Failed to load users: ${err.message}`);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSendMessage = async () => {
        if (!selectedUser || !messageSubject.trim() || !messageContent.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setSendingMessage(true);
        setError('');

        // Simulate sending (in production, would save to Supabase messages table)
        await new Promise(r => setTimeout(r, 1000));

        // Add to sent messages
        const newMessage = {
            id: Date.now().toString(),
            to_user_email: selectedUser.email,
            subject: messageSubject,
            content: messageContent,
            created_at: new Date().toLocaleString(),
        };
        setSentMessages([newMessage, ...sentMessages]);

        setSendingMessage(false);
        setShowMessageModal(false);
        setMessageSubject('');
        setMessageContent('');
        setSelectedUser(null);
        setSuccess(`Message sent to ${selectedUser.email}`);
        setTimeout(() => setSuccess(''), 3000);
    };

    const handleDeleteUser = async (userId: string, email: string) => {
        if (email === user?.email) {
            setError('Cannot delete your own account');
            setTimeout(() => setError(''), 3000);
            return;
        }

        const userToDelete = users.find(u => u.id === userId);
        if (userToDelete?.role === 'super_admin') {
            setError('Cannot delete super admin accounts');
            setTimeout(() => setError(''), 3000);
            return;
        }

        // Confirm deletion
        if (!confirm(`Are you sure you want to delete ${email}?`)) {
            return;
        }

        setDeleting(userId);
        setError('');

        try {
            const res = await fetch('/api/admin-management', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete-user', userId }),
            });
            const result = await res.json();
            if (!res.ok) {
                setError(result.error || `Failed to delete user`);
            } else {
                setUsers(users.filter(u => u.id !== userId));
                setSuccess(`User ${email} deleted successfully`);
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: any) {
            setError(`Failed to delete user: ${err.message}`);
        }

        setDeleting(null);
    };

    const openMessageModal = (u: { id: string; email: string }) => {
        setSelectedUser(u);
        setShowMessageModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-orbitron text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                        Manage Users
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">{users.length} registered users</p>
                </div>
                <div className="flex items-center gap-2">
                    <motion.button
                        onClick={fetchUsers}
                        className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm hover:bg-emerald-500/30 transition-all flex items-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        🔄 Refresh
                    </motion.button>
                    <motion.button
                        onClick={() => setShowHistoryModal(true)}
                        className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl text-sm hover:bg-cyan-500/30 transition-all flex items-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        📨 Sent Messages ({sentMessages.length})
                    </motion.button>
                </div>
            </div>

            {/* Status Messages */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400"
                    >
                        ⚠ {error}
                    </motion.div>
                )}
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400"
                    >
                        ✓ {success}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search */}
            <GlassCard className="p-4" delay={0.1}>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search users by email or username..."
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-all"
                />
            </GlassCard>

            {/* Users Table */}
            <GlassCard className="overflow-hidden" delay={0.2}>
                <div className="p-4 border-b border-gray-800">
                    <div className="grid grid-cols-12 gap-4 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                        <div className="col-span-4">Email</div>
                        <div className="col-span-2">Username</div>
                        <div className="col-span-2">Role</div>
                        <div className="col-span-2">Joined</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>
                </div>
                <div className="divide-y divide-gray-800/50">
                    {/* Loading state */}
                    {loading && (
                        <div className="p-8 text-center">
                            <motion.div
                                className="inline-block w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <p className="text-gray-400 mt-3">Loading users...</p>
                        </div>
                    )}
                    {/* Empty state */}
                    {!loading && filteredUsers.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            <p>{searchTerm ? 'No users match your search' : 'No users found'}</p>
                            {!searchTerm && (
                                <motion.button
                                    onClick={fetchUsers}
                                    className="mt-3 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl text-sm hover:bg-cyan-500/30 transition-all"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    🔄 Retry
                                </motion.button>
                            )}
                        </div>
                    )}
                    {/* Users list */}
                    {!loading && filteredUsers.map((u, i) => (
                        <motion.div
                            key={u.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            className="p-4 hover:bg-gray-800/30 transition-all"
                        >
                            <div className="grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-4 text-white text-sm truncate">{u.email}</div>
                                <div className="col-span-2 text-gray-400 text-sm">{u.username}</div>
                                <div className="col-span-2">
                                    <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'super_admin' ? 'bg-purple-500/20 text-purple-400' :
                                        u.role === 'admin' ? 'bg-cyan-500/20 text-cyan-400' :
                                            'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {u.role.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="col-span-2 text-gray-500 text-sm">{u.created_at}</div>
                                <div className="col-span-2 flex justify-end gap-2">
                                    <motion.button
                                        onClick={() => { setViewingProfile(u); setShowProfileModal(true); }}
                                        className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 flex items-center justify-center transition-all"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        title="View Profile"
                                    >
                                        👤
                                    </motion.button>
                                    <motion.button
                                        onClick={() => openMessageModal({ id: u.id, email: u.email })}
                                        className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 flex items-center justify-center transition-all"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        title="Send Message"
                                    >
                                        📧
                                    </motion.button>
                                    {u.role !== 'super_admin' && u.email !== user?.email && (
                                        <motion.button
                                            onClick={() => handleDeleteUser(u.id, u.email)}
                                            disabled={deleting === u.id}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${deleting === u.id ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'}`}
                                            whileHover={deleting !== u.id ? { scale: 1.1 } : {}}
                                            whileTap={deleting !== u.id ? { scale: 0.9 } : {}}
                                            title="Delete User"
                                        >
                                            {deleting === u.id ? (
                                                <motion.span
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    className="inline-block"
                                                >⏳</motion.span>
                                            ) : '🗑️'}
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </GlassCard>

            {/* Send Message Modal */}
            <AnimatePresence>
                {showMessageModal && selectedUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowMessageModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-lg bg-gray-900 rounded-2xl border border-cyan-500/20 p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="font-orbitron text-lg text-white mb-4">
                                Send Message to <span className="text-cyan-400">{selectedUser.email}</span>
                            </h3>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={messageSubject}
                                    onChange={(e) => setMessageSubject(e.target.value)}
                                    placeholder="Subject"
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                                />
                                <textarea
                                    value={messageContent}
                                    onChange={(e) => setMessageContent(e.target.value)}
                                    placeholder="Write your message..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
                                />
                                <div className="flex justify-end gap-3">
                                    <motion.button
                                        onClick={() => setShowMessageModal(false)}
                                        className="px-6 py-2 rounded-xl text-gray-400 hover:text-white transition-all"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        onClick={handleSendMessage}
                                        disabled={sendingMessage}
                                        className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold text-white disabled:opacity-50"
                                        whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)' }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {sendingMessage ? 'Sending...' : 'Send ➤'}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Message History Modal */}
            <AnimatePresence>
                {showHistoryModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowHistoryModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-2xl max-h-[80vh] bg-gray-900 rounded-2xl border border-cyan-500/20 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                                <h3 className="font-orbitron text-lg text-white">📨 Sent Messages</h3>
                                <motion.button
                                    onClick={() => setShowHistoryModal(false)}
                                    className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center"
                                    whileHover={{ scale: 1.1 }}
                                >
                                    ✕
                                </motion.button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                                {sentMessages.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No messages sent yet</p>
                                ) : (
                                    sentMessages.map((msg, i) => (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-cyan-400 text-sm">To: {msg.to_user_email}</span>
                                                <span className="text-gray-500 text-xs">{msg.created_at}</span>
                                            </div>
                                            <p className="text-white font-medium text-sm mb-1">{msg.subject}</p>
                                            <p className="text-gray-400 text-sm">{msg.content}</p>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View Profile Modal */}
            <AnimatePresence>
                {showProfileModal && viewingProfile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowProfileModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-md bg-gray-900 rounded-2xl border border-cyan-500/20 p-6 space-y-5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="font-orbitron text-lg text-white">User Profile</h3>
                                <motion.button
                                    onClick={() => setShowProfileModal(false)}
                                    className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center"
                                    whileHover={{ scale: 1.1 }}
                                >
                                    ✕
                                </motion.button>
                            </div>

                            {/* Avatar + Name */}
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(viewingProfile.username.length % AVATAR_GRADIENTS.length).from} ${getAvatarGradient(viewingProfile.username.length % AVATAR_GRADIENTS.length).to} flex items-center justify-center font-orbitron font-bold text-2xl shadow-lg`}>
                                    {viewingProfile.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white text-lg">{viewingProfile.username}</h4>
                                    <p className="text-gray-400 text-sm">{viewingProfile.email}</p>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-2 border-b border-gray-800/50">
                                    <span className="text-gray-500">Role</span>
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${viewingProfile.role === 'super_admin' ? 'bg-purple-500/20 text-purple-400' :
                                        viewingProfile.role === 'admin' ? 'bg-cyan-500/20 text-cyan-400' :
                                            'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {viewingProfile.role.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-800/50">
                                    <span className="text-gray-500">User ID</span>
                                    <span className="text-gray-300 font-mono text-xs">{viewingProfile.id.slice(0, 16)}...</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-gray-500">Joined</span>
                                    <span className="text-gray-300">{viewingProfile.created_at}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <motion.button
                                    onClick={() => { setShowProfileModal(false); openMessageModal({ id: viewingProfile.id, email: viewingProfile.email }); }}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-medium text-sm text-white"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    📧 Send Message
                                </motion.button>
                                <motion.button
                                    onClick={() => setShowProfileModal(false)}
                                    className="px-5 py-2.5 bg-gray-800 text-gray-400 rounded-xl text-sm hover:text-white"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Close
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Main Dashboard
export default function Dashboard() {
    const { user, logout } = useAuthStore();
    const { activePanel, setActivePanel } = useUIStore();
    const [isClient, setIsClient] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        logout();
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    // Build menu items based on user role
    const menuItems = [];

    // Dashboard/Analytics - Admin only
    if (isAdmin) {
        menuItems.push({ id: 'overview', label: 'Dashboard', icon: <IconDashboard /> });
    }

    // Common items for all users
    menuItems.push(
        { id: 'analyze', label: 'Scan', icon: <IconScan /> },
        { id: 'complaints', label: 'Report', icon: <IconReport /> },
        { id: 'inbox', label: 'Inbox', icon: <IconMail /> },
        { id: 'profile', label: 'Profile', icon: <IconProfile /> }
    );

    // Prediction panel - Admin only
    if (isAdmin) {
        menuItems.push(
            { id: 'predict', label: 'Predict', icon: <IconPredict /> },
            { id: 'map', label: 'Hotspots', icon: <IconMap /> },
            { id: 'charts', label: 'Charts', icon: <IconChart /> },
            { id: 'vehicleSearch', label: 'Lookup', icon: <IconVehicleSearch /> },
            { id: 'export', label: 'Export', icon: <IconExport /> },
            { id: 'users', label: 'Manage Users', icon: <IconUsers /> }
        );
    }

    // Admin management - Super admin only
    if (user?.role === 'super_admin') {
        menuItems.push({ id: 'admins', label: 'Admin', icon: <IconAdmin /> });
    }

    if (!isClient) return null;

    return (
        <div className="fixed inset-0 bg-[#05050a] overflow-hidden">
            {/* Background Effects */}
            <GridBackground />
            <ParticleBackground />

            <div className="relative flex h-full">
                {/* Mobile Backdrop */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSidebarOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                        />
                    )}
                </AnimatePresence>

                {/* Premium Sidebar */}
                <motion.aside
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`
                        fixed lg:relative z-50 h-full
                        w-72 bg-gradient-to-b from-gray-900/95 via-gray-900/90 to-gray-900/95
                        lg:bg-gradient-to-b lg:from-gray-900/60 lg:via-gray-900/40 lg:to-gray-900/60
                        backdrop-blur-2xl border-r border-cyan-500/10 flex flex-col
                        transform transition-transform duration-300 ease-out
                        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    `}
                >
                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 flex items-center justify-center lg:hidden transition-all"
                    >
                        <IconClose />
                    </button>

                    {/* Neon line accent */}
                    <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />

                    {/* Logo Section */}
                    <div className="p-4 lg:p-6">
                        <motion.div
                            className="flex items-center gap-3"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="relative">
                                <motion.div
                                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center font-orbitron font-black text-lg shadow-lg shadow-cyan-500/30"
                                    whileHover={{ scale: 1.05, rotate: 5 }}
                                    animate={{
                                        boxShadow: ['0 0 20px rgba(0, 240, 255, 0.3)', '0 0 40px rgba(0, 240, 255, 0.5)', '0 0 20px rgba(0, 240, 255, 0.3)']
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    S
                                </motion.div>
                            </div>
                            <div className="hidden lg:block">
                                <h1 className="font-orbitron text-xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                    SLEVIS
                                </h1>
                                <p className="text-[10px] text-gray-500 tracking-[0.2em] font-medium">COMMAND CENTER</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* User Profile Section */}
                    <motion.div
                        className="mx-3 lg:mx-4 p-3 lg:p-4 rounded-2xl bg-gradient-to-r from-cyan-500/5 to-purple-500/5 border border-cyan-500/10 mb-4"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <motion.div
                                    className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center font-orbitron font-bold text-lg shadow-lg shadow-purple-500/20"
                                    whileHover={{ scale: 1.1, rotate: -5 }}
                                >
                                    {user?.username?.[0]?.toUpperCase() || 'U'}
                                </motion.div>
                                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-gray-900 animate-pulse" />
                            </div>
                            <div className="hidden lg:block flex-1 min-w-0">
                                <p className="font-semibold text-sm text-white truncate">{user?.username || 'User'}</p>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${user?.role === 'super_admin'
                                        ? 'bg-purple-500/20 text-purple-400'
                                        : user?.role === 'admin'
                                            ? 'bg-cyan-500/20 text-cyan-400'
                                            : 'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {user?.role?.replace('_', ' ').toUpperCase() || 'USER'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Navigation Title */}
                    <div className="px-4 lg:px-5 mb-2 hidden lg:block">
                        <p className="text-[10px] text-gray-600 font-semibold tracking-widest uppercase">Navigation</p>
                    </div>

                    {/* Navigation Menu */}
                    <nav className="flex-1 px-2 lg:px-3 space-y-1.5 overflow-y-auto">
                        {menuItems.map((item, i) => {
                            const isActive = activePanel === item.id;
                            return (
                                <motion.button
                                    key={item.id}
                                    onClick={() => setActivePanel(item.id)}
                                    className={`relative w-full flex items-center justify-center lg:justify-start gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                                        ? 'text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + i * 0.08 }}
                                    whileHover={{ x: isActive ? 0 : 4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {/* Active Background */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeNavBg"
                                            className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-purple-500/10 rounded-xl border border-cyan-500/20"
                                            initial={false}
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        />
                                    )}

                                    {/* Active Indicator Line */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeNavLine"
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-r-full shadow-lg shadow-cyan-400/50"
                                            initial={false}
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        />
                                    )}

                                    {/* Icon with glow */}
                                    <div className={`relative z-10 w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-300 ${isActive
                                        ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20'
                                        : 'bg-gray-800/50 text-gray-400 group-hover:bg-gray-700/50 group-hover:text-white'
                                        }`}>
                                        {item.icon}
                                    </div>

                                    {/* Label */}
                                    <span className={`hidden lg:block text-sm font-medium relative z-10 ${isActive ? 'text-cyan-400' : ''}`}>
                                        {item.label}
                                    </span>

                                    {/* Hover glow effect */}
                                    <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${!isActive ? 'bg-gradient-to-r from-cyan-500/5 to-transparent' : ''
                                        }`} />
                                </motion.button>
                            );
                        })}
                    </nav>

                    {/* Divider */}
                    <div className="mx-4 my-3">
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                    </div>

                    {/* Logout Button */}
                    <div className="p-3 lg:p-4">
                        <motion.button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center lg:justify-start gap-4 px-4 py-3.5 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-300 group"
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800/50 group-hover:bg-rose-500/20 transition-all">
                                <IconLogout />
                            </div>
                            <span className="hidden lg:block text-sm font-medium">Logout</span>
                        </motion.button>
                    </div>

                    {/* Version */}
                    <div className="p-3 lg:p-4 text-center lg:text-left">
                        <p className="text-[10px] text-gray-600 font-mono">v1.0.0</p>
                    </div>
                </motion.aside>

                {/* Main Content */}
                <main className="flex-1 overflow-hidden flex flex-col">
                    {/* Top Bar */}
                    <motion.div
                        className="h-16 bg-gray-900/20 backdrop-blur-xl border-b border-gray-800/50 flex items-center justify-between px-4 lg:px-6"
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="flex items-center gap-4">
                            {/* Hamburger Menu Button - Mobile Only */}
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="w-10 h-10 rounded-xl bg-gray-800/50 text-gray-400 hover:text-cyan-400 hover:bg-gray-700/50 flex items-center justify-center lg:hidden transition-all"
                            >
                                <IconMenu />
                            </button>
                            <h2 className="font-orbitron text-sm text-gray-400 uppercase tracking-widest">
                                {activePanel === 'overview' && '📊 Dashboard'}
                                {activePanel === 'analyze' && '🔍 Vehicle Scanner'}
                                {activePanel === 'complaints' && '📝 Submit Report'}
                                {activePanel === 'inbox' && '📬 Messages'}
                                {activePanel === 'predict' && '🔮 Violation Predictor'}
                                {activePanel === 'map' && '🗺️ Violation Hotspots'}
                                {activePanel === 'charts' && '📈 Advanced Analytics'}
                                {activePanel === 'vehicleSearch' && '🔎 Vehicle Lookup'}
                                {activePanel === 'export' && '📤 Export Reports'}
                                {activePanel === 'users' && '👥 Manage Users'}
                                {activePanel === 'admins' && '🔐 Administration'}
                                {activePanel === 'profile' && '👤 My Profile'}
                            </h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-600">v1.0.0</span>
                            <motion.div
                                className="w-2 h-2 rounded-full bg-emerald-400"
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </div>
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activePanel}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="max-w-6xl mx-auto h-full"
                            >
                                {activePanel === 'overview' && <AnalyticsPanel />}
                                {activePanel === 'analyze' && <VehicleAnalysis />}
                                {activePanel === 'complaints' && <ComplaintForm />}
                                {activePanel === 'inbox' && <InboxPanel />}
                                {activePanel === 'predict' && <ViolationPredictor />}
                                {activePanel === 'map' && <HotspotMap />}
                                {activePanel === 'charts' && <AdvancedCharts />}
                                {activePanel === 'vehicleSearch' && <VehicleSearch />}
                                {activePanel === 'export' && <ExportPanel />}
                                {activePanel === 'users' && <ManageUsersPanel />}
                                {activePanel === 'admins' && <AdminPanel />}
                                {activePanel === 'profile' && <ProfilePanel />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}
