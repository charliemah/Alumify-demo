import { Resend } from "resend";
import { config } from "./config.js";

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const html = `
    <p>You requested a password reset for your Alumify account.</p>
    <p><a href="${resetUrl}" style="color:#6366f1">Reset your password</a></p>
    <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  `;
  if (resend) {
    const { error } = await resend.emails.send({
      from: config.fromEmail,
      to,
      subject: "Reset your Alumify password",
      html,
    });
    return !error;
  }
  // Dev fallback: log the link
  config.nodeEnv === "development" && console.log("[DEV] Password reset link:", resetUrl);
  return true;
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<boolean> {
  const html = `
    <p>Verify your email address to complete your Alumify signup.</p>
    <p><a href="${verifyUrl}" style="color:#6366f1">Verify email</a></p>
    <p>This link expires in 24 hours.</p>
  `;
  if (resend) {
    const { error } = await resend.emails.send({
      from: config.fromEmail,
      to,
      subject: "Verify your Alumify email",
      html,
    });
    return !error;
  }
  config.nodeEnv === "development" && console.log("[DEV] Email verification link:", verifyUrl);
  return true;
}
