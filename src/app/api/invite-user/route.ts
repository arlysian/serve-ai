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

    // First, create the user (or get existing user)
    let user;
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === email);

    if (existingUser) {
      user = existingUser;
    } else {
      // Create a new user without a password
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true, // Auto-confirm email
        // Don't set a password - they'll set it via the reset link
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return NextResponse.json(
          { error: createError.message || "Failed to create user" },
          { status: 500 }
        );
      }
      user = newUser.user;
    }

    // Generate invite link for new users (better for password setup)
    // Use serveai.net as default in production, localhost for development
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.NODE_ENV === 'production' ? 'https://serveai.net' : 'http://localhost:3000');
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${siteUrl}/auth/setup-password`,
      }
    });

    if (linkError) {
      console.error("Error generating password reset link:", linkError);
      return NextResponse.json(
        { error: linkError.message || "Failed to generate password setup link" },
        { status: 500 }
      );
    }

    // The link is in linkData.properties.action_link
    const setupLink = linkData.properties?.action_link;

    if (!setupLink) {
      return NextResponse.json(
        { error: "Failed to generate setup link" },
        { status: 500 }
      );
    }


    // Send email with the password setup link
    try {
      // Create email transporter (using same config as pricing requests)
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
        subject: "Set up your ServeAI account password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #080c24; margin-bottom: 10px;">Welcome to ServeAI</h1>
              <p style="color: #666; font-size: 16px;">Your account has been created!</p>
            </div>
            
            <div style="background-color: #f5f4f1; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
              <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                Thank you for choosing ServeAI! To get started, please set up your password by clicking the button below:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${setupLink}" 
                   style="display: inline-block; padding: 14px 32px; background-color: #080c24; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Set Up Password
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                Or copy and paste this link into your browser:<br>
                <a href="${setupLink}" style="color: #080c24; word-break: break-all;">${setupLink}</a>
              </p>
            </div>
            
            <div style="border-top: 1px solid #e5e5e5; padding-top: 20px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This link will expire in 24 hours. If you didn't request this, please contact us at 
                <a href="mailto:info@serveai.net" style="color: #080c24;">info@serveai.net</a>
              </p>
            </div>
          </div>
        `,
        text: `
Welcome to ServeAI

Your account has been created! To get started, please set up your password by visiting this link:

${setupLink}

This link will expire in 24 hours. If you didn't request this, please contact us at info@serveai.net
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      // Still return success with the link, so you can send it manually if needed
      return NextResponse.json(
        { 
          success: true, 
          message: "User created and link generated, but email failed to send",
          setupLink: setupLink, // Include link in case email fails
          user: user,
          warning: "Please send the setup link manually via email"
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: "Password setup email sent successfully",
        user: user
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in invite-user API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

