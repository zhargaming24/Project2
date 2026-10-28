import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../../../db";
import { categories, savingsGoals, transactions } from "../../../db/schema";
import { handleApiError, requireUserId } from "../../../lib/server/guard";
import { addMonths, firstDayOfMonthISO } from "../../../lib/date-id";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || firstDayOfMonthISO();
    const nextMonth = addMonths(month, 1);
    const prevMonth = addMonths(month, -1);

    const categoryRows = await db.select().from(categories).where(eq(categories.userId, userId));
    const categoryMap = new Map(categoryRows.map((c) => [c.id, c]));

    const [thisMonthTx, prevMonthTx] = await Promise.all([
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            gte(transactions.transactionDate, month),
            lte(transactions.transactionDate, nextMonth),
          ),
        ),
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            gte(transactions.transactionDate, prevMonth),
            lte(transactions.transactionDate, month),
          ),
        ),
    ]);

    const income = thisMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = thisMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const prevIncome = prevMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const prevExpense = prevMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const categoryBreakdown = new Map<string, { name: string; color: string; amount: number }>();
    for (const t of thisMonthTx) {
      if (t.type !== "expense") continue;
      const cat = t.categoryId ? categoryMap.get(t.categoryId) : null;
      const key = cat?.id ?? "lainnya";
      const prevEntry = categoryBreakdown.get(key);
      categoryBreakdown.set(key, {
        name: cat?.name ?? "Lainnya",
        color: cat?.color ?? "#64748b",
        amount: (prevEntry?.amount ?? 0) + t.amount,
      });
    }

    const dailyMap = new Map<string, { income: number; expense: number }>();
    for (const t of thisMonthTx) {
      const entry = dailyMap.get(t.transactionDate) ?? { income: 0, expense: 0 };
      if (t.type === "income") entry.income += t.amount;
      if (t.type === "expense") entry.expense += t.amount;
      dailyMap.set(t.transactionDate, entry);
    }
    const dailyTrend = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    const monthlyTrend: Array<{ month: string; income: number; expense: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const start = addMonths(month, -i);
      const end = addMonths(start, 1);
      const txInRange = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            gte(transactions.transactionDate, start),
            lte(transactions.transactionDate, end),
          ),
        );
      monthlyTrend.push({
        month: start,
        income: txInRange.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expense: txInRange.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      });
    }

    const goals = await db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId));

    return Response.json({
      month,
      summary: {
        income,
        expense,
        net: income - expense,
        prevIncome,
        prevExpense,
        prevNet: prevIncome - prevExpense,
        incomeChangePct: prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 100) : null,
        expenseChangePct: prevExpense > 0 ? Math.round(((expense - prevExpense) / prevExpense) * 100) : null,
      },
      categoryBreakdown: Array.from(categoryBreakdown.values()).sort((a, b) => b.amount - a.amount),
      dailyTrend,
      monthlyTrend,
      goalsProgress: goals.map((g) => ({
        name: g.name,
        target: g.targetAmount,
        current: g.currentAmount,
        percent: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
