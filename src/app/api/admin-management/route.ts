import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client with service role key - bypasses RLS
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
        const { action, email, password, userId, role } = await request.json();

        if (!action) {
            return NextResponse.json({ error: 'Action is required' }, { status: 400 });
        }

        // ── Fetch all admins ──
        if (action === 'list-admins') {
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('id, email, role, username')
                .in('role', ['admin', 'super_admin'])
                .order('created_at', { ascending: true });

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }
            return NextResponse.json({ success: true, admins: data || [] });
        }

        // ── Fetch all users ──
        if (action === 'list-users') {
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('id, email, username, role, created_at')
                .order('created_at', { ascending: false });

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }
            return NextResponse.json({ success: true, users: data || [] });
        }

        // ── Add / promote admin ──
        if (action === 'add-admin') {
            if (!email) {
                return NextResponse.json({ error: 'Email is required' }, { status: 400 });
            }

            // Check if user already exists in profiles
            const { data: existingUser } = await supabaseAdmin
                .from('profiles')
                .select('id, email, role')
                .eq('email', email.toLowerCase())
                .single();

            if (existingUser) {
                // Promote existing user to admin
                const { error: updateError } = await supabaseAdmin
                    .from('profiles')
                    .update({ role: 'admin' })
                    .eq('id', existingUser.id);

                if (updateError) {
                    return NextResponse.json({ error: `Failed to promote user: ${updateError.message}` }, { status: 400 });
                }
                return NextResponse.json({ success: true, message: `${email} promoted to admin!` });
            }

            // Create new user
            if (!password || password.length < 6) {
                return NextResponse.json({ error: 'Password must be at least 6 characters for new users' }, { status: 400 });
            }

            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: email.toLowerCase(),
                password: password,
                email_confirm: true,
            });

            if (authError) {
                return NextResponse.json({ error: `Failed to create user: ${authError.message}` }, { status: 400 });
            }

            if (authData.user) {
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .upsert({
                        id: authData.user.id,
                        email: email.toLowerCase(),
                        username: email.split('@')[0],
                        role: 'admin',
                        created_at: new Date().toISOString(),
                    });

                if (profileError) {
                    return NextResponse.json({
                        error: `User created but failed to set admin role: ${profileError.message}`
                    }, { status: 400 });
                }
            }

            return NextResponse.json({ success: true, message: `Admin ${email} added successfully!` });
        }

        // ── Demote admin to user ──
        if (action === 'demote-admin') {
            if (!userId) {
                return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
            }

            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({ role: 'user' })
                .eq('id', userId);

            if (updateError) {
                return NextResponse.json({ error: `Failed to demote admin: ${updateError.message}` }, { status: 400 });
            }
            return NextResponse.json({ success: true, message: 'Admin demoted to regular user' });
        }

        // ── Delete user ──
        if (action === 'delete-user') {
            if (!userId) {
                return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
            }

            const { error: deleteError } = await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (deleteError) {
                return NextResponse.json({ error: `Failed to delete user: ${deleteError.message}` }, { status: 400 });
            }
            return NextResponse.json({ success: true, message: 'User deleted successfully' });
        }

        // ── Update user role ──
        if (action === 'update-role') {
            if (!userId || !role) {
                return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 });
            }

            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({ role })
                .eq('id', userId);

            if (updateError) {
                return NextResponse.json({ error: `Failed to update role: ${updateError.message}` }, { status: 400 });
            }
            return NextResponse.json({ success: true, message: 'Role updated successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Admin Management Error:', error);
        return NextResponse.json({
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}
