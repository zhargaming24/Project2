import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { budgets, categories, pockets, savingsGoals, transactions, users, wallets } from "../../../../db/schema";
import { handleApiError, requireUserId } from "../../../../lib/server/guard";

export async function GET() {
  try {
    const userId = await requireUserId();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [walletRows, categoryRows, pocketRows, goalRows, budgetRows, txRows] = await Promise.all([
      db.select().from(wallets).where(eq(wallets.userId, userId)),
      db.select().from(categories).where(eq(categories.userId, userId)),
      db.select().from(pockets).where(eq(pockets.userId, userId)),
      db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId)),
      db.select().from(budgets).where(eq(budgets.userId, userId)),
      db.select().from(transactions).where(eq(transactions.userId, userId)),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      profile: user ? { name: user.name, email: user.email, currency: user.currency } : null,
      wallets: walletRows,
      categories: categoryRows,
      pockets: pocketRows,
      savingsGoals: goalRows,
      budgets: budgetRows,
      transactions: txRows,
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="finora-data-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
