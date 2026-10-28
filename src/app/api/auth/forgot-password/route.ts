import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { passwordResetTokens, users } from "../../../../db/schema";
import { forgotPasswordSchema } from "../../../../lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Format email tidak valid." }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // Jangan bocorkan apakah email terdaftar atau tidak.
    if (!user || !user.passwordHash) {
      return Response.json({
        ok: true,
        message: "Jika email terdaftar, tautan reset kata sandi telah dibuat.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });

    const resetLink = `/reset-password?token=${token}`;

    const resendKey = process.env.RESEND_API_KEY;
    let emailSent = false;
    if (resendKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || "Finora AI <onboarding@resend.dev>",
            to: email,
            subject: "Reset Kata Sandi Finora AI",
            html: `<p>Klik tautan berikut untuk mengatur ulang kata sandi Anda (berlaku 1 jam):</p><p><a href="${process.env.NEXTAUTH_URL || ""}${resetLink}">Reset Kata Sandi</a></p>`,
          }),
        });
        emailSent = res.ok;
      } catch (err) {
        console.error("Gagal mengirim email reset:", err);
      }
    }

    return Response.json({
      ok: true,
      message: emailSent
        ? "Tautan reset kata sandi telah dikirim ke email Anda."
        : "Mode pengujian: layanan email belum dikonfigurasi. Gunakan tautan berikut untuk reset kata sandi.",
      devResetLink: emailSent ? undefined : resetLink,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Terjadi kesalahan. Silakan coba lagi." }, { status: 500 });
  }
}
