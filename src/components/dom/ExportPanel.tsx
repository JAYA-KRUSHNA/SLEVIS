'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Export options
type ExportFormat = 'pdf' | 'csv' | 'excel';
type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year';

// Format details
const formatDetails: Record<ExportFormat, { icon: string; title: string; desc: string; color: string; gradient: string }> = {
    pdf: { icon: '📄', title: 'PDF Report', desc: 'Complete report with visuals', color: 'rose', gradient: 'from-rose-500 to-pink-600' },
    csv: { icon: '📊', title: 'CSV Data', desc: 'Raw data for analysis', color: 'emerald', gradient: 'from-emerald-500 to-green-600' },
    excel: { icon: '📈', title: 'Excel Workbook', desc: 'Formatted spreadsheet', color: 'blue', gradient: 'from-blue-500 to-cyan-600' },
};

export default function ExportPanel() {
    const [format, setFormat] = useState<ExportFormat>('pdf');
    const [dateRange, setDateRange] = useState<DateRange>('month');
    const [includeCharts, setIncludeCharts] = useState(true);
    const [includeImages, setIncludeImages] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        setExportProgress(0);

        // Simulate progress while generating
        const progressInterval = setInterval(() => {
            setExportProgress(prev => Math.min(prev + 10, 90));
        }, 150);

        await new Promise(resolve => setTimeout(resolve, 1200));

        // Generate actual file content
        const sampleData = [
            { plate: 'KA-01-AB-1234', type: 'No Helmet', date: '2024-01-15', location: 'MG Road Junction', fine: 500, status: 'Paid' },
            { plate: 'KA-01-AB-1234', type: 'Signal Jump', date: '2023-12-22', location: 'City Center', fine: 1000, status: 'Unpaid' },
            { plate: 'KA-01-AB-1234', type: 'Wrong Side', date: '2023-11-08', location: 'Highway NH-44', fine: 2000, status: 'Paid' },
            { plate: 'KA-02-CD-5678', type: 'Overspeeding', date: '2024-01-20', location: 'Ring Road', fine: 1500, status: 'Unpaid' },
            { plate: 'KA-03-EF-9012', type: 'No License', date: '2024-02-01', location: 'Industrial Zone', fine: 5000, status: 'Disputed' },
            { plate: 'KA-03-EF-9012', type: 'No Insurance', date: '2024-01-28', location: 'Industrial Zone', fine: 2000, status: 'Disputed' },
        ];

        let content = '';
        let mimeType = '';
        let extension = '';

        if (format === 'csv' || format === 'excel') {
            // CSV content
            const headers = 'License Plate,Violation Type,Date,Location,Fine (₹),Status';
            const rows = sampleData.map(d => `${d.plate},${d.type},${d.date},${d.location},${d.fine},${d.status}`);
            content = [headers, ...rows].join('\n');
            mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel';
            extension = format === 'csv' ? 'csv' : 'xls';
        } else {
            // PDF-like text report
            content = `SLEVIS - Violation Report\nGenerated: ${new Date().toLocaleString()}\nPeriod: ${dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}\n${'='.repeat(60)}\n\n`;
            content += sampleData.map(d =>
                `Vehicle: ${d.plate}\nViolation: ${d.type}\nDate: ${d.date}\nLocation: ${d.location}\nFine: ₹${d.fine}\nStatus: ${d.status}\n${'-'.repeat(40)}`
            ).join('\n\n');
            content += `\n\nTotal Records: ${sampleData.length}\nTotal Fines: ₹${sampleData.reduce((s, d) => s + d.fine, 0).toLocaleString()}`;
            mimeType = 'text/plain';
            extension = 'txt';
        }

        clearInterval(progressInterval);
        setExportProgress(100);

        // Trigger download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `slevis_report_${dateRange}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        await new Promise(resolve => setTimeout(resolve, 300));
        setExporting(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const colorClasses: Record<string, string> = {
        rose: 'border-rose-500/50 bg-rose-500/10',
        emerald: 'border-emerald-500/50 bg-emerald-500/10',
        blue: 'border-blue-500/50 bg-blue-500/10',
    };

    return (
        <motion.div
            className="w-full space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header — compact */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 120 }}
                className="text-center mb-2"
            >
                <motion.div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 mb-4"
                    animate={{
                        y: [0, -5, 0],
                        boxShadow: [
                            "0 0 15px rgba(0, 240, 255, 0.15)",
                            "0 0 25px rgba(0, 240, 255, 0.3)",
                            "0 0 15px rgba(0, 240, 255, 0.15)"
                        ]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                    <span className="text-2xl">📤</span>
                </motion.div>
                <h2 className="font-orbitron text-2xl font-bold text-white mb-1">
                    Export Reports
                </h2>
                <p className="text-gray-500 text-sm">
                    Generate and download violation data
                </p>
            </motion.div>

            {/* Format Selection — tighter cards */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">Select Format</h3>
                <div className="grid grid-cols-3 gap-3">
                    {(['pdf', 'csv', 'excel'] as ExportFormat[]).map((f, index) => {
                        const details = formatDetails[f];
                        const isSelected = format === f;
                        return (
                            <motion.button
                                key={f}
                                onClick={() => setFormat(f)}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + index * 0.06, type: "spring" }}
                                whileHover={{ scale: 1.03, y: -4 }}
                                whileTap={{ scale: 0.97 }}
                                className={`relative p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden text-center ${isSelected
                                    ? `${colorClasses[details.color]} shadow-lg`
                                    : 'border-gray-700/50 bg-gray-900/40 hover:border-gray-600/50'
                                    }`}
                            >
                                {/* Background gradient */}
                                <motion.div
                                    className={`absolute inset-0 bg-gradient-to-br ${details.gradient} opacity-0`}
                                    animate={{ opacity: isSelected ? 0.08 : 0 }}
                                />

                                <motion.div
                                    className="text-3xl mb-2 relative z-10"
                                    animate={isSelected ? { y: [0, -3, 0] } : {}}
                                    transition={{ duration: 2, repeat: isSelected ? Infinity : 0 }}
                                >
                                    {details.icon}
                                </motion.div>

                                <p className={`font-semibold text-sm mb-1 relative z-10 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                    {details.title}
                                </p>
                                <p className="text-xs text-gray-500 relative z-10">{details.desc}</p>

                                {/* Checkmark */}
                                <AnimatePresence>
                                    {isSelected && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            transition={{ type: "spring", stiffness: 300 }}
                                            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"
                                        >
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <motion.path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={3}
                                                    d="M5 13l4 4L19 7"
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 0.3 }}
                                                />
                                            </svg>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        );
                    })}
                </div>
            </motion.div>

            {/* Date Range — compact pill row */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-5 rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 relative overflow-hidden"
            >
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5"
                    animate={{ opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity }}
                />

                <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3 relative z-10 font-medium">Time Period</h3>
                <div className="flex gap-2 relative z-10">
                    {(['today', 'week', 'month', 'quarter', 'year'] as DateRange[]).map((range, index) => (
                        <motion.button
                            key={range}
                            onClick={() => setDateRange(range)}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 + index * 0.04 }}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden ${dateRange === range
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                                : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                                }`}
                        >
                            {dateRange === range && (
                                <motion.div
                                    className="absolute inset-0 bg-white/10"
                                    animate={{ opacity: [0, 0.15, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            )}
                            <span className="relative z-10">{range.charAt(0).toUpperCase() + range.slice(1)}</span>
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            {/* Options — compact toggle row */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 gap-3"
            >
                {/* Include Charts */}
                <motion.button
                    onClick={() => setIncludeCharts(!includeCharts)}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-2xl border-2 transition-all duration-300 flex items-center gap-3 relative overflow-hidden ${includeCharts
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : 'border-gray-700/50 bg-gray-900/40'
                        }`}
                >
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10"
                        animate={{ opacity: includeCharts ? 1 : 0 }}
                    />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl relative z-10 shrink-0 ${includeCharts ? 'bg-purple-500/20' : 'bg-gray-800/50'}`}>
                        📊
                    </div>
                    <div className="text-left flex-1 relative z-10 min-w-0">
                        <p className={`font-semibold text-sm ${includeCharts ? 'text-white' : 'text-gray-400'}`}>
                            Include Charts
                        </p>
                        <p className="text-xs text-gray-500">Visual graphs</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-all duration-300 relative z-10 shrink-0 ${includeCharts ? 'bg-purple-500' : 'bg-gray-700'}`}>
                        <motion.div
                            className="w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white shadow-lg"
                            animate={{ x: includeCharts ? 20 : 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                    </div>
                </motion.button>

                {/* Include Images */}
                <motion.button
                    onClick={() => setIncludeImages(!includeImages)}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-2xl border-2 transition-all duration-300 flex items-center gap-3 relative overflow-hidden ${includeImages
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-gray-700/50 bg-gray-900/40'
                        }`}
                >
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10"
                        animate={{ opacity: includeImages ? 1 : 0 }}
                    />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl relative z-10 shrink-0 ${includeImages ? 'bg-amber-500/20' : 'bg-gray-800/50'}`}>
                        🖼️
                    </div>
                    <div className="text-left flex-1 relative z-10 min-w-0">
                        <p className={`font-semibold text-sm ${includeImages ? 'text-white' : 'text-gray-400'}`}>
                            Include Images
                        </p>
                        <p className="text-xs text-gray-500">Violation photos</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-all duration-300 relative z-10 shrink-0 ${includeImages ? 'bg-amber-500' : 'bg-gray-700'}`}>
                        <motion.div
                            className="w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white shadow-lg"
                            animate={{ x: includeImages ? 20 : 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                    </div>
                </motion.button>
            </motion.div>

            {/* Export Summary + Button — unified card */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-5 rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 space-y-4"
            >
                {/* Quick stats row */}
                <div className="flex items-center justify-around py-2">
                    {[
                        { value: '~247', label: 'Records', color: 'text-cyan-400' },
                        { value: '12', label: 'Locations', color: 'text-purple-400' },
                        { value: '~2.4 MB', label: 'Size', color: 'text-amber-400' },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            className="text-center"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45 + i * 0.08 }}
                        >
                            <p className={`font-orbitron text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Divider */}
                <div className="border-t border-gray-800/60" />

                {/* Export button */}
                <AnimatePresence mode="wait">
                    {showSuccess ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center"
                        >
                            <motion.div
                                className="text-3xl mb-1"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 200 }}
                            >
                                ✅
                            </motion.div>
                            <p className="text-emerald-400 font-semibold">Export Complete!</p>
                            <p className="text-gray-500 text-sm">Your file is downloading...</p>
                        </motion.div>
                    ) : (
                        <motion.button
                            key="button"
                            onClick={handleExport}
                            disabled={exporting}
                            whileHover={{ scale: exporting ? 1 : 1.02, y: exporting ? 0 : -2 }}
                            whileTap={{ scale: exporting ? 1 : 0.98 }}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 font-semibold text-white text-base disabled:opacity-80 relative overflow-hidden group"
                        >
                            {/* Shine */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                initial={{ x: '-100%' }}
                                animate={{ x: '100%' }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                            />

                            <div className="relative z-10">
                                {exporting ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center gap-3">
                                            <motion.div
                                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            />
                                            <span className="text-sm">Generating {format.toUpperCase()}...</span>
                                        </div>
                                        <div className="w-full max-w-xs mx-auto bg-white/20 rounded-full h-2 overflow-hidden">
                                            <motion.div
                                                className="h-full bg-white rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${exportProgress}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-white/60">{exportProgress}% complete</p>
                                    </div>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="text-lg">📥</span>
                                        <span>Generate & Download</span>
                                    </span>
                                )}
                            </div>
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}
