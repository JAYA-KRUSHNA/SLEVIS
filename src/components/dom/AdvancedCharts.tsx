'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, BarChart, Bar,
    PieChart, Pie, Cell, ResponsiveContainer,
    XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

// Sample data
const weeklyTrends = [
    { day: 'Mon', violations: 45, resolved: 38 },
    { day: 'Tue', violations: 52, resolved: 44 },
    { day: 'Wed', violations: 38, resolved: 35 },
    { day: 'Thu', violations: 67, resolved: 58 },
    { day: 'Fri', violations: 82, resolved: 71 },
    { day: 'Sat', violations: 95, resolved: 80 },
    { day: 'Sun', violations: 72, resolved: 65 },
];

const monthlyData = [
    { month: 'Jan', value: 420 },
    { month: 'Feb', value: 380 },
    { month: 'Mar', value: 510 },
    { month: 'Apr', value: 445 },
    { month: 'May', value: 620 },
    { month: 'Jun', value: 580 },
];

const violationTypes = [
    { name: 'No Helmet', value: 35, color: '#00F0FF' },
    { name: 'Signal Jump', value: 25, color: '#FF0099' },
    { name: 'Overspeeding', value: 20, color: '#FFB800' },
    { name: 'Wrong Side', value: 12, color: '#9D00FF' },
    { name: 'Others', value: 8, color: '#00FF88' },
];

// Animated Counter Component
function AnimatedCounter({ value, duration = 1500 }: { value: string; duration?: number }) {
    const [displayValue, setDisplayValue] = useState(0);
    const numericValue = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(Math.floor(easeOutQuart * numericValue));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [numericValue, duration]);

    return <span className="number-flash">{displayValue}</span>;
}

// Custom Tooltip with enhanced animation
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-gray-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl px-4 py-3 shadow-2xl border-glow-pulse"
            >
                <p className="text-cyan-400 font-orbitron text-sm mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <motion.p
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="text-sm"
                        style={{ color: entry.color }}
                    >
                        {entry.name}: <span className="font-bold">{entry.value}</span>
                    </motion.p>
                ))}
            </motion.div>
        );
    }
    return null;
};

// Tab Button with enhanced animations
function TabButton({ tab, isActive, onClick }: { tab: { id: string; label: string; color: string }; isActive: boolean; onClick: () => void }) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className={`relative px-6 py-3 rounded-xl font-medium transition-all duration-300 overflow-hidden ${isActive
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
                }`}
        >
            {/* Animated glow effect for active tab */}
            {isActive && (
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20"
                    animate={{
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            )}
            <span className="relative z-10">{tab.label}</span>
        </motion.button>
    );
}

// Stat Card with enhanced animations
function StatCard({ stat, index }: { stat: { label: string; value: string; icon: string; change: string; color: string }; index: number }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                delay: 0.4 + index * 0.1,
                type: "spring",
                stiffness: 100
            }}
            whileHover={{
                scale: 1.05,
                y: -5,
                transition: { type: "spring", stiffness: 300 }
            }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="relative p-6 rounded-2xl bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 text-center overflow-hidden group cursor-pointer"
        >
            {/* Animated background glow */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />

            {/* Floating icon */}
            <motion.div
                className="text-3xl mb-3"
                animate={isHovered ? {
                    y: [-2, 2, -2],
                    rotate: [0, 5, -5, 0]
                } : {}}
                transition={{
                    duration: 1.5,
                    repeat: isHovered ? Infinity : 0,
                    ease: "easeInOut"
                }}
            >
                {stat.icon}
            </motion.div>

            {/* Animated counter */}
            <p className="font-orbitron text-3xl font-bold text-white mb-1">
                <AnimatedCounter value={stat.value} />
            </p>

            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{stat.label}</p>

            {/* Change indicator with pulse animation */}
            <motion.span
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}
                animate={isHovered ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5 }}
            >
                {stat.change.startsWith('+') ? '↑' : '↓'} {stat.change} vs last week
            </motion.span>

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500/30 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500/30 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500/30 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500/30 rounded-br-lg" />
        </motion.div>
    );
}

// Legend Item with enhanced animations
function LegendItem({ type, index }: { type: { name: string; value: number; color: string }; index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
                delay: index * 0.1,
                type: "spring",
                stiffness: 100
            }}
            whileHover={{
                scale: 1.02,
                x: 5,
                transition: { type: "spring", stiffness: 300 }
            }}
            className="flex items-center gap-4 p-3 rounded-xl bg-gray-800/30 hover:bg-gray-700/40 transition-all cursor-pointer group"
        >
            {/* Pulsing color indicator */}
            <motion.div
                className="w-4 h-4 rounded-full pulse-ring"
                style={{ backgroundColor: type.color }}
                whileHover={{ scale: 1.2 }}
            />
            <span className="text-sm text-gray-300 flex-1 group-hover:text-white transition-colors">{type.name}</span>
            <motion.span
                className="text-sm font-orbitron font-bold text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
            >
                {type.value}%
            </motion.span>
        </motion.div>
    );
}

// Main AdvancedCharts Component
export default function AdvancedCharts() {
    const [activeTab, setActiveTab] = useState<'trends' | 'distribution' | 'monthly'>('trends');

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const chartVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: "spring" as const,
                stiffness: 100,
                damping: 15
            }
        },
        exit: {
            opacity: 0,
            y: -20,
            scale: 0.95,
            transition: { duration: 0.2 }
        }
    };

    return (
        <motion.div
            className="max-w-5xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
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
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    <span className="text-4xl">📊</span>
                </motion.div>
                <motion.h2
                    className="font-orbitron text-3xl font-bold text-white mb-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    Advanced Analytics
                </motion.h2>
                <motion.p
                    className="text-gray-500 text-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    Comprehensive violation statistics and trends
                </motion.p>
            </motion.div>

            {/* Tab Navigation with enhanced animations */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex justify-center gap-4 mb-10"
            >
                {[
                    { id: 'trends', label: '📈 Weekly Trends', color: 'cyan' },
                    { id: 'distribution', label: '🍩 Distribution', color: 'pink' },
                    { id: 'monthly', label: '📊 Monthly', color: 'purple' },
                ].map((tab) => (
                    <TabButton
                        key={tab.id}
                        tab={tab}
                        isActive={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                    />
                ))}
            </motion.div>

            {/* Chart Container with AnimatePresence for smooth transitions */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    variants={chartVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="p-8 rounded-3xl bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 mb-10 relative overflow-hidden"
                >
                    {/* Animated border glow */}
                    <motion.div
                        className="absolute inset-0 rounded-3xl pointer-events-none"
                        animate={{
                            boxShadow: [
                                "inset 0 0 20px rgba(0, 240, 255, 0.05)",
                                "inset 0 0 40px rgba(0, 240, 255, 0.1)",
                                "inset 0 0 20px rgba(0, 240, 255, 0.05)"
                            ]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {activeTab === 'trends' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h3 className="font-orbitron text-lg text-white mb-6 flex items-center gap-2">
                                <motion.span
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    📈
                                </motion.span>
                                Weekly Violation Trends
                            </h3>
                            <ResponsiveContainer width="100%" height={350}>
                                <AreaChart data={weeklyTrends}>
                                    <defs>
                                        <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#00F0FF" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00FF88" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                    <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                                    <YAxis stroke="#6b7280" fontSize={12} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="violations" stroke="#00F0FF" strokeWidth={3} fillOpacity={1} fill="url(#colorViolations)" name="Violations" />
                                    <Area type="monotone" dataKey="resolved" stroke="#00FF88" strokeWidth={3} fillOpacity={1} fill="url(#colorResolved)" name="Resolved" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}

                    {activeTab === 'distribution' && (
                        <motion.div
                            className="flex items-center justify-between gap-12"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="flex-1">
                                <h3 className="font-orbitron text-lg text-white mb-6 flex items-center gap-2">
                                    <motion.span
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    >
                                        🍩
                                    </motion.span>
                                    Violation Distribution
                                </h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={violationTypes}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={120}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {violationTypes.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-64 space-y-3">
                                {violationTypes.map((type, i) => (
                                    <LegendItem key={i} type={type} index={i} />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'monthly' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h3 className="font-orbitron text-lg text-white mb-6 flex items-center gap-2">
                                <motion.span
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    📊
                                </motion.span>
                                Monthly Overview
                            </h3>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                                    <YAxis stroke="#6b7280" fontSize={12} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" name="Violations" radius={[8, 8, 0, 0]}>
                                        {monthlyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={`rgba(0, 240, 255, ${0.4 + (entry.value / 700)})`} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Stats Row with enhanced animations */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-4 gap-6"
            >
                {[
                    { label: 'Total This Week', value: '451', icon: '📈', change: '+12%', color: 'cyan' },
                    { label: 'Resolved', value: '391', icon: '✅', change: '+8%', color: 'emerald' },
                    { label: 'Pending', value: '60', icon: '⏳', change: '-5%', color: 'amber' },
                    { label: 'High Priority', value: '23', icon: '🚨', change: '+3%', color: 'rose' },
                ].map((stat, i) => (
                    <StatCard key={stat.label} stat={stat} index={i} />
                ))}
            </motion.div>
        </motion.div>
    );
}
