"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, PieChart as PieIcon, Pencil, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../lib/client/api";
import { Card, EmptyState, Skeleton, Modal, ProgressBar, Badge, ConfirmDialog } from "../../../components/ui/surfaces";
import { Button, Input, Label, Select, FieldError } from "../../../components/ui/controls";
import { formatIDR, parseRupiahInput } from "../../../lib/money";
import { AppIcon } from "../../../components/icon-map";
import { addMonths, firstDayOfMonthISO, formatBulanTahunID } from "../../../lib/date-id";
import type { BudgetItem, Category } from "../../../lib/types";

function AnggaranContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [month, setMonth] = useState(firstDayOfMonthISO());
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetItem | null>(null);
  const [deleting, setDeleting] = useState<BudgetItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([
        apiGet<{ budgets: BudgetItem[] }>(`/api/budgets?month=${month}`),
        apiGet<{ categories: Category[] }>("/api/categories"),
      ]);
      setBudgets(b.budgets);
      setCategories(c.categories.filter((x) => x.type === "expense"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat anggaran.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new")) {
      openCreate();
      router.replace("/anggaran");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openCreate() {
    setEditing(null);
    setCategoryId("");
    setAmount("");
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(b: BudgetItem) {
    setEditing(b);
    setCategoryId(b.categoryId);
    setAmount(String(b.amount));
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseRupiahInput(amount);
    const fieldErrors: Record<string, string> = {};
    if (!categoryId) fieldErrors.categoryId = "Pilih kategori";
    if (value <= 0) fieldErrors.amount = "Nominal harus lebih dari 0";
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await apiPatch(`/api/budgets/${editing.id}`, { amount: value });
      } else {
        await apiPost("/api/budgets", { categoryId, month, amount: value });
      }
      toast.success("Anggaran berhasil disimpan.");
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan anggaran.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/budgets/${deleting.id}`);
      toast.success("Anggaran berhasil dihapus.");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus anggaran.");
    } finally {
      setDeleteLoading(false);
    }
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalUsed = budgets.reduce((s, b) => s + b.used, 0);
  const availableCategories = categories.filter((c) => !budgets.some((b) => b.categoryId === c.id));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Anggaran</h1>
          <p className="text-sm text-muted">Atur batas pengeluaran per kategori setiap bulan.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openCreate} disabled={availableCategories.length === 0}>
          Buat Anggaran
        </Button>
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-muted">Total Anggaran</p>
          <p className="mt-1 text-lg font-bold">{formatIDR(totalBudget)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Total Terpakai</p>
          <p className="mt-1 text-lg font-bold">{formatIDR(totalUsed)}</p>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <p className="text-xs text-muted">Sisa Anggaran</p>
          <p className={`mt-1 text-lg font-bold ${totalBudget - totalUsed < 0 ? "text-danger" : ""}`}>
            {formatIDR(totalBudget - totalUsed)}
          </p>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={<PieIcon size={28} />}
          title="Belum ada anggaran bulan ini"
          description="Buat anggaran per kategori untuk memantau pengeluaran Anda lebih terarah."
          action={
            <Button icon={<Plus size={16} />} onClick={openCreate}>
              Buat Anggaran
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {budgets.map((b) => {
            const pct = b.amount > 0 ? Math.round((b.used / b.amount) * 100) : 0;
            const diffPrev = b.used - b.usedPrevMonth;
            return (
              <Card key={b.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{ background: `${b.categoryColor}22`, color: b.categoryColor }}
                    >
                      <AppIcon name={b.categoryIcon} size={16} />
                    </div>
                    <p className="font-semibold">{b.categoryName}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className="rounded-lg p-1.5 text-muted hover:bg-surface-muted" aria-label="Ubah anggaran">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleting(b)} className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-danger" aria-label="Hapus anggaran">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between text-sm">
                  <span className="font-semibold">{formatIDR(b.used)}</span>
                  <span className="text-xs text-muted">dari {formatIDR(b.amount)}</span>
                </div>
                <div className="mt-2">
                  <ProgressBar percent={pct} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <Badge tone={pct >= 100 ? "danger" : pct >= 90 ? "warning" : pct >= 75 ? "warning" : "success"}>
                    {pct}% terpakai
                  </Badge>
                  {b.usedPrevMonth > 0 && (
                    <span className="text-muted">
                      {diffPrev >= 0 ? "▲" : "▼"} {formatIDR(Math.abs(diffPrev))} vs bulan lalu
                    </span>
                  )}
                </div>
                {pct >= 75 && (
                  <p className={`mt-2 text-xs font-medium ${pct >= 100 ? "text-danger" : "text-warning"}`}>
                    {pct >= 100 ? "Anggaran ini sudah terlampaui." : "Mendekati batas anggaran bulan ini."}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Ubah Anggaran" : "Buat Anggaran"}>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {!editing && (
            <div>
              <Label htmlFor="categoryId" required>
                Kategori
              </Label>
              <Select id="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Pilih kategori</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.categoryId} />
            </div>
          )}
          <div>
            <Label htmlFor="amount" required>
              Nominal Anggaran ({formatBulanTahunID(month)})
            </Label>
            <Input id="amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            <p className="mt-1 text-xs text-muted">{formatIDR(parseRupiahInput(amount))}</p>
            <FieldError message={errors.amount} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" fullWidth loading={saving}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Hapus Anggaran"
        description={`Anggaran kategori "${deleting?.categoryName}" bulan ini akan dihapus.`}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}

export default function AnggaranPage() {
  return (
    <Suspense>
      <AnggaranContent />
    </Suspense>
  );
}
