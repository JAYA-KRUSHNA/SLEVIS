'use client';

import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/hooks/useStore';
import { supabase } from '@/lib/supabase';

type AuthView = 'welcome' | 'login' | 'signup' | 'otp' | 'forgot';

// Pre-computed particle positions to avoid hydration mismatch
const PARTICLE_POSITIONS = [
    { left: 15, top: 20, delay: 0.1, duration: 3.5, x: 50, y: -150 },
    { left: 25, top: 35, delay: 0.3, duration: 4.0, x: -80, y: -200 },
    { left: 35, top: 50, delay: 0.5, duration: 3.8, x: 120, y: -180 },
    { left: 45, top: 25, delay: 0.7, duration: 4.2, x: -60, y: -220 },
    { left: 55, top: 60, delay: 0.9, duration: 3.6, x: 90, y: -160 },
    { left: 65, top: 40, delay: 1.1, duration: 4.4, x: -100, y: -190 },
    { left: 75, top: 55, delay: 1.3, duration: 3.4, x: 70, y: -210 },
    { left: 85, top: 30, delay: 1.5, duration: 4.0, x: -40, y: -170 },
    { left: 20, top: 70, delay: 1.7, duration: 3.9, x: 110, y: -230 },
    { left: 30, top: 80, delay: 1.9, duration: 4.1, x: -70, y: -140 },
    { left: 40, top: 15, delay: 0.2, duration: 3.7, x: 80, y: -195 },
    { left: 50, top: 45, delay: 0.4, duration: 4.3, x: -90, y: -185 },
    { left: 60, top: 75, delay: 0.6, duration: 3.5, x: 60, y: -175 },
    { left: 70, top: 22, delay: 0.8, duration: 4.5, x: -50, y: -205 },
    { left: 80, top: 65, delay: 1.0, duration: 3.3, x: 100, y: -155 },
    { left: 18, top: 85, delay: 1.2, duration: 4.0, x: -85, y: -225 },
    { left: 28, top: 42, delay: 1.4, duration: 3.8, x: 75, y: -165 },
    { left: 48, top: 58, delay: 1.6, duration: 4.2, x: -55, y: -215 },
    { left: 68, top: 32, delay: 1.8, duration: 3.6, x: 95, y: -145 },
    { left: 88, top: 48, delay: 2.0, duration: 4.4, x: -65, y: -235 },
];

// Animated background particles with fixed positions
function ParticlesBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {PARTICLE_POSITIONS.map((particle, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
                    initial={{
                        x: particle.x,
                        y: particle.y,
                        opacity: 0
                    }}
                    animate={{
                        y: [0, -100, 0],
                        opacity: [0, 1, 0],
                        scale: [0.5, 1, 0.5]
                    }}
                    transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        delay: particle.delay
                    }}
                    style={{
                        left: `${particle.left}%`,
                        top: `${particle.top}%`
                    }}
                />
            ))}
        </div>
    );
}


export default function AuthModal() {
    const { authStep, setAuthStep, setUser } = useAuthStore();
    const [view, setView] = useState<AuthView>('welcome');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [inputFocus, setInputFocus] = useState<string | null>(null);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Handle Login
    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter email and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (authError) throw authError;

            let userProfile = null;
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                userProfile = profile;
            } catch (profileErr) {
                console.log('Profile fetch skipped (table may not exist)');
            }

            const finalUser = userProfile || {
                id: data.user.id,
                email: data.user.email,
                username: data.user.email?.split('@')[0] || 'User',
                role: data.user.email === 'jayakrushna1622@gmail.com' ? 'super_admin' : 'user',
            };

            setUser(finalUser);
            setAuthStep('authenticated');
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        }

        setLoading(false);
    };

    // Handle Signup - Send OTP
    const handleSignup = async () => {
        if (!email || !username || !password || !confirmPassword) {
            setError('Please fill all fields');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send verification code');
            }

            setSuccess('Verification code sent to your email!');
            setView('otp');
        } catch (err: any) {
            setError(err.message || 'Failed to send verification code');
        }

        setLoading(false);
    };

    // Handle OTP Input
    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    // Verify OTP and Create Account
    const handleVerifyOtp = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    otp: otpCode,
                    username,
                    password
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            let userProfile = null;
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authData.user.id)
                    .single();
                userProfile = profile;
            } catch (profileErr) {
                console.log('Profile fetch skipped (table may not exist)');
            }

            const finalUser = userProfile || {
                id: authData.user.id,
                email: authData.user.email,
                username: username,
                role: data.role || 'user',
            };

            setUser(finalUser);
            setAuthStep('authenticated');
        } catch (err: any) {
            setError(err.message || 'Verification failed');
        }

        setLoading(false);
    };

    // Handle Forgot Password
    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setSuccess('Password reset link sent to your email!');
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link');
        }

        setLoading(false);
    };

    // Reset form
    const resetForm = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setUsername('');
        setOtp(['', '', '', '', '', '']);
        setError('');
        setSuccess('');
    };

    // Handle Google Sign-In
    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Failed to sign in with Google');
            setLoading(false);
        }
    };

    // Panel variants for animation
    const panelVariants = {
        initial: { opacity: 0, scale: 0.9, y: 20, rotateX: -5 },
        animate: { opacity: 1, scale: 1, y: 0, rotateX: 0 },
        exit: { opacity: 0, scale: 0.9, y: -20, rotateX: 5 }
    };

    // Input variants
    const inputVariants = {
        focused: { scale: 1.02, borderColor: 'rgba(0, 240, 255, 0.5)' },
        unfocused: { scale: 1, borderColor: 'rgba(75, 85, 99, 0.5)' }
    };

    // Button variants
    const buttonVariants = {
        idle: { scale: 1 },
        hover: { scale: 1.02, boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)' },
        tap: { scale: 0.98 }
    };

    if (authStep === 'authenticated') return null;

    return (
        <div className="ui-overlay flex items-center justify-center p-4">
            <AnimatePresence mode="wait">
                <motion.div
                    key={view}
                    variants={panelVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="glass-panel p-8 w-full max-w-md relative overflow-hidden"
                    style={{ perspective: '1000px' }}
                >
                    {/* Animated particles background */}
                    <ParticlesBackground />

                    {/* Animated gradient background */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5"
                        animate={{
                            opacity: [0.3, 0.6, 0.3],
                            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
                        }}
                        transition={{ duration: 8, repeat: Infinity }}
                    />

                    {/* HUD Corners with glow */}
                    <motion.div
                        className="hud-corner hud-corner-tl"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.div
                        className="hud-corner hud-corner-tr"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    />
                    <motion.div
                        className="hud-corner hud-corner-bl"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    />
                    <motion.div
                        className="hud-corner hud-corner-br"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                    />

                    {/* Header with typing and glow effect */}
                    <div className="text-center mb-8 relative z-10">
                        <motion.h1
                            className="font-orbitron text-3xl font-bold neon-text mb-2"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <motion.span
                                animate={{
                                    textShadow: [
                                        '0 0 10px rgba(0, 240, 255, 0.5)',
                                        '0 0 30px rgba(0, 240, 255, 0.8)',
                                        '0 0 10px rgba(0, 240, 255, 0.5)'
                                    ]
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                SLEVIS
                            </motion.span>
                        </motion.h1>
                        <motion.p
                            className="text-sm text-gray-400 font-rajdhani tracking-widest uppercase"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {view === 'welcome' && 'Welcome'}
                            {view === 'login' && 'Sign In to Your Account'}
                            {view === 'signup' && 'Create New Account'}
                            {view === 'otp' && 'Verify Your Email'}
                            {view === 'forgot' && 'Reset Password'}
                        </motion.p>
                    </div>

                    {/* Error Message with shake animation */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, x: 0 }}
                                animate={{ opacity: 1, y: 0, x: [0, -10, 10, -10, 10, 0] }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ x: { duration: 0.5 } }}
                                className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm relative z-10"
                            >
                                <motion.span
                                    animate={{ opacity: [1, 0.5, 1] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    ⚠️
                                </motion.span>
                                {' '}{error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Success Message with pop animation */}
                    <AnimatePresence>
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ type: "spring", stiffness: 200 }}
                                className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm relative z-10"
                            >
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", delay: 0.1 }}
                                >
                                    ✅
                                </motion.span>
                                {' '}{success}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Welcome View */}
                    {view === 'welcome' && (
                        <motion.div
                            className="space-y-4 relative z-10"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <motion.p
                                className="text-center text-gray-400 mb-6"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                Choose an option to continue
                            </motion.p>
                            <motion.button
                                onClick={() => { resetForm(); setView('login'); }}
                                className="cyber-button w-full"
                                variants={buttonVariants}
                                initial="idle"
                                whileHover="hover"
                                whileTap="tap"
                            >
                                <motion.span
                                    className="flex items-center justify-center gap-2"
                                >
                                    <motion.span
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    >
                                        →
                                    </motion.span>
                                    LOGIN
                                </motion.span>
                            </motion.button>
                            <motion.button
                                onClick={() => { resetForm(); setView('signup'); }}
                                className="cyber-button-pink cyber-button w-full"
                                variants={buttonVariants}
                                initial="idle"
                                whileHover="hover"
                                whileTap="tap"
                            >
                                <motion.span
                                    className="flex items-center justify-center gap-2"
                                >
                                    <motion.span
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    >
                                        +
                                    </motion.span>
                                    SIGN UP
                                </motion.span>
                            </motion.button>

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-700/50"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-[#0a0a0f] text-gray-500">or continue with</span>
                                </div>
                            </div>

                            {/* Google Sign-In Button */}
                            <motion.button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-lg border border-gray-600/50 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-white font-medium"
                                variants={buttonVariants}
                                initial="idle"
                                whileHover={loading ? "idle" : "hover"}
                                whileTap={loading ? "idle" : "tap"}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Sign in with Google
                            </motion.button>
                        </motion.div>
                    )}

                    {/* Login View */}
                    {view === 'login' && (
                        <motion.div
                            className="space-y-5 relative z-10"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <label className="block text-sm font-rajdhani text-gray-400 mb-2 tracking-wider">
                                    EMAIL ADDRESS
                                </label>
                                <motion.input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setInputFocus('email')}
                                    onBlur={() => setInputFocus(null)}
                                    placeholder="your@email.com"
                                    className="cyber-input"
                                    autoFocus
                                    animate={inputFocus === 'email' ? inputVariants.focused : inputVariants.unfocused}
                                    style={{
                                        boxShadow: inputFocus === 'email' ? '0 0 20px rgba(0, 240, 255, 0.2)' : 'none'
                                    }}
                                />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <label className="block text-sm font-rajdhani text-gray-400 mb-2 tracking-wider">
                                    PASSWORD
                                </label>
                                <motion.input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setInputFocus('password')}
                                    onBlur={() => setInputFocus(null)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                    placeholder="••••••••"
                                    className="cyber-input"
                                    animate={inputFocus === 'password' ? inputVariants.focused : inputVariants.unfocused}
                                    style={{
                                        boxShadow: inputFocus === 'password' ? '0 0 20px rgba(0, 240, 255, 0.2)' : 'none'
                                    }}
                                />
                            </motion.div>

                            <motion.button
                                onClick={handleLogin}
                                disabled={loading}
                                className="cyber-button w-full"
                                variants={buttonVariants}
                                initial="idle"
                                whileHover={loading ? "idle" : "hover"}
                                whileTap={loading ? "idle" : "tap"}
                            >
                                {loading ? (
                                    <motion.span
                                        className="cyber-spinner mx-auto"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    />
                                ) : (
                                    <motion.span className="flex items-center justify-center gap-2">
                                        SIGN IN
                                        <motion.span
                                            animate={{ x: [0, 5, 0] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        >
                                            →
                                        </motion.span>
                                    </motion.span>
                                )}
                            </motion.button>

                            {/* Divider */}
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-700/50"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-[#0a0a0f] text-gray-500">or</span>
                                </div>
                            </div>

                            {/* Google Sign-In Button */}
                            <motion.button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-lg border border-gray-600/50 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-white font-medium"
                                variants={buttonVariants}
                                initial="idle"
                                whileHover={loading ? "idle" : "hover"}
                                whileTap={loading ? "idle" : "tap"}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Sign in with Google
                            </motion.button>

                            <motion.div
                                className="flex justify-between items-center text-sm"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                <motion.button
                                    onClick={() => { resetForm(); setView('forgot'); }}
                                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Forgot Password?
                                </motion.button>
                                <motion.button
                                    onClick={() => { resetForm(); setView('signup'); }}
                                    className="text-gray-500 hover:text-white transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Create Account
                                </motion.button>
                            </motion.div>

                            <motion.button
                                onClick={() => { resetForm(); setView('welcome'); }}
                                className="w-full text-gray-600 hover:text-gray-400 text-sm mt-4 flex items-center justify-center gap-2"
                                whileHover={{ x: -5 }}
                            >
                                <span>←</span> Back
                            </motion.button>
                        </motion.div>
                    )}

                    {/* Signup View */}
                    {view === 'signup' && (
                        <motion.div
                            className="space-y-4 relative z-10"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            {[
                                { label: 'EMAIL ADDRESS', type: 'email', value: email, setter: setEmail, placeholder: 'your@email.com', key: 'email' },
                                { label: 'USERNAME', type: 'text', value: username, setter: setUsername, placeholder: 'Choose a username', key: 'username' },
                                { label: 'PASSWORD (MIN 8 CHARACTERS)', type: 'password', value: password, setter: setPassword, placeholder: '••••••••', key: 'password' },
                                { label: 'CONFIRM PASSWORD', type: 'password', value: confirmPassword, setter: setConfirmPassword, placeholder: '••••••••', key: 'confirmPassword' },
                            ].map((field, index) => (
                                <motion.div
                                    key={field.key}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + index * 0.05 }}
                                >
                                    <label className="block text-sm font-rajdhani text-gray-400 mb-2 tracking-wider">
                                        {field.label}
                                    </label>
                                    <motion.input
                                        type={field.type}
                                        value={field.value}
                                        onChange={(e) => field.setter(e.target.value)}
                                        onFocus={() => setInputFocus(field.key)}
                                        onBlur={() => setInputFocus(null)}
                                        placeholder={field.placeholder}
                                        className="cyber-input"
                                        autoFocus={index === 0}
                                        animate={inputFocus === field.key ? inputVariants.focused : inputVariants.unfocused}
                                        style={{
                                            boxShadow: inputFocus === field.key ? '0 0 20px rgba(0, 240, 255, 0.2)' : 'none'
                                        }}
                                    />
                                </motion.div>
                            ))}

                            <motion.button
                                onClick={handleSignup}
                                disabled={loading}
                                className="cyber-button w-full"
                                variants={buttonVariants}
                                initial="idle"
                                whileHover={loading ? "idle" : "hover"}
                                whileTap={loading ? "idle" : "tap"}
                            >
                                {loading ? (
                                    <motion.span
                                        className="cyber-spinner mx-auto"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    />
                                ) : 'CREATE ACCOUNT'}
                            </motion.button>

                            <motion.div
                                className="text-center text-sm"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                <span className="text-gray-500">Already have an account? </span>
                                <motion.button
                                    onClick={() => { resetForm(); setView('login'); }}
                                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                >
                                    Sign In
                                </motion.button>
                            </motion.div>

                            <motion.button
                                onClick={() => { resetForm(); setView('welcome'); }}
                                className="w-full text-gray-600 hover:text-gray-400 text-sm flex items-center justify-center gap-2"
                                whileHover={{ x: -5 }}
                            >
                                <span>←</span> Back
                            </motion.button>
                        </motion.div>
                    )}

                    {/* OTP Verification View */}
                    {view === 'otp' && (
                        <motion.div
                            className="space-y-6 relative z-10"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="text-center">
                                <p className="text-gray-400 text-sm">
                                    Enter the 6-digit code sent to
                                </p>
                                <motion.p
                                    className="text-cyan-400 font-bold"
                                    animate={{ opacity: [0.7, 1, 0.7] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    {email}
                                </motion.p>
                            </div>
                            <div className="flex justify-center gap-3">
                                {otp.map((digit, index) => (
                                    <motion.input
                                        key={index}
                                        ref={(el) => { otpRefs.current[index] = el; }}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        className="otp-input"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 + index * 0.05 }}
                                        whileFocus={{ scale: 1.1, borderColor: 'rgba(0, 240, 255, 0.8)' }}
                                        style={{
                                            boxShadow: digit ? '0 0 15px rgba(0, 240, 255, 0.3)' : 'none'
                                        }}
                                    />
                                ))}
                            </div>

                            <motion.button
                                onClick={handleVerifyOtp}
                                disabled={loading}
                                className="cyber-button w-full"
                                variants={buttonVariants}
                                initial="idle"
                                whileHover={loading ? "idle" : "hover"}
                                whileTap={loading ? "idle" : "tap"}
                            >
                                {loading ? (
                                    <motion.span
                                        className="cyber-spinner mx-auto"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    />
                                ) : (
                                    <motion.span className="flex items-center justify-center gap-2">
                                        <motion.span
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        >
                                            ✓
                                        </motion.span>
                                        VERIFY & CREATE ACCOUNT
                                    </motion.span>
                                )}
                            </motion.button>

                            <motion.button
                                onClick={() => { setView('signup'); setOtp(['', '', '', '', '', '']); }}
                                className="w-full text-gray-600 hover:text-gray-400 text-sm flex items-center justify-center gap-2"
                                whileHover={{ x: -5 }}
                            >
                                <span>←</span> Back to Signup
                            </motion.button>
                        </motion.div>
                    )}

                    {/* Forgot Password View */}
                    {view === 'forgot' && (
                        <motion.div
                            className="space-y-5 relative z-10"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <motion.p
                                className="text-gray-400 text-sm text-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                Enter your email address and we'll send you a link to reset your password.
                            </motion.p>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <label className="block text-sm font-rajdhani text-gray-400 mb-2 tracking-wider">
                                    EMAIL ADDRESS
                                </label>
                                <motion.input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setInputFocus('forgotEmail')}
                                    onBlur={() => setInputFocus(null)}
                                    placeholder="your@email.com"
                                    className="cyber-input"
                                    autoFocus
                                    animate={inputFocus === 'forgotEmail' ? inputVariants.focused : inputVariants.unfocused}
                                    style={{
                                        boxShadow: inputFocus === 'forgotEmail' ? '0 0 20px rgba(0, 240, 255, 0.2)' : 'none'
                                    }}
                                />
                            </motion.div>

                            <motion.button
                                onClick={handleForgotPassword}
                                disabled={loading}
                                className="cyber-button w-full"
                                variants={buttonVariants}
                                initial="idle"
                                whileHover={loading ? "idle" : "hover"}
                                whileTap={loading ? "idle" : "tap"}
                            >
                                {loading ? (
                                    <motion.span
                                        className="cyber-spinner mx-auto"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    />
                                ) : (
                                    <motion.span className="flex items-center justify-center gap-2">
                                        <motion.span
                                            animate={{ rotate: [0, 15, -15, 0] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        >
                                            📧
                                        </motion.span>
                                        SEND RESET LINK
                                    </motion.span>
                                )}
                            </motion.button>

                            <motion.button
                                onClick={() => { resetForm(); setView('login'); }}
                                className="w-full text-gray-600 hover:text-gray-400 text-sm flex items-center justify-center gap-2"
                                whileHover={{ x: -5 }}
                            >
                                <span>←</span> Back to Login
                            </motion.button>
                        </motion.div>
                    )}

                    {/* Decorative Elements */}
                    <motion.div
                        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
                        animate={{ opacity: [0.3, 0.8, 0.3], width: ['30%', '50%', '30%'] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />

                    {/* Scanning line effect */}
                    <motion.div
                        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
                        animate={{ top: ['0%', '100%'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
