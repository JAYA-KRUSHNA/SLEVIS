import { create } from 'zustand';
import { Profile } from '@/lib/supabase';

interface AuthState {
    user: Profile | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    authStep: 'email' | 'login' | 'signup' | 'otp' | 'authenticated';
    tempEmail: string;
    setUser: (user: Profile | null) => void;
    setAuthStep: (step: AuthState['authStep']) => void;
    setTempEmail: (email: string) => void;
    setLoading: (loading: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    authStep: 'email',
    tempEmail: '',
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setAuthStep: (authStep) => set({ authStep }),
    setTempEmail: (tempEmail) => set({ tempEmail }),
    setLoading: (isLoading) => set({ isLoading }),
    logout: () => set({ user: null, isAuthenticated: false, authStep: 'email', tempEmail: '' }),
}));

interface UIState {
    currentView: 'landing' | 'auth' | 'dashboard' | 'admin' | 'super_admin';
    sidebarOpen: boolean;
    activePanel: string;
    setCurrentView: (view: UIState['currentView']) => void;
    toggleSidebar: () => void;
    setActivePanel: (panel: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
    currentView: 'landing',
    sidebarOpen: true,
    activePanel: 'analyze', // Default to analyze for all users
    setCurrentView: (currentView) => set({ currentView }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setActivePanel: (activePanel) => set({ activePanel }),
}));

// Stats tracking for dynamic dashboard updates
interface StatsState {
    totalScans: number;
    totalViolations: number;
    totalComplaints: number;
    resolvedComplaints: number;
    incrementScans: (count?: number) => void;
    incrementViolations: (count?: number) => void;
    incrementComplaints: () => void;
    resolveComplaint: () => void;
}

export const useStatsStore = create<StatsState>((set) => ({
    totalScans: 1247,
    totalViolations: 342,
    totalComplaints: 89,
    resolvedComplaints: 76,
    incrementScans: (count = 1) => set((state) => ({ totalScans: state.totalScans + count })),
    incrementViolations: (count = 1) => set((state) => ({ totalViolations: state.totalViolations + count })),
    incrementComplaints: () => set((state) => ({ totalComplaints: state.totalComplaints + 1 })),
    resolveComplaint: () => set((state) => ({ resolvedComplaints: state.resolvedComplaints + 1 })),
}));
