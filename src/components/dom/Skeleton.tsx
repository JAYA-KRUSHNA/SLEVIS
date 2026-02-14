'use client';

import { motion } from 'framer-motion';

// Basic Skeleton with shimmer effect
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <div className={`relative overflow-hidden bg-gray-800/50 rounded ${className}`} style={style}>
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700/30 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
        </div>
    );
}

// Stat Card Skeleton
export function StatCardSkeleton() {
    return (
        <div className="backdrop-blur-xl bg-gray-900/40 rounded-2xl border border-gray-800/50 p-5">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <Skeleton className="h-3 w-20 mb-3" />
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="w-12 h-12 rounded-xl" />
            </div>
        </div>
    );
}

// Vehicle Card Skeleton
export function VehicleCardSkeleton() {
    return (
        <div className="backdrop-blur-xl bg-gray-900/40 rounded-2xl border border-gray-800/50 p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div>
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                </div>
                <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
        </div>
    );
}

// Message/Inbox Skeleton
export function MessageSkeleton() {
    return (
        <div className="backdrop-blur-xl bg-gray-900/40 rounded-2xl border border-gray-800/50 p-4">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-full max-w-xs" />
                </div>
                <div className="text-right">
                    <Skeleton className="h-5 w-16 rounded mb-1" />
                    <Skeleton className="h-3 w-12" />
                </div>
            </div>
        </div>
    );
}

// Chart Skeleton
export function ChartSkeleton() {
    return (
        <div className="backdrop-blur-xl bg-gray-900/40 rounded-2xl border border-gray-800/50 p-6">
            <Skeleton className="h-4 w-32 mb-6" />
            <div className="flex items-end justify-between h-40 gap-3">
                {[65, 40, 80, 55, 90, 45, 70].map((height, i) => (
                    <Skeleton key={i} className="flex-1 rounded-t-lg" style={{ height: `${height}%` }} />
                ))}
            </div>
            <div className="flex justify-between mt-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, i) => (
                    <Skeleton key={i} className="h-3 w-6" />
                ))}
            </div>
        </div>
    );
}

// Map Skeleton
export function MapSkeleton() {
    return (
        <div className="backdrop-blur-xl bg-gray-900/40 rounded-2xl border border-gray-800/50 p-6 h-80">
            <Skeleton className="h-4 w-40 mb-4" />
            <div className="relative h-56 rounded-xl overflow-hidden">
                <Skeleton className="absolute inset-0" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                        className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                </div>
            </div>
        </div>
    );
}

// Grid of Stat Card Skeletons
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <StatCardSkeleton key={i} />
            ))}
        </div>
    );
}

// List of Vehicle Skeletons
export function VehicleListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <VehicleCardSkeleton key={i} />
            ))}
        </div>
    );
}
