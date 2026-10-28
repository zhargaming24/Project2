"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Send, Bot, User } from "lucide-react";
import { apiGet, apiPost } from "../../../lib/client/api";
import { Card } from "../../../components/ui/surfaces";
import { Button } from "../../../components/ui/controls";
import { formatWaktuID } from "../../../lib/date-id";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const SUGGESTIONS = [
  "Berapa pengeluaran saya bulan ini?",
  "Kategori pengeluaran terbesar saya apa?",
  "Berapa sisa uang makan saya?",
  "Apakah anggaran saya aman sampai akhir bulan?",
  "Berapa yang perlu saya tabung setiap bulan?",
  "Bantu buatkan anggaran bulanan.",
];

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<{ conversationId: string | null; messages: Message[] }>("/api/ai/chat");
        setConversationId(data.conversationId);
        setMessages(data.messages);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuat percakapan.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: text, createdAt: new Date().toISOString() },
    ]);
    setInput("");
    try {
      const data = await apiPost<{ conversationId: string; answer: string }>("/api/ai/chat", {
        message: text,
        conversationId: conversationId || undefined,
      });
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        { id: `${tempId}-answer`, role: "assistant", content: data.answer, createdAt: new Date().toISOString() },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim pesan.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4 animate-fade-in md:h-[calc(100vh-6rem)]">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="text-primary" size={22} /> Finora AI Assistant
        </h1>
        <p className="text-sm text-muted">
          Tanyakan kondisi keuangan Anda — jawaban dihitung langsung dari data transaksi, dompet, dan anggaran Anda.
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden" padding={false}>
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-muted">Memuat percakapan...</p>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-dark">
                <Bot size={26} />
              </div>
              <p className="font-semibold">Halo! Saya Finora AI Assistant.</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Saya bisa membantu menjawab pertanyaan keuangan Anda berdasarkan data yang sudah tercatat.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    m.role === "user" ? "bg-primary text-white" : "bg-primary-soft text-primary-dark"
                  }`}
                >
                  {m.role === "user" ? <User size={15} /> : <Bot size={15} />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user" ? "bg-primary text-white" : "bg-surface-muted text-foreground"
                }`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <p className={`mt-1 text-[10px] ${m.role === "user" ? "text-emerald-100" : "text-muted"}`}>
                    {formatWaktuID(m.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-dark">
                <Bot size={15} />
              </div>
              <div className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-muted">
                Finora AI sedang menghitung jawaban...
              </div>
            </div>
          )}
        </div>

        {messages.length === 0 && !loading && (
          <div className="flex flex-wrap gap-2 border-t border-border p-4">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-muted hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanyakan sesuatu tentang keuangan Anda..."
            className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm focus-ring focus-visible:border-primary"
          />
          <Button type="submit" icon={<Send size={16} />} loading={sending} disabled={!input.trim()}>
            Kirim
          </Button>
        </form>
      </Card>
    </div>
  );
}
