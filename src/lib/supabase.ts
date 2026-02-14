import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface Profile {
    id: string;
    username: string;
    email: string;
    role: 'super_admin' | 'admin' | 'user';
    created_at: string;
}

export interface Vehicle {
    id: string;
    image_url: string;
    uploader_id: string;
    license_plate: string;
    model: string;
    color: string;
    helmet_detected: boolean;
    violation_type: string;
    timestamp: string;
}

export interface Complaint {
    id: string;
    user_id: string;
    description: string;
    category: string;
    status: 'pending' | 'resolved';
    admin_reply: string | null;
    created_at: string;
}

export interface Message {
    id: string;
    from_admin_id: string;
    from_admin_email: string;
    to_user_id: string;
    to_user_email: string;
    subject: string;
    content: string;
    is_read: boolean;
    created_at: string;
}
