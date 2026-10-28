"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, TrendingUp, TrendingDown, Scale } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { apiGet } from "../../../lib/client/api";
import { Card, Skeleton, EmptyState } from "../../../components/ui/surfaces";
import { Button } from "../../../components/ui/controls";
import { formatCompactIDR, formatIDR } from "../../../lib/money";
import { addMonths, firstDayOfMonthISO, formatBulanTahunID } from "../../../lib/date-id";
import { CategoryPieChart } from "../../../components/charts/category-pie-chart";
import { TrendChart } from "../../../components/charts/trend-chart";

type AnalyticsData = {
  month: string;
  summary: {
    income: number;
    expense: number;
    net: number;
    prevIncome: number;
    prevExpense: number;
    prevNet: number;
    incomeChangePct: number | null;
    expenseChangePct: number | null;
  };
  categoryBreakdown: Array<{ name: string; color: string; amount: number }>;
  dailyTrend: Array<{ date: string; income: number; expense: number }>;
  monthlyTrend: Array<{ month: string; income: number; expense: number }>;
  goalsProgress: Array<{ name: string; target: number; current: number; percent: number }>;
};

export default function AnalisisPage() {
  const [month, setMonth] = useState(firstDayOfMonthISO());
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiGet<AnalyticsData>(`/api/analytics?month=${month}`);
      setData(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat analisis.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Analisis & Laporan</h1>
          <p className="text-sm text-muted">Pahami pola keuangan Anda dari waktu ke waktu.</p>
        </div>
        <a href="/api/export/transactions">
          <Button variant="secondary" icon={<Download size={16} />}>
            Ekspor Transaksi (CSV)
          </Button>
        </a>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button onClick={() => setMonth(addMonths(month, -1))} className="rounded-xl p-2 hover:bg-surface-muted" aria-label="Bulan sebelumnya">
          <ChevronLeft size={18} />
        </button>
        <p className="w-40 text-center text-sm font-semibold">{formatBulanTahunID(month)}</p>
        <button onClick={() => setMonth(addMonths(month, 1))} className="rounded-xl p-2 hover:bg-surface-muted" aria-label="Bulan berikutnya">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading || !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <div className="mb-2 flex items-center gap-2 text-primary">
                <TrendingUp size={16} /> <p className="text-xs text-muted">Pemasukan</p>
              </div>
              <p className="text-lg font-bold">{formatIDR(data.summary.income)}</p>
              {data.summary.incomeChangePct !== null && (
                <p className="mt-1 text-xs text-muted">
                  {data.summary.incomeChangePct >= 0 ? "▲" : "▼"} {Math.abs(data.summary.incomeChangePct)}% vs bulan lalu
                </p>
              )}
            </Card>
            <Card>
              <div className="mb-2 flex items-center gap-2 text-danger">
                <TrendingDown size={16} /> <p className="text-xs text-muted">Pengeluaran</p>
              </div>
              <p className="text-lg font-bold">{formatIDR(data.summary.expense)}</p>
              {data.summary.expenseChangePct !== null && (
                <p className="mt-1 text-xs text-muted">
                  {data.summary.expenseChangePct >= 0 ? "▲" : "▼"} {Math.abs(data.summary.expenseChangePct)}% vs bulan lalu
                </p>
              )}
            </Card>
            <Card>
              <div className="mb-2 flex items-center gap-2">
                <Scale size={16} /> <p className="text-xs text-muted">Arus Kas Bersih</p>
              </div>
              <p className={`text-lg font-bold ${data.summary.net < 0 ? "text-danger" : ""}`}>{formatIDR(data.summary.net)}</p>
              <p className="mt-1 text-xs text-muted">Bulan lalu: {formatIDR(data.summary.prevNet)}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <h3 className="mb-4 text-sm font-semibold">Tren Harian Bulan Ini</h3>
              {data.dailyTrend.length === 0 ? (
                <EmptyState title="Belum ada data" description="Belum ada transaksi pada bulan ini." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.dailyTrend} margin={{ left: -16, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v: string) => v.slice(8, 10)}
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v: number) => formatCompactIDR(v)}
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      axisLine={false}
                      tickLine={false}
                      width={64}
                    />
                    <Tooltip formatter={(value) => formatIDR(Number(value))} contentStyle={{ borderRadius: 12, fontSize: 13 }} />
                    <Line type="monotone" dataKey="income" name="Pemasukan" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expense" name="Pengeluaran" stroke="#f87171" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card className="lg:col-span-2">
              <h3 className="mb-4 text-sm font-semibold">Pengeluaran per Kategori</h3>
              <CategoryPieChart data={data.categoryBreakdown} />
            </Card>
          </div>

          <Card>
            <h3 className="mb-4 text-sm font-semibold">Tren Bulanan (12 Bulan Terakhir)</h3>
            <TrendChart data={data.monthlyTrend} />
          </Card>

          {data.goalsProgress.length > 0 && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold">Perkembangan Target Tabungan</h3>
              <div className="space-y-3">
                {data.goalsProgress.map((g) => (
                  <div key={g.name} className="flex items-center justify-between text-sm">
                    <span>{g.name}</span>
                    <span className="font-medium text-muted">
                      {formatIDR(g.current)} / {formatIDR(g.target)} ({g.percent}%)
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
