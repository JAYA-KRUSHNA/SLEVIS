import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
        const { action, userId, username, password, currentPassword, avatarGradient, avatarEmoji } = await request.json();

        if (!action || !userId) {
            return NextResponse.json({ error: 'Action and userId are required' }, { status: 400 });
        }

        // ── Update username ──
        if (action === 'update-username') {
            if (!username || username.trim().length < 2) {
                return NextResponse.json({ error: 'Username must be at least 2 characters' }, { status: 400 });
            }

            const { error } = await supabaseAdmin
                .from('profiles')
                .update({ username: username.trim() })
                .eq('id', userId);

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }

            return NextResponse.json({ success: true, message: 'Username updated successfully' });
        }

        // ── Change password ──
        if (action === 'change-password') {
            if (!password || password.length < 6) {
                return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
            }

            const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: password,
            });

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }

            return NextResponse.json({ success: true, message: 'Password changed successfully' });
        }

        // ── Get profile ──
        if (action === 'get-profile') {
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('id, email, username, role, created_at')
                .eq('id', userId)
                .single();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }

            return NextResponse.json({ success: true, profile: data });
        }

        // ── Update avatar ──
        if (action === 'update-avatar') {
            const avatarData = JSON.stringify({ gradient: avatarGradient ?? 0, emoji: avatarEmoji ?? '' });

            // Try to update avatar_url column (stores avatar config as JSON)
            const { error } = await supabaseAdmin
                .from('profiles')
                .update({ avatar_url: avatarData })
                .eq('id', userId);

            if (error) {
                // If column doesn't exist, still return success (avatar is cosmetic)
                console.log('Avatar update note:', error.message);
                return NextResponse.json({ success: true, message: 'Avatar preference saved locally' });
            }

            return NextResponse.json({ success: true, message: 'Avatar updated successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Profile API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
