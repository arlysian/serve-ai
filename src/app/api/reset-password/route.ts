import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// This uses the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      // Still return success to prevent email enumeration
      return NextResponse.json(
        { 
          success: true, 
          message: "If an account exists with this email, a password reset link has been sent." 
        },
        { status: 200 }
      );
    }

    // Generate password reset link using Supabase
    // Use serveai.net as default in production, localhost for development
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.NODE_ENV === 'production' ? 'https://serveai.net' : 'http://localhost:3000');
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${siteUrl}/auth/setup-password`,
      }
    });

    if (linkError) {
      console.error("Error generating password reset link:", linkError);
      return NextResponse.json(
        { error: linkError.message || "Failed to generate password reset link" },
        { status: 500 }
      );
    }

    // Extract the token from Supabase's link to create our custom link
    const supabaseLink = linkData.properties?.action_link;
    let resetLink = supabaseLink;
    
    // If we got a Supabase link, extract the token and create a custom link
    if (supabaseLink) {
      try {
        const url = new URL(supabaseLink);
        const token = url.searchParams.get('token');
        const type = url.searchParams.get('type');
        
        if (token) {
          // Create a clean custom link using our domain
          resetLink = `${siteUrl}/auth/reset-password?token=${encodeURIComponent(token)}${type ? `&type=${type}` : ''}`;
        }
      } catch (e) {
        // If parsing fails, use the original Supabase link
        console.warn("Could not parse Supabase link, using original:", e);
      }
    }

    if (!resetLink) {
      return NextResponse.json(
        { error: "Failed to generate reset link" },
        { status: 500 }
      );
    }

    // Send email with the password reset link
    try {
      // Create email transporter (using same config as invite emails)
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || "ServeAI <info@serveai.net>",
        to: email,
        replyTo: "info@serveai.net",
        subject: "Reset your ServeAI account password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #080c24; margin-bottom: 10px;">Reset Your Password</h1>
              <p style="color: #666; font-size: 16px;">We received a request to reset your password</p>
            </div>
            
            <div style="background-color: #f5f4f1; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
              <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                Click the button below to reset your password. If you didn't request this, you can safely ignore this email.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" 
                   style="display: inline-block; padding: 14px 32px; background-color: #080c24; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                Or copy and paste this link into your browser:<br>
                <a href="${resetLink}" style="color: #080c24; word-break: break-all;">${resetLink}</a>
              </p>
            </div>
            
            <div style="border-top: 1px solid #e5e5e5; padding-top: 20px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This link will expire in 1 hour. If you didn't request this, please contact us at 
                <a href="mailto:info@serveai.net" style="color: #080c24;">info@serveai.net</a>
              </p>
            </div>
          </div>
        `,
        text: `
Reset Your Password

We received a request to reset your password. Click the link below to reset it:

${resetLink}

This link will expire in 1 hour. If you didn't request this, please contact us at info@serveai.net
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError: unknown) {
      console.error("Error sending email:", emailError);
      
      // Provide more helpful error message for authentication errors
      if (emailError && typeof emailError === 'object' && 'code' in emailError && (emailError as { code?: string }).code === 'EAUTH') {
        console.error("SMTP Authentication failed. Make sure you're using an App Password, not your regular Gmail password.");
        return NextResponse.json(
          { 
            error: "Email configuration error. Please contact support." 
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "Failed to send password reset email. Please try again later." 
        },
        { status: 500 }
      );
    }

    // Return success (don't reveal if user exists)
    return NextResponse.json(
      { 
        success: true, 
        message: "If an account exists with this email, a password reset link has been sent." 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in reset-password API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

