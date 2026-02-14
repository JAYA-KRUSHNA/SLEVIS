'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/hooks/useStore';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/dom/AuthModal';
import IntroOverlay from '@/components/dom/IntroOverlay';

// Dynamic import for 3D scene to avoid SSR issues
const Scene3D = dynamic(() => import('@/components/canvas/Scene3D'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-[#020205] flex items-center justify-center z-0">
      <div className="text-center">
        <div className="cyber-spinner mx-auto mb-4" />
        <p className="text-cyan-400 font-orbitron text-sm tracking-widest">INITIALIZING SYSTEM</p>
      </div>
    </div>
  ),
});

// Dynamic import for Dashboard
const Dashboard = dynamic(() => import('@/components/dom/Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-[#020205] flex items-center justify-center z-50">
      <div className="text-center">
        <div className="cyber-spinner mx-auto mb-4" />
        <p className="text-cyan-400 font-orbitron text-sm tracking-widest">LOADING COMMAND CENTER</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const { authStep, setUser, setAuthStep } = useAuthStore();
  const isAuthenticated = authStep === 'authenticated';
  const [showIntro, setShowIntro] = useState(true);

  // Check for existing session on mount (handles OAuth redirect)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // User is logged in via OAuth or existing session
        let userProfile = null;
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          userProfile = profile;
        } catch (err) {
          console.log('Profile fetch skipped');
        }

        const finalUser = userProfile || {
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.email?.split('@')[0] || 'User',
          role: (session.user.email === 'jayakrushna1622@gmail.com' ? 'super_admin' : 'user') as 'super_admin' | 'admin' | 'user',
          created_at: new Date().toISOString(),
        };

        setUser(finalUser);
        setAuthStep('authenticated');
        setShowIntro(false); // skip intro if already logged in
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Fetch real profile from DB to get the correct role
        let userProfile = null;
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          userProfile = profile;
        } catch (err) {
          console.log('Profile fetch on auth change skipped');
        }

        const finalUser = userProfile || {
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.email?.split('@')[0] || 'User',
          role: (session.user.email === 'jayakrushna1622@gmail.com' ? 'super_admin' : 'user') as 'super_admin' | 'admin' | 'user',
          created_at: new Date().toISOString(),
        };
        setUser(finalUser);
        setAuthStep('authenticated');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthStep('email');
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setAuthStep]);

  // When authenticated, render ONLY the dashboard (no wrapper, truly fullscreen)
  if (isAuthenticated) {
    return <Dashboard />;
  }

  // Login/landing page with 3D scene
  return (
    <main className="scanlines fixed inset-0 overflow-hidden">
      {/* Cinematic Intro Overlay */}
      {showIntro && (
        <IntroOverlay onComplete={() => setShowIntro(false)} />
      )}

      {/* 3D Scene Background */}
      <Scene3D />

      {/* Auth Modal (visible after intro finishes) */}
      {!showIntro && <AuthModal />}

      {/* Landing Title (visible after intro finishes) */}
      {!showIntro && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 text-center pointer-events-none z-20">
          <h1 className="font-orbitron text-4xl md:text-6xl font-black tracking-wider mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 neon-text">
              SLEVIS
            </span>
          </h1>
          <p className="font-rajdhani text-gray-400 text-sm md:text-lg tracking-[0.2em] uppercase">
            Smart Law Enforcement Vehicle Identification System
          </p>
        </div>
      )}

      {/* Version Badge */}
      {!showIntro && (
        <div className="fixed bottom-4 right-4 text-xs text-gray-600 font-orbitron z-20">
          v1.0.0 | COMMAND CENTER
        </div>
      )}
    </main>
  );
}

