import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { handleApiError, requireUserId } from "../../../../lib/server/guard";

export async function POST() {
  try {
    const userId = await requireUserId();
    await db.delete(users).where(eq(users.id, userId));
    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
