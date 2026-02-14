import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// In-memory OTP storage (in production, use Redis or database)
const otpStore = new Map<string, { otp: string; expires: number }>();

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP with 10-minute expiry
        otpStore.set(email.toLowerCase(), {
            otp,
            expires: Date.now() + 10 * 60 * 1000,
        });

        // Configure nodemailer
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Send email
        await transporter.sendMail({
            from: `"SLEVIS Security" <${process.env.SMTP_USER}>`,
            to: email,
            subject: '🔐 SLEVIS Security Verification Code',
            html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0a0a12 0%, #1a1a2e 100%); padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #00F0FF; font-size: 32px; margin: 0; text-shadow: 0 0 20px rgba(0, 240, 255, 0.5);">SLEVIS</h1>
            <p style="color: #888; font-size: 14px; margin-top: 8px;">Smart Law Enforcement Vehicle Identification System</p>
          </div>
          
          <div style="background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 12px; padding: 30px; text-align: center;">
            <p style="color: #fff; font-size: 16px; margin: 0 0 20px 0;">Your security verification code is:</p>
            <div style="background: #000; border-radius: 8px; padding: 20px; display: inline-block;">
              <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; color: #00F0FF; letter-spacing: 8px;">${otp}</span>
            </div>
            <p style="color: #888; font-size: 14px; margin-top: 20px;">This code expires in 10 minutes.</p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
            <p style="color: #444; font-size: 11px; margin-top: 10px;">© 2026 SLEVIS Command Center</p>
          </div>
        </div>
      `,
        });

        return NextResponse.json({ success: true, message: 'OTP sent successfully' });
    } catch (error: any) {
        console.error('Send OTP Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 });
    }
}

// Export the store for verification
export { otpStore };
