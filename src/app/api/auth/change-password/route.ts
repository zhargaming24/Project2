import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { handleApiError, requireUserId, ApiError } from "../../../../lib/server/guard";

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Kata sandi baru minimal 8 karakter"),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
        { status: 400 },
      );
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new ApiError("Pengguna tidak ditemukan.", 404);

    if (user.passwordHash) {
      if (!parsed.data.currentPassword) {
        throw new ApiError("Masukkan kata sandi Anda saat ini.");
      }
      const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
      if (!valid) throw new ApiError("Kata sandi saat ini salah.");
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));
    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
