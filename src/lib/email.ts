import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResetEmail(to: string, resetUrl: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const { data, error } = await resend.emails.send({
    from: "Gavl <onboarding@resend.dev>",
    to,
    subject: "Reset your Gavl password",
    html: `
      <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1408;">
        <div style="max-width: 480px; margin: 0 auto; padding: 32px 20px;">
          <div style="font-size: 24px; font-weight: 800; margin-bottom: 16px;">Reset your password</div>
          <p style="margin: 0 0 24px;">You requested a password reset for your Gavl account. Click the button below to set a new password:</p>
          <a href="${resetUrl}" style="display: inline-block; background: #c8961e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 16px;">Reset password</a>
          <p style="margin: 24px 0 0; font-size: 14px; color: #1a1408; opacity: 0.7;">This link expires in 1 hour. If you didn’t request this, you can safely ignore this email.</p>
        </div>
      </body>
    `,
  });

  if (error) {
    throw new Error(`Resend rejected the email: ${error.message}`);
  }

  return data;
}
