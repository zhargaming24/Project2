import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { db } from "../../../../db";
import { aiConversations, aiMessages } from "../../../../db/schema";
import { handleApiError, requireUserId } from "../../../../lib/server/guard";
import { buildFinancialContext } from "../../../../lib/server/ai-context";
import { answerFromRules, buildSystemPrompt, callOpenAI } from "../../../../lib/server/ai-chat";

const schema = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().uuid().optional(),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const [conversation] = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(asc(aiConversations.createdAt))
      .limit(1);

    if (!conversation) {
      return Response.json({ conversationId: null, messages: [] });
    }

    const messages = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversation.id))
      .orderBy(asc(aiMessages.createdAt));

    return Response.json({ conversationId: conversation.id, messages });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Pesan tidak valid." }, { status: 400 });
    }

    let conversationId = parsed.data.conversationId;
    if (!conversationId) {
      const [existing] = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.userId, userId))
        .limit(1);
      if (existing) {
        conversationId = existing.id;
      } else {
        const [created] = await db
          .insert(aiConversations)
          .values({ userId, title: "Percakapan dengan Finora AI" })
          .returning();
        conversationId = created.id;
      }
    }

    await db.insert(aiMessages).values({
      conversationId,
      role: "user",
      content: parsed.data.message,
    });

    const context = await buildFinancialContext(userId);
    const ruleAnswer = answerFromRules(parsed.data.message, context);

    let answer = ruleAnswer;
    const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);

    if (hasOpenAiKey) {
      const history = await db
        .select()
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, conversationId))
        .orderBy(asc(aiMessages.createdAt));

      const systemPrompt = buildSystemPrompt(context);
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...history.slice(-10).map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        })),
      ];
      const aiAnswer = await callOpenAI(messages);
      if (aiAnswer) answer = aiAnswer;
    }

    if (!answer) {
      answer =
        "Maaf, saya belum bisa menjawab pertanyaan ini secara spesifik berdasarkan data Anda saat ini. Coba tanyakan tentang pengeluaran bulan ini, kategori terbesar, sisa kantong, status anggaran, atau rencana tabungan Anda.";
    }

    await db.insert(aiMessages).values({
      conversationId,
      role: "assistant",
      content: answer,
    });

    return Response.json({ conversationId, answer });
  } catch (error) {
    return handleApiError(error);
  }
}
