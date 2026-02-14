import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

export async function POST(request: NextRequest) {
    try {
        const { email, otp, username, password } = await request.json();

        if (!email || !otp || !username || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const emailLower = email.toLowerCase();

        // For demo purposes, accept any 6-digit OTP
        // In production, implement proper OTP verification with Redis/DB
        if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
            return NextResponse.json({ error: 'Invalid OTP format. Must be 6 digits.' }, { status: 400 });
        }

        // For demo: Accept OTP "123456" or any 6 digits
        // In production, verify against stored OTP

        // Determine role based on email
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'jayakrushna1622@gmail.com';
        const role = emailLower === superAdminEmail.toLowerCase() ? 'super_admin' : 'user';

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: emailLower,
            password: password,
            email_confirm: true,
        });

        if (authError) {
            console.error('Auth Error:', authError);

            // Check if user already exists
            if (authError.message?.includes('already been registered')) {
                return NextResponse.json({
                    error: 'An account with this email already exists. Please login instead.'
                }, { status: 400 });
            }

            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // Try to create profile - handle if table doesn't exist
        try {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    email: emailLower,
                    username: username,
                    role: role,
                    created_at: new Date().toISOString(),
                });

            if (profileError) {
                console.error('Profile Error:', profileError);
                // Don't fail the whole signup if profile creation fails
                // The profile can be created on next login
            }
        } catch (profileErr) {
            console.error('Profile creation error (table may not exist):', profileErr);
            // Continue anyway - user account is created
        }

        return NextResponse.json({
            success: true,
            message: 'Account created successfully! You can now login.',
            role: role
        });
    } catch (error: any) {
        console.error('Verify OTP Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to create account. Please try again.'
        }, { status: 500 });
    }
}
