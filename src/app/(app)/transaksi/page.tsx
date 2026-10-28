"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Filter, Plus, Pencil, Trash2, Search, ArrowLeftRight, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { apiDelete, apiGet } from "../../../lib/client/api";
import { Card, EmptyState, Skeleton, ConfirmDialog, Badge } from "../../../components/ui/surfaces";
import { Button, Input, Select } from "../../../components/ui/controls";
import { formatIDR } from "../../../lib/money";
import { formatTanggalID } from "../../../lib/date-id";
import { AppIcon } from "../../../components/icon-map";
import { TransactionFormModal } from "../../../components/transactions/transaction-form-modal";
import type { Category, Pocket, Transaction, TransactionType, Wallet } from "../../../lib/types";

function TransaksiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [walletFilter, setWalletFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("date_desc");

  const loadFilters = useCallback(async () => {
    const [w, c, p] = await Promise.all([
      apiGet<{ wallets: Wallet[] }>("/api/wallets"),
      apiGet<{ categories: Category[] }>("/api/categories"),
      apiGet<{ pockets: Pocket[] }>("/api/pockets"),
    ]);
    setWallets(w.wallets.filter((x) => !x.isArchived));
    setCategories(c.categories);
    setPockets(p.pockets.filter((x) => !x.isArchived));
  }, []);

  const loadTransactions = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (typeFilter) params.set("type", typeFilter);
    if (walletFilter) params.set("walletId", walletFilter);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("sort", sort);
    try {
      const data = await apiGet<{ transactions: Transaction[] }>(`/api/transactions?${params.toString()}`);
      setTransactions(data.transactions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat transaksi.");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, walletFilter, categoryFilter, from, to, sort]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    const newType = searchParams.get("new");
    if (newType) {
      setEditing(null);
      setModalOpen(true);
    }
  }, [searchParams]);

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    if (searchParams.get("new")) {
      router.replace("/transaksi");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/transactions/${deleting.id}`);
      toast.success("Transaksi berhasil dihapus.");
      setDeleting(null);
      loadTransactions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus transaksi.");
    } finally {
      setDeleteLoading(false);
    }
  }

  const defaultType = (searchParams.get("new") as TransactionType) || "expense";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Transaksi</h1>
          <p className="text-sm text-muted">Catat dan kelola seluruh pemasukan, pengeluaran, dan transfer Anda.</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/export/transactions">
            <Button variant="secondary" icon={<Download size={16} />}>
              Ekspor CSV
            </Button>
          </a>
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Tambah
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Filter size={16} /> Filter & Pencarian
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari deskripsi..."
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Semua Jenis</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
            <option value="transfer">Transfer</option>
          </Select>
          <Select value={walletFilter} onChange={(e) => setWalletFilter(e.target.value)}>
            <option value="">Semua Dompet</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="date_desc">Tanggal Terbaru</option>
            <option value="date_asc">Tanggal Terlama</option>
            <option value="amount_desc">Nominal Tertinggi</option>
            <option value="amount_asc">Nominal Terendah</option>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>

      <Card padding={false}>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada transaksi yang cocok"
              description="Coba ubah filter, atau tambahkan transaksi baru."
              action={
                <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
                  Tambah Transaksi
                </Button>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: t.type === "transfer" ? "#3b82f622" : `${t.categoryColor || "#64748b"}22`,
                      color: t.type === "transfer" ? "#3b82f6" : t.categoryColor || "#64748b",
                    }}
                  >
                    {t.type === "transfer" ? (
                      <ArrowLeftRight size={17} />
                    ) : t.type === "income" ? (
                      <ArrowUpCircle size={17} />
                    ) : (
                      <AppIcon name={t.categoryIcon || "tag"} size={17} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.description || t.categoryName || "Transaksi"}</p>
                    <p className="truncate text-xs text-muted">
                      {formatTanggalID(t.transactionDate)} ·{" "}
                      {t.type === "transfer" ? `${t.walletName} → ${t.toWalletName}` : t.walletName}
                      {t.pocketName ? ` · ${t.pocketName}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        t.type === "income" ? "text-primary" : t.type === "expense" ? "text-danger" : ""
                      }`}
                    >
                      {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}
                      {formatIDR(t.amount)}
                    </p>
                    {t.categoryName && t.type !== "transfer" && <Badge>{t.categoryName}</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditing(t);
                        setModalOpen(true);
                      }}
                      className="rounded-lg p-2 text-muted hover:bg-surface-muted focus-ring"
                      aria-label="Ubah transaksi"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleting(t)}
                      className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-danger focus-ring"
                      aria-label="Hapus transaksi"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <TransactionFormModal
        open={modalOpen}
        onClose={closeModal}
        onSaved={loadTransactions}
        wallets={wallets}
        categories={categories}
        pockets={pockets}
        defaultType={["income", "expense", "transfer"].includes(defaultType) ? defaultType : "expense"}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Hapus Transaksi"
        description={`Transaksi "${deleting?.description || "ini"}" senilai ${formatIDR(
          deleting?.amount || 0,
        )} akan dihapus dan saldo terkait akan dikembalikan. Lanjutkan?`}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}

export default function TransaksiPage() {
  return (
    <Suspense>
      <TransaksiContent />
    </Suspense>
  );
}
