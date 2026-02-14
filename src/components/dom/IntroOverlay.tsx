'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

interface IntroOverlayProps {
    onComplete: () => void;
}

// ─── Boot text lines ───
const bootLines = [
    { text: '> INITIALIZING SLEVIS CORE v4.2.1...', color: '#00F0FF' },
    { text: '> LOADING NEURAL NETWORK MODULES [████████████] 100%', color: '#00F0FF' },
    { text: '> CONNECTING TO SURVEILLANCE GRID... ESTABLISHED', color: '#00F0FF' },
    { text: '> CALIBRATING AI DETECTION ENGINE... OK', color: '#00ff88' },
    { text: '> SYNCING 847 CAMERA NODES... ONLINE', color: '#00F0FF' },
    { text: '> ENCRYPTION LAYER: AES-256-GCM ACTIVE', color: '#9D00FF' },
    { text: '> THREAT DETECTION: ARMED', color: '#FF0099' },
    { text: '> ALL SYSTEMS OPERATIONAL ✓', color: '#00ff88' },
];

// ─── Feature cards data ───
const features = [
    {
        icon: '🛡️',
        title: 'AI Detection',
        description: 'Real-time vehicle identification powered by deep neural networks & computer vision',
        color: '#00F0FF',
        stats: '99.7% Accuracy',
    },
    {
        icon: '📡',
        title: 'Live Monitoring',
        description: 'City-wide surveillance grid with instant violation alerts & threat detection',
        color: '#FF0099',
        stats: '847 Nodes Online',
    },
    {
        icon: '📊',
        title: 'Smart Analytics',
        description: 'Predictive insights, pattern recognition & comprehensive traffic analysis',
        color: '#9D00FF',
        stats: '2.4M Records',
    },
];

// ─── Stats for counter animation ───
const stats = [
    { label: 'Cities Connected', value: 12, suffix: '' },
    { label: 'Active Cameras', value: 847, suffix: '' },
    { label: 'Violations Detected', value: 24689, suffix: '' },
    { label: 'System Uptime', value: 99.9, suffix: '%' },
];

// ─── Animated Counter Component ───
function AnimatedCounter({ value, suffix, duration = 2 }: { value: number; suffix: string; duration?: number }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const steps = 60;
        const increment = value / steps;
        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
                setCount(value);
                clearInterval(timer);
            } else {
                setCount(Number.isInteger(value) ? Math.floor(current) : parseFloat(current.toFixed(1)));
            }
        }, (duration * 1000) / steps);
        return () => clearInterval(timer);
    }, [value, duration]);

    return (
        <span>
            {typeof count === 'number' && Number.isInteger(value)
                ? count.toLocaleString()
                : count}
            {suffix}
        </span>
    );
}

// ─── Canvas Particle System (optimized: 40 particles, no connections, no shadowBlur) ───
function ParticleCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const setSize = () => {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            ctx.scale(dpr, dpr);
        };
        setSize();

        const w = () => window.innerWidth;
        const h = () => window.innerHeight;

        const particles: Array<{
            x: number; y: number; vx: number; vy: number;
            size: number; opacity: number; color: string; life: number; maxLife: number;
        }> = [];

        const colors = ['#00F0FF', '#FF0099', '#9D00FF', '#00ff88'];

        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * w(),
                y: Math.random() * h(),
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.6,
                size: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.5 + 0.2,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: Math.random() * 200,
                maxLife: 200 + Math.random() * 200,
            });
        }

        let animId: number;
        const animate = () => {
            ctx.clearRect(0, 0, w(), h());

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life++;

                if (p.life > p.maxLife) {
                    p.x = Math.random() * w();
                    p.y = Math.random() * h();
                    p.life = 0;
                }
                if (p.x < 0) p.x = w();
                if (p.x > w()) p.x = 0;
                if (p.y < 0) p.y = h();
                if (p.y > h()) p.y = 0;

                const fadeIn = Math.min(p.life / 30, 1);
                const fadeOut = Math.max((p.maxLife - p.life) / 30, 0);
                ctx.globalAlpha = p.opacity * Math.min(fadeIn, fadeOut);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            animId = requestAnimationFrame(animate);
        };

        animate();

        const handleResize = () => setSize();
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0"
            style={{ opacity: 0.7 }}
        />
    );
}

// ─── Matrix Rain Background (optimized: no shadowBlur, skip every other col) ───
function MatrixRain() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const chars = 'SLEVIS0123456789@#$%^&*';
        const fontSize = 14;
        const columns = Math.floor(canvas.width / fontSize);
        // only use every other column to halve draw calls
        const activeColumns: number[] = [];
        for (let i = 0; i < columns; i += 2) activeColumns.push(i);
        const drops = new Array(columns).fill(1).map(() => Math.random() * -50);

        ctx.font = `${fontSize}px monospace`;

        let animId: number;
        const draw = () => {
            ctx.fillStyle = 'rgba(2, 2, 5, 0.08)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let idx = 0; idx < activeColumns.length; idx++) {
                const i = activeColumns[idx];
                const y = drops[i];
                const char = chars[Math.floor(Math.random() * chars.length)];
                const x = i * fontSize;

                ctx.fillStyle = '#00F0FF';
                ctx.fillText(char, x, y * fontSize);

                if (y * fontSize > canvas.height && Math.random() > 0.96) {
                    drops[i] = 0;
                }
                drops[i] += 0.6;
            }

            animId = requestAnimationFrame(draw);
        };

        draw();

        return () => cancelAnimationFrame(animId);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{ opacity: 0.2 }}
        />
    );
}

// ─── HUD Data Readouts ───
function HUDReadouts({ phase }: { phase: number }) {
    const [time, setTime] = useState('');
    const [coords, setCoords] = useState({ lat: 17.3850, lng: 78.4867 });

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-US', { hour12: false }));
            setCoords(c => ({
                lat: c.lat + (Math.random() - 0.5) * 0.0001,
                lng: c.lng + (Math.random() - 0.5) * 0.0001,
            }));
        }, 500);
        return () => clearInterval(timer);
    }, []);

    return (
        <>
            {/* Top-left HUD */}
            <motion.div
                className="absolute top-6 left-6 font-mono text-[10px] leading-relaxed z-10"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 0.6, x: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <div style={{ color: '#00F0FF' }}>SYS.TIME: {time}</div>
                <div style={{ color: '#00ff88' }}>STATUS: ACTIVE</div>
                <div style={{ color: '#9D00FF' }}>ENC: AES-256</div>
                <div style={{ color: '#FF0099' }}>PHASE: {phase + 1}/4</div>
            </motion.div>

            {/* Top-right HUD */}
            <motion.div
                className="absolute top-6 right-6 font-mono text-[10px] leading-relaxed text-right z-10"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 0.6, x: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <div style={{ color: '#00F0FF' }}>LAT: {coords.lat.toFixed(4)}°N</div>
                <div style={{ color: '#00F0FF' }}>LNG: {coords.lng.toFixed(4)}°E</div>
                <div style={{ color: '#00ff88' }}>NET: 847 NODES</div>
                <div style={{ color: '#FF0099' }}>THREAT LVL: LOW</div>
            </motion.div>

            {/* Bottom-left HUD */}
            <motion.div
                className="absolute bottom-14 left-6 font-mono text-[10px] z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 1 }}
            >
                <div style={{ color: '#00F0FF' }}>SLEVIS COMMAND CENTER v4.2.1</div>
                <div style={{ color: 'rgba(255,255,255,0.3)' }}>© 2026 SLEVIS SYSTEMS</div>
            </motion.div>
        </>
    );
}

// ─── Scan Line Effect ───
function ScanLine() {
    return (
        <motion.div
            className="absolute left-0 right-0 h-[2px] z-20 pointer-events-none"
            style={{
                background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.4), rgba(0,240,255,0.6), rgba(0,240,255,0.4), transparent)',
            }}
            animate={{
                top: ['-2px', '100%'],
            }}
            transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'linear',
            }}
        />
    );
}

// ─── Glitch Text Component ───
function GlitchText({ children, className = '' }: { children: string; className?: string }) {
    return (
        <span className={`intro-glitch-text ${className}`} data-text={children}>
            {children}
        </span>
    );
}

// ─── Hexagon Grid Background ───
function HexGrid() {
    return (
        <div className="absolute inset-0 overflow-hidden opacity-[0.04]">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="hexGrid" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                        <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100" fill="none" stroke="#00F0FF" strokeWidth="0.5" />
                        <path d="M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34" fill="none" stroke="#00F0FF" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#hexGrid)" />
            </svg>
        </div>
    );
}

// ═══════════════════════════════════════════
// MAIN INTRO OVERLAY COMPONENT
// ═══════════════════════════════════════════
export default function IntroOverlay({ onComplete }: IntroOverlayProps) {
    const [phase, setPhase] = useState(0); // 0=boot, 1=logo, 2=features, 3=cta
    const [visibleLines, setVisibleLines] = useState(0);
    const [isExiting, setIsExiting] = useState(false);
    const [progress, setProgress] = useState(0);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Mouse parallax
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        mouseX.set((clientX - innerWidth / 2) / innerWidth);
        mouseY.set((clientY - innerHeight / 2) / innerHeight);
    }, [mouseX, mouseY]);

    const parallaxX = useTransform(mouseX, [-0.5, 0.5], [-15, 15]);
    const parallaxY = useTransform(mouseY, [-0.5, 0.5], [-15, 15]);

    // Phase 0: Boot sequence
    useEffect(() => {
        if (phase !== 0) return;
        const interval = setInterval(() => {
            setVisibleLines((prev) => {
                if (prev >= bootLines.length) {
                    clearInterval(interval);
                    setTimeout(() => setPhase(1), 800);
                    return prev;
                }
                setProgress(((prev + 1) / bootLines.length) * 100);
                return prev + 1;
            });
        }, 300);
        return () => clearInterval(interval);
    }, [phase]);

    // Phase transitions
    useEffect(() => {
        if (phase === 1) {
            const t = setTimeout(() => setPhase(2), 3000);
            return () => clearTimeout(t);
        }
        if (phase === 2) {
            const t = setTimeout(() => setPhase(3), 3500);
            return () => clearTimeout(t);
        }
    }, [phase]);

    // Keyboard shortcut to skip
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleEnter();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    const handleEnter = useCallback(() => {
        if (isExiting) return;
        setIsExiting(true);
        setTimeout(onComplete, 1000);
    }, [onComplete, isExiting]);

    return (
        <AnimatePresence>
            {!isExiting ? (
                <motion.div
                    key="intro-overlay"
                    className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
                    style={{ background: '#020205' }}
                    onMouseMove={handleMouseMove}
                    exit={{
                        opacity: 0,
                        scale: 1.15,
                        filter: 'blur(30px) brightness(2)',
                        transition: { duration: 1, ease: 'easeInOut' },
                    }}
                >
                    {/* ─── Background Layers ─── */}
                    <HexGrid />
                    <ParticleCanvas />
                    {phase === 0 && <MatrixRain />}
                    <ScanLine />

                    {/* Vignette */}
                    <div
                        className="absolute inset-0 z-[1] pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(2,2,5,0.8) 100%)',
                        }}
                    />

                    {/* Radial glow pulse — pure CSS animation for perf */}
                    <div
                        className="absolute inset-0 z-[1] pointer-events-none intro-radial-pulse"
                    />

                    {/* HUD Readouts */}
                    <HUDReadouts phase={phase} />

                    {/* ═══════════════════════════════════════
              PHASE 0: BOOT SEQUENCE
              ═══════════════════════════════════════ */}
                    <AnimatePresence mode="wait">
                        {phase === 0 && (
                            <motion.div
                                key="boot"
                                className="absolute inset-0 flex flex-col items-center justify-center z-10"
                                exit={{ opacity: 0, y: -40, filter: 'blur(10px)', transition: { duration: 0.5 } }}
                            >
                                {/* Boot terminal */}
                                <motion.div
                                    className="w-[90%] max-w-2xl p-6 rounded-lg relative"
                                    style={{
                                        background: 'rgba(0,0,0,0.6)',
                                        border: '1px solid rgba(0,240,255,0.15)',
                                        boxShadow: '0 0 30px rgba(0,240,255,0.05), inset 0 0 30px rgba(0,0,0,0.5)',
                                    }}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    {/* Terminal header */}
                                    <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(0,240,255,0.1)' }}>
                                        <div className="w-3 h-3 rounded-full bg-red-500/70" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/70" />
                                        <span className="ml-3 font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                            SLEVIS SYSTEM TERMINAL — BOOT SEQUENCE
                                        </span>
                                    </div>

                                    {/* Boot lines */}
                                    <div className="font-mono text-xs md:text-sm space-y-1.5 min-h-[200px]">
                                        {bootLines.slice(0, visibleLines).map((line, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex items-center gap-2"
                                            >
                                                <span style={{ color: line.color, textShadow: `0 0 8px ${line.color}50` }}>
                                                    {line.text}
                                                </span>
                                                {i === visibleLines - 1 && i < bootLines.length - 1 && (
                                                    <span className="typing-cursor">&nbsp;</span>
                                                )}
                                                {i === bootLines.length - 1 && i === visibleLines - 1 && (
                                                    <motion.span
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="text-green-400"
                                                    >
                                                        ✓
                                                    </motion.span>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(0,240,255,0.1)' }}>
                                        <div className="flex justify-between font-mono text-[10px] mb-1.5">
                                            <span style={{ color: 'rgba(255,255,255,0.4)' }}>SYSTEM INITIALIZATION</span>
                                            <span style={{ color: '#00F0FF' }}>{Math.round(progress)}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,240,255,0.1)' }}>
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{
                                                    background: 'linear-gradient(90deg, #00F0FF, #9D00FF, #FF0099)',
                                                    boxShadow: '0 0 10px #00F0FF',
                                                }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}

                        {/* ═══════════════════════════════════════
                PHASE 1: LOGO REVEAL
                ═══════════════════════════════════════ */}
                        {phase === 1 && (
                            <motion.div
                                key="logo"
                                className="absolute inset-0 flex flex-col items-center justify-center z-10"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, scale: 0.9, filter: 'blur(15px)', transition: { duration: 0.5 } }}
                            >
                                {/* Expanding rings */}
                                {[0, 1, 2].map((i) => (
                                    <motion.div
                                        key={`ring-${i}`}
                                        className="absolute rounded-full"
                                        initial={{ width: 0, height: 0, opacity: 0.8 }}
                                        animate={{ width: 500 + i * 200, height: 500 + i * 200, opacity: 0 }}
                                        transition={{ duration: 2, delay: i * 0.3, ease: 'easeOut' }}
                                        style={{
                                            border: `1px solid ${i === 0 ? '#00F0FF' : i === 1 ? '#FF0099' : '#9D00FF'}`,
                                            boxShadow: `0 0 40px ${i === 0 ? 'rgba(0,240,255,0.3)' : i === 1 ? 'rgba(255,0,153,0.3)' : 'rgba(157,0,255,0.3)'}`,
                                        }}
                                    />
                                ))}

                                {/* Diamond decoration */}
                                <motion.div
                                    className="absolute"
                                    initial={{ rotate: 45, scale: 0, opacity: 0 }}
                                    animate={{ rotate: 45, scale: 1, opacity: 0.15 }}
                                    transition={{ duration: 1.5, delay: 0.3 }}
                                    style={{
                                        width: 250,
                                        height: 250,
                                        border: '1px solid #00F0FF',
                                    }}
                                />

                                <motion.div style={{ x: parallaxX, y: parallaxY }} className="flex flex-col items-center">
                                    {/* Title with glitch */}
                                    <motion.h1
                                        className="font-orbitron text-6xl md:text-9xl font-black tracking-widest relative"
                                        initial={{ scale: 0.2, opacity: 0, filter: 'blur(30px)' }}
                                        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                                    >
                                        <GlitchText className="intro-title-gradient">SLEVIS</GlitchText>
                                    </motion.h1>

                                    {/* Decorative line */}
                                    <motion.div
                                        className="flex items-center gap-3 mt-4"
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 'auto', opacity: 1 }}
                                        transition={{ delay: 0.7, duration: 0.6 }}
                                    >
                                        <div className="h-[1px] w-16 md:w-24" style={{ background: 'linear-gradient(90deg, transparent, #00F0FF)' }} />
                                        <motion.div
                                            className="w-2 h-2 rotate-45"
                                            style={{ background: '#00F0FF', boxShadow: '0 0 10px #00F0FF' }}
                                            animate={{ rotate: [45, 225, 405] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                        />
                                        <div className="h-[1px] w-16 md:w-24" style={{ background: 'linear-gradient(90deg, #00F0FF, transparent)' }} />
                                    </motion.div>

                                    {/* Staggered tagline */}
                                    <motion.div className="flex gap-2 md:gap-4 mt-6 flex-wrap justify-center px-4">
                                        {['Smart', 'Law', 'Enforcement', 'Vehicle', 'Identification', 'System'].map(
                                            (word, i) => (
                                                <motion.span
                                                    key={word}
                                                    className="font-rajdhani text-sm md:text-xl tracking-[0.2em] uppercase"
                                                    initial={{ opacity: 0, y: 30, rotateX: -90 }}
                                                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                                                    transition={{ delay: 0.6 + i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                                    style={{
                                                        color: 'rgba(255,255,255,0.6)',
                                                        textShadow: '0 0 10px rgba(0,240,255,0.3)',
                                                    }}
                                                >
                                                    {word}
                                                </motion.span>
                                            )
                                        )}
                                    </motion.div>

                                    {/* Subtitle */}
                                    <motion.p
                                        className="font-rajdhani text-xs md:text-sm tracking-[0.4em] uppercase mt-4"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 0.4 }}
                                        transition={{ delay: 1.5, duration: 0.5 }}
                                        style={{ color: '#FF0099' }}
                                    >
                                        AI-Powered Command Center
                                    </motion.p>
                                </motion.div>
                            </motion.div>
                        )}

                        {/* ═══════════════════════════════════════
                PHASE 2: FEATURE SHOWCASE + STATS
                ═══════════════════════════════════════ */}
                        {phase === 2 && (
                            <motion.div
                                key="features"
                                className="absolute inset-0 flex flex-col items-center justify-center px-4 z-10"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                            >
                                {/* Feature cards */}
                                <div className="flex flex-col md:flex-row gap-5 md:gap-6 mb-10">
                                    {features.map((feature, i) => (
                                        <motion.div
                                            key={feature.title}
                                            className="intro-card relative p-5 md:p-7 rounded-2xl text-center w-64 md:w-72 group"
                                            initial={{
                                                opacity: 0,
                                                x: i === 0 ? -100 : i === 2 ? 100 : 0,
                                                y: i === 1 ? 80 : 0,
                                                scale: 0.7,
                                                rotateY: i === 0 ? 15 : i === 2 ? -15 : 0,
                                            }}
                                            animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotateY: 0 }}
                                            transition={{
                                                delay: i * 0.2,
                                                duration: 0.7,
                                                ease: [0.16, 1, 0.3, 1],
                                            }}
                                            whileHover={{
                                                scale: 1.05,
                                                rotateY: 5,
                                                transition: { duration: 0.3 },
                                            }}
                                            style={{ perspective: 1000 }}
                                        >
                                            {/* Animated border glow */}
                                            <motion.div
                                                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                                style={{
                                                    background: `linear-gradient(135deg, ${feature.color}20, transparent, ${feature.color}10)`,
                                                }}
                                            />

                                            {/* Top accent line */}
                                            <motion.div
                                                className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: '60%' }}
                                                transition={{ delay: 0.5 + i * 0.2, duration: 0.5 }}
                                                style={{ background: feature.color, boxShadow: `0 0 10px ${feature.color}` }}
                                            />

                                            <motion.div
                                                className="text-4xl md:text-5xl mb-3"
                                                animate={{ y: [0, -8, 0] }}
                                                transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.3 }}
                                            >
                                                {feature.icon}
                                            </motion.div>
                                            <h3
                                                className="font-orbitron text-xs md:text-sm font-bold mb-2 tracking-wider"
                                                style={{ color: feature.color, textShadow: `0 0 10px ${feature.color}50` }}
                                            >
                                                {feature.title}
                                            </h3>
                                            <p className="font-rajdhani text-[11px] md:text-xs text-gray-400 leading-relaxed mb-3">
                                                {feature.description}
                                            </p>

                                            {/* Stats badge */}
                                            <motion.div
                                                className="inline-block px-3 py-1 rounded-full font-mono text-[10px] font-bold"
                                                style={{
                                                    background: `${feature.color}15`,
                                                    border: `1px solid ${feature.color}30`,
                                                    color: feature.color,
                                                }}
                                                initial={{ opacity: 0, scale: 0 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.8 + i * 0.2, duration: 0.3 }}
                                            >
                                                {feature.stats}
                                            </motion.div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Stats counter row */}
                                <motion.div
                                    className="flex gap-6 md:gap-10"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8, duration: 0.5 }}
                                >
                                    {stats.map((stat, i) => (
                                        <motion.div
                                            key={stat.label}
                                            className="text-center"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 1 + i * 0.15 }}
                                        >
                                            <div
                                                className="font-orbitron text-xl md:text-2xl font-bold"
                                                style={{ color: '#00F0FF', textShadow: '0 0 15px rgba(0,240,255,0.5)' }}
                                            >
                                                <AnimatedCounter value={stat.value} suffix={stat.suffix} duration={1.5} />
                                            </div>
                                            <div className="font-rajdhani text-[10px] md:text-xs text-gray-500 tracking-wider uppercase mt-1">
                                                {stat.label}
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </motion.div>
                        )}

                        {/* ═══════════════════════════════════════
                PHASE 3: CTA
                ═══════════════════════════════════════ */}
                        {phase === 3 && (
                            <motion.div
                                key="cta"
                                className="absolute inset-0 flex flex-col items-center justify-center z-10"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <motion.div style={{ x: parallaxX, y: parallaxY }} className="flex flex-col items-center">
                                    {/* Mini logo */}
                                    <motion.h2
                                        className="font-orbitron text-4xl md:text-6xl font-black mb-2 tracking-widest"
                                        initial={{ opacity: 0, y: -30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                    >
                                        <GlitchText className="intro-title-gradient">SLEVIS</GlitchText>
                                    </motion.h2>

                                    {/* Separator */}
                                    <motion.div
                                        className="flex items-center gap-3 mb-4"
                                        initial={{ opacity: 0, scaleX: 0 }}
                                        animate={{ opacity: 1, scaleX: 1 }}
                                        transition={{ delay: 0.3, duration: 0.5 }}
                                    >
                                        <div className="h-[1px] w-12" style={{ background: 'linear-gradient(90deg, transparent, #FF0099)' }} />
                                        <div className="w-1.5 h-1.5 rotate-45" style={{ background: '#FF0099', boxShadow: '0 0 8px #FF0099' }} />
                                        <div className="h-[1px] w-12" style={{ background: 'linear-gradient(90deg, #FF0099, transparent)' }} />
                                    </motion.div>

                                    <motion.p
                                        className="font-rajdhani text-gray-400 text-sm md:text-base tracking-[0.25em] uppercase mb-10"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4, duration: 0.5 }}
                                    >
                                        Command Center Awaits
                                    </motion.p>

                                    {/* CTA button */}
                                    <motion.button
                                        onClick={handleEnter}
                                        className="intro-cta-button font-orbitron text-xs md:text-sm font-semibold tracking-[0.3em] uppercase px-10 py-4 md:px-14 md:py-5 cursor-pointer relative overflow-hidden group"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.97 }}
                                    >
                                        {/* Sweep effect */}
                                        <motion.div
                                            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                                            style={{
                                                background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.2), transparent)',
                                            }}
                                        />
                                        <span className="relative z-10">Enter Command Center</span>
                                    </motion.button>

                                    {/* Shortcut hint */}
                                    <motion.div
                                        className="flex items-center gap-2 mt-8"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 1.5 }}
                                    >
                                        <span className="text-gray-600 text-xs font-rajdhani tracking-widest">
                                            PRESS
                                        </span>
                                        <span
                                            className="px-2 py-0.5 rounded text-[10px] font-mono"
                                            style={{
                                                border: '1px solid rgba(255,255,255,0.15)',
                                                color: 'rgba(255,255,255,0.3)',
                                                background: 'rgba(255,255,255,0.03)',
                                            }}
                                        >
                                            ENTER
                                        </span>
                                        <span className="text-gray-600 text-xs font-rajdhani tracking-widest">
                                            TO CONTINUE
                                        </span>
                                    </motion.div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ─── Corner HUD decorations ─── */}
                    {[
                        'top-3 left-3 border-l-2 border-t-2',
                        'top-3 right-3 border-r-2 border-t-2',
                        'bottom-3 left-3 border-l-2 border-b-2',
                        'bottom-3 right-3 border-r-2 border-b-2',
                    ].map((cls, i) => (
                        <motion.div
                            key={cls}
                            className={`absolute w-8 h-8 ${cls} z-10`}
                            style={{ borderColor: 'rgba(0,240,255,0.25)' }}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
                        />
                    ))}

                    {/* ─── Phase progress dots ─── */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
                        {[0, 1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                className="rounded-full cursor-pointer"
                                animate={{
                                    width: phase === i ? 28 : 8,
                                    height: 8,
                                    backgroundColor: phase >= i ? '#00F0FF' : 'rgba(255,255,255,0.1)',
                                    boxShadow: phase === i ? '0 0 15px #00F0FF' : 'none',
                                }}
                                transition={{ duration: 0.4, ease: 'easeInOut' }}
                            />
                        ))}
                    </div>
                </motion.div>
            ) : (
                /* ─── Exit animation ─── */
                <motion.div
                    key="intro-exit"
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    style={{ background: '#020205' }}
                >
                    {/* Flash */}
                    <motion.div
                        className="absolute inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.8, 0] }}
                        transition={{ duration: 0.4 }}
                        style={{ background: 'rgba(0,240,255,0.3)' }}
                    />
                    {/* Radial wipe */}
                    <motion.div
                        className="absolute inset-0"
                        style={{ background: '#020205' }}
                        initial={{ clipPath: 'circle(100% at 50% 50%)' }}
                        animate={{ clipPath: 'circle(0% at 50% 50%)' }}
                        transition={{ duration: 0.9, delay: 0.15, ease: [0.76, 0, 0.24, 1] }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
