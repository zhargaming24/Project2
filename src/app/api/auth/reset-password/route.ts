import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../../db";
import { passwordResetTokens, users } from "../../../../db/schema";
import { resetPasswordSchema } from "../../../../lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
        { status: 400 },
      );
    }
    const { token, password } = parsed.data;

    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, token), isNull(passwordResetTokens.usedAt)))
      .limit(1);

    if (!record || record.expiresAt < new Date()) {
      return Response.json(
        { error: "Tautan reset tidak valid atau sudah kedaluwarsa." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Terjadi kesalahan. Silakan coba lagi." }, { status: 500 });
  }
}
