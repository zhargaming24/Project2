import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db";
import { categories, pockets, wallets } from "../../../../db/schema";
import { handleApiError, requireUserId } from "../../../../lib/server/guard";
import { parseQuickAddText } from "../../../../lib/server/nlu";
import { findBestMatch } from "../../../../lib/server/match";

const schema = z.object({ text: z.string().min(3).max(300) });

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Masukkan teks transaksi terlebih dahulu." }, { status: 400 });
    }

    const result = parseQuickAddText(parsed.data.text);
    if (!result) {
      return Response.json({
        error:
          "Maaf, saya belum bisa mengenali nominal pada kalimat tersebut. Coba sertakan angka, misalnya 'Beli bakso 20 ribu pakai DANA'.",
      }, { status: 422 });
    }

    const [userWallets, userCategories, userPockets] = await Promise.all([
      db.select().from(wallets).where(and(eq(wallets.userId, userId), eq(wallets.isArchived, false))),
      db.select().from(categories).where(eq(categories.userId, userId)),
      db.select().from(pockets).where(and(eq(pockets.userId, userId), eq(pockets.isArchived, false))),
    ]);

    const matchedWallet = findBestMatch(userWallets, result.walletName) ?? userWallets[0];
    const matchedToWallet =
      result.type === "transfer" ? findBestMatch(userWallets, result.toWalletName) : undefined;
    const relevantCategories = userCategories.filter((c) =>
      result.type === "income" ? c.type === "income" : c.type === "expense",
    );
    const matchedCategory = findBestMatch(relevantCategories, result.categoryName);
    const matchedPocket = result.pocketName ? findBestMatch(userPockets, result.pocketName) : undefined;

    return Response.json({
      preview: {
        type: result.type,
        amount: result.amount,
        description: result.description,
        transactionDate: new Date().toISOString().slice(0, 10),
        walletId: matchedWallet?.id ?? null,
        walletName: matchedWallet?.name ?? null,
        toWalletId: matchedToWallet?.id ?? null,
        toWalletName: matchedToWallet?.name ?? null,
        categoryId: matchedCategory?.id ?? null,
        categoryName: matchedCategory?.name ?? null,
        pocketId: matchedPocket?.id ?? null,
        pocketName: matchedPocket?.name ?? null,
        confidence: result.confidence,
      },
      needsWalletSelection: !matchedWallet || userWallets.length === 0,
      needsToWalletSelection: result.type === "transfer" && !matchedToWallet,
      availableWallets: userWallets,
      availableCategories: relevantCategories,
      availablePockets: userPockets,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
