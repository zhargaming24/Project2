"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  Scale,
  PiggyBank,
  Target,
  Plus,
  ArrowLeftRight,
  Sparkles,
  PieChart as PieChartIcon,
  Lightbulb,
  Database,
} from "lucide-react";
import { apiGet, apiPost } from "../../../lib/client/api";
import { Card, Skeleton, EmptyState, ProgressBar, Badge } from "../../../components/ui/surfaces";
import { Button } from "../../../components/ui/controls";
import { formatIDR, formatCompactIDR } from "../../../lib/money";
import { formatTanggalID } from "../../../lib/date-id";
import { AppIcon } from "../../../components/icon-map";
import { TrendChart } from "../../../components/charts/trend-chart";
import { CategoryPieChart } from "../../../components/charts/category-pie-chart";
import { AiQuickAdd } from "../../../components/dashboard/ai-quick-add";
import type { DashboardSummary } from "../../../lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    try {
      const summary = await apiGet<DashboardSummary>("/api/dashboard/summary");
      setData(summary);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSeedDemo() {
    setSeeding(true);
    try {
      await apiPost("/api/demo/seed");
      toast.success("Data demo berhasil ditambahkan.");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat data demo.");
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!data) return null;

  const hasDemo = data.wallets.some((w) => w.isDemo);

  const insight = buildInsight(data);

  return (
    <div className="space-y-6 animate-fade-in">
      {!data.hasWallets && (
        <Card className="border-primary/30 bg-primary-soft/60">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-primary-dark">Mulai dengan menambahkan dompet pertama Anda</p>
              <p className="text-sm text-muted">Catat Tunai, BCA, DANA, atau dompet lain beserta saldonya.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/dompet">
                <Button icon={<Plus size={16} />}>Tambah Dompet</Button>
              </Link>
              <Button variant="secondary" onClick={handleSeedDemo} loading={seeding} icon={<Database size={16} />}>
                Coba Data Demo
              </Button>
            </div>
          </div>
        </Card>
      )}

      {hasDemo && (
        <div className="flex items-center justify-between rounded-xl border border-dashed border-warning/40 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <span>Beberapa data berlabel (Demo) sedang ditampilkan untuk simulasi.</span>
          <Link href="/pengaturan" className="font-semibold underline">
            Kelola data demo
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<WalletIcon size={18} />}
          label="Total Saldo Dompet"
          value={formatIDR(data.totalWalletBalance)}
          tone="primary"
        />
        <StatCard icon={<TrendingUp size={18} />} label="Pemasukan Bulan Ini" value={formatIDR(data.monthIncome)} tone="success" />
        <StatCard icon={<TrendingDown size={18} />} label="Pengeluaran Bulan Ini" value={formatIDR(data.monthExpense)} tone="danger" />
        <StatCard
          icon={<Scale size={18} />}
          label="Arus Kas Bersih"
          value={formatIDR(data.netCashflow)}
          tone={data.netCashflow >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-1">
          <p className="text-xs text-muted">Sudah Dialokasikan</p>
          <p className="mt-1 text-xl font-bold">{formatIDR(data.totalPocketBalance + data.totalGoalBalance)}</p>
          <p className="mt-1 text-xs text-muted">Kantong {formatCompactIDR(data.totalPocketBalance)} · Tabungan {formatCompactIDR(data.totalGoalBalance)}</p>
        </Card>
        <Card className="sm:col-span-1">
          <p className="text-xs text-muted">Belum Dialokasikan</p>
          <p className={`mt-1 text-xl font-bold ${data.unallocated < 0 ? "text-danger" : ""}`}>{formatIDR(data.unallocated)}</p>
          <p className="mt-1 text-xs text-muted">Uang bebas yang belum ditentukan tujuannya</p>
        </Card>
        <Card className="sm:col-span-1">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-primary" />
            <p className="text-xs font-semibold text-primary-dark">Insight Keuangan</p>
          </div>
          <p className="mt-1.5 text-sm text-muted">{insight}</p>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <QuickAction icon={<Plus size={18} />} label="Tambah Transaksi" onClick={() => router.push("/transaksi?new=expense")} />
        <QuickAction icon={<ArrowLeftRight size={18} />} label="Transfer Uang" onClick={() => router.push("/transaksi?new=transfer")} />
        <QuickAction icon={<PiggyBank size={18} />} label="Tambah Tabungan" onClick={() => router.push("/tabungan?new=1")} />
        <QuickAction icon={<PieChartIcon size={18} />} label="Buat Anggaran" onClick={() => router.push("/anggaran?new=1")} />
        <QuickAction icon={<Sparkles size={18} />} label="Tanya AI" onClick={() => router.push("/ai")} />
      </div>

      <AiQuickAdd onSaved={load} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h3 className="mb-4 text-sm font-semibold">Pemasukan vs Pengeluaran (6 Bulan Terakhir)</h3>
          <TrendChart data={data.trend} />
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Pengeluaran per Kategori (Bulan Ini)</h3>
          <CategoryPieChart data={data.expenseByCategory} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Transaksi Terbaru</h3>
            <Link href="/transaksi" className="text-xs font-semibold text-primary hover:underline">
              Lihat semua
            </Link>
          </div>
          {data.recentTransactions.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi"
              description="Catat transaksi pertama Anda untuk melihat ringkasannya di sini."
            />
          ) : (
            <div className="divide-y divide-border">
              {data.recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{ background: `${t.categoryColor || "#64748b"}22`, color: t.categoryColor || "#64748b" }}
                    >
                      <AppIcon name={t.categoryIcon || "tag"} size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.description || t.categoryName || "Transaksi"}</p>
                      <p className="text-xs text-muted">
                        {formatTanggalID(t.transactionDate)} · {t.walletName}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      t.type === "income" ? "text-primary" : t.type === "expense" ? "text-danger" : "text-foreground"
                    }`}
                  >
                    {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}
                    {formatIDR(t.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Target Tabungan</h3>
            <Link href="/tabungan" className="text-xs font-semibold text-primary hover:underline">
              Kelola
            </Link>
          </div>
          {data.goals.length === 0 ? (
            <EmptyState
              icon={<Target size={24} />}
              title="Belum ada target"
              description="Buat target tabungan seperti 'Beli Laptop' untuk mulai menabung terarah."
            />
          ) : (
            <div className="space-y-4">
              {data.goals.slice(0, 4).map((g) => {
                const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
                return (
                  <div key={g.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-medium">
                        <AppIcon name={g.icon} size={14} /> {g.name}
                      </span>
                      <span className="text-xs text-muted">{pct}%</span>
                    </div>
                    <ProgressBar percent={pct} tone={pct >= 100 ? "success" : "success"} />
                    <p className="mt-1 text-xs text-muted">
                      {formatIDR(g.currentAmount)} / {formatIDR(g.targetAmount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 border-t border-border pt-4">
            <h3 className="mb-3 text-sm font-semibold">Kantong Keuangan</h3>
            {data.pockets.length === 0 ? (
              <EmptyState
                icon={<PiggyBank size={24} />}
                title="Belum ada kantong"
                description="Bagi uang Anda ke kantong seperti Uang Makan atau Transportasi."
              />
            ) : (
              <div className="space-y-3">
                {data.pockets.slice(0, 4).map((p) => {
                  const pct = p.monthlyLimit ? Math.min(100, Math.round((p.balance / p.monthlyLimit) * 100)) : null;
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <AppIcon name={p.icon} size={14} />
                        {p.name}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{formatIDR(p.balance)}</span>
                        {pct !== null && <Badge tone={pct >= 100 ? "danger" : pct >= 75 ? "warning" : "neutral"}>{pct}%</Badge>}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "primary" | "success" | "danger";
}) {
  const toneClass = {
    primary: "bg-primary-soft text-primary-dark",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    danger: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  }[tone];
  return (
    <Card>
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>{icon}</div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold leading-tight sm:text-xl">{value}</p>
    </Card>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card-surface flex flex-col items-center gap-2 p-4 text-center text-xs font-medium transition-transform hover:-translate-y-0.5 hover:shadow-md focus-ring"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-dark">{icon}</span>
      {label}
    </button>
  );
}

function buildInsight(data: DashboardSummary): string {
  if (data.monthExpense === 0 && data.monthIncome === 0) {
    return "Belum ada transaksi bulan ini. Mulai catat transaksi untuk mendapatkan insight yang dipersonalisasi.";
  }
  if (data.expenseByCategory.length > 0) {
    const top = data.expenseByCategory[0];
    const pct = data.monthExpense > 0 ? Math.round((top.amount / data.monthExpense) * 100) : 0;
    return `${top.name} adalah kategori pengeluaran terbesar bulan ini, mencapai ${pct}% dari total pengeluaran Anda (${formatIDR(top.amount)}).`;
  }
  if (data.netCashflow < 0) {
    return "Pengeluaran Anda bulan ini lebih besar dari pemasukan. Pertimbangkan untuk meninjau anggaran Anda.";
  }
  return "Arus kas Anda positif bulan ini. Pertimbangkan mengalokasikan kelebihannya ke target tabungan.";
}
