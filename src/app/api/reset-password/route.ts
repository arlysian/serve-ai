import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { checkRateLimit } from "@/lib/rateLimit";

// This uses the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Generic success message - same whether user exists or not
const SUCCESS_MESSAGE = "If an account exists with this email, a password reset link has been sent.";

export async function POST(req: Request) {
  try {
    // --- RATE LIMITING ---
    // 3 password reset requests per 15 minutes per IP
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown-ip";

    const isAllowed = await checkRateLimit(
      `reset-password:${ipAddress}`,
      3,
      15 * 60 * 1000 // 15 minutes
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Too many password reset attempts. Please try again in 15 minutes." },
        { status: 429, headers: { "Retry-After": "900" } }
      );
    }

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

    // Check if user exists in Supabase authentication/users
    // Search with case-insensitive email matching and handle pagination
    let user = null;
    let page = 1;
    const pageSize = 1000; // Supabase default page size
    
    while (!user) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: pageSize
      });
      
      if (listError) {
        console.error("Error listing users:", listError);
        // Don't reveal internal errors - return success message
        return NextResponse.json(
          { success: true, message: SUCCESS_MESSAGE },
          { status: 200 }
        );
      }
      
      // Case-insensitive email match
      user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      // If no user found and we've reached the last page, break
      if (!user && users.length < pageSize) {
        break;
      }
      
      // If user not found and there might be more pages, continue
      if (!user && users.length === pageSize) {
        page++;
        continue;
      }
      
      // User found or no more pages
      break;
    }

    // If user doesn't exist, return the same success message (prevent email enumeration)
    if (!user) {
      return NextResponse.json(
        { success: true, message: SUCCESS_MESSAGE },
        { status: 200 }
      );
    }

    // Generate password reset link using Supabase
    // Use serveai.net as default in production, localhost for development
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.NODE_ENV === 'production' ? 'https://serveai.net' : 'http://localhost:3000');
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(), // Use lowercase to ensure consistency
      options: {
        redirectTo: `${siteUrl}/auth/setup-password`,
      }
    });

    if (linkError) {
      console.error("Error generating password reset link:", linkError);
      // Don't reveal errors - return success message
      return NextResponse.json(
        { success: true, message: SUCCESS_MESSAGE },
        { status: 200 }
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
          // Create a clean custom link using our domain (same format as invite links)
          resetLink = `${siteUrl}/api/verify-invite?token=${encodeURIComponent(token)}${type ? `&type=${type}` : ''}`;
        }
      } catch (e) {
        // If parsing fails, use the original Supabase link
        console.warn("Could not parse Supabase link, using original:", e);
      }
    }

    if (!resetLink) {
      // Don't reveal errors - return success message
      return NextResponse.json(
        { success: true, message: SUCCESS_MESSAGE },
        { status: 200 }
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
      
      // Log the full error for debugging
      if (emailError instanceof Error) {
        console.error("Email error details:", {
          message: emailError.message,
          stack: emailError.stack,
          name: emailError.name
        });
      }
      
      // Don't reveal email sending errors to prevent enumeration
      // Return success message anyway
    }

    // Return success (same message whether email sent or not)
    return NextResponse.json(
      { success: true, message: SUCCESS_MESSAGE },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in reset-password API:", error);
    // Don't reveal internal errors
    return NextResponse.json(
      { success: true, message: SUCCESS_MESSAGE },
      { status: 200 }
    );
  }
}
