import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { registerSchema } from "../../../../lib/validation";
import { seedDefaultCategoriesForUser } from "../../../../lib/server/seed-defaults";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
        { status: 400 },
      );
    }
    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    if (existing) {
      return Response.json(
        { error: "Email sudah terdaftar. Silakan masuk." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({ name, email: normalizedEmail, passwordHash })
      .returning();

    await seedDefaultCategoriesForUser(user.id);

    return Response.json({ ok: true, userId: user.id });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Gagal membuat akun. Silakan coba lagi." }, { status: 500 });
  }
}
