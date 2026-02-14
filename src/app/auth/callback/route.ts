import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const origin = requestUrl.origin;

    if (code) {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('OAuth callback error:', error);
            return NextResponse.redirect(`${origin}?error=auth_error`);
        }
    }

    // Redirect to home page after successful authentication
    return NextResponse.redirect(origin);
}
