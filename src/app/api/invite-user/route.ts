import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { verifyAdminAuth, verifyAdminCookie } from "@/lib/adminAuth";

// Force Node.js runtime and disable all caching
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Helper to create JSON response without NextResponse
function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-API-Version': 'v2-clean',  // Marker to confirm new deployment
    },
  });
}

// This uses the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    // Verify admin authentication
    // Try Bearer token first (preferred), then fall back to cookie (legacy)
    const authHeader = req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie");
    
    const isAdminByToken = await verifyAdminAuth(authHeader);
    const isAdminByCookie = await verifyAdminCookie(cookieHeader);
    
    if (!isAdminByToken && !isAdminByCookie) {
      return jsonResponse({ error: "Unauthorized - Admin access required" }, 401);
    }

    const { email } = await req.json();

    if (!email) {
      return jsonResponse({ error: "Email is required" }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse({ error: "Invalid email format" }, 400);
    }

    // Try to create the user first (or get existing user)
    let user;
    let userAlreadyExisted = false;
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirm email
      // Don't set a password - they'll set it via the reset link
    });

    if (createError) {
      // Any error from createUser - try to find existing user
      // (Most likely "user already exists" but we handle all errors the same way)
      userAlreadyExisted = true;
      
      // Find user by listing and filtering (Supabase doesn't have getUserByEmail)
      let foundUser = null;
      let page = 1;
      const pageSize = 1000;
      
      while (!foundUser && page <= 10) {
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: pageSize
        });
        
        if (listError) {
          console.error("Error listing users:", listError);
          return jsonResponse({ error: "Failed to process user" }, 500);
        }
        
        const users = listData?.users || [];
        
        // Case-insensitive email match
        foundUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        
        // If found or no more pages, break
        if (foundUser || users.length < pageSize) {
          break;
        }
        
        page++;
      }
      
      if (!foundUser) {
        // User doesn't exist and we couldn't create them - real error
        return jsonResponse({ error: "Failed to create or find user. Please try again." }, 500);
      }
      
      user = foundUser;
    } else {
      // User created successfully
      user = newUser.user;
    }

    // Generate invite link for new users
    // Use serveai.net as default in production, localhost for development
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.NODE_ENV === 'production' ? 'https://serveai.net' : 'http://localhost:3000');
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${siteUrl}/auth/setup-password`,
      }
    });

    if (linkError) {
      console.error("Error generating invite link:", linkError);
      return jsonResponse({ error: linkError.message || "Failed to generate invite link" }, 500);
    }

    // Extract the token from Supabase's link to create our custom clean link
    const supabaseLink = linkData.properties?.action_link;
    let setupLink = supabaseLink;
    
    // If we got a Supabase link, extract the token and create a custom clean link
    if (supabaseLink) {
      try {
        const url = new URL(supabaseLink);
        const token = url.searchParams.get('token');
        const type = url.searchParams.get('type');
        // const redirectTo = url.searchParams.get('redirect_to');
        
        if (token) {
          // Create a clean custom link using our domain
          // The token will be verified by our API route, then redirect to setup page
          setupLink = `${siteUrl}/api/verify-invite?token=${encodeURIComponent(token)}${type ? `&type=${type}` : ''}`;
        }
      } catch (e) {
        // If parsing fails, use the original Supabase link
        console.warn("Could not parse Supabase link, using original:", e);
      }
    }

    if (!setupLink) {
      return jsonResponse({ error: "Failed to generate setup link" }, 500);
    }

    // Send email with the clean custom link
    try {
      // Create email transporter using Google Workspace SMTP
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
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${setupLink}" style="color: #080c24; word-break: break-all; font-size: 12px;">${setupLink}</a>
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
      return jsonResponse({ 
        success: true, 
        message: "User created and link generated, but email failed to send",
        setupLink: setupLink,
        user: user,
        warning: "Please send the setup link manually via email"
      }, 200);
    }

    return jsonResponse({ 
      success: true, 
      message: "Password setup email sent successfully",
      user: user
    }, 200);
  } catch (error) {
    console.error("Error in invite-user API:", error);
    return jsonResponse({ error: "An unexpected error occurred" }, 500);
  }
}
