"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Target, ArrowDownToLine, ArrowUpFromLine, Trash2, CalendarClock } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "../../../lib/client/api";
import { Card, EmptyState, Skeleton, Modal, ProgressBar, ConfirmDialog, Badge } from "../../../components/ui/surfaces";
import { Button, Input, Label, Textarea, FieldError } from "../../../components/ui/controls";
import { formatIDR, parseRupiahInput } from "../../../lib/money";
import { AppIcon } from "../../../components/icon-map";
import { formatTanggalID } from "../../../lib/date-id";
import type { SavingsGoal } from "../../../lib/types";

const ICONS = ["target", "laptop", "piggy-bank", "home", "car", "graduation-cap", "gift", "sparkles"];
const COLORS = ["#10b981", "#2563eb", "#f59e0b", "#a855f7", "#ec4899", "#0ea5e9"];

function TabunganContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [unallocated, setUnallocated] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionGoal, setActionGoal] = useState<SavingsGoal | null>(null);
  const [actionMode, setActionMode] = useState<"in" | "out" | null>(null);
  const [deleting, setDeleting] = useState<SavingsGoal | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("target");
  const [color, setColor] = useState(COLORS[0]);
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [amount, setAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [g, summary] = await Promise.all([
        apiGet<{ goals: SavingsGoal[] }>("/api/savings-goals"),
        apiGet<{ unallocated: number }>("/api/dashboard/summary"),
      ]);
      setGoals(g.goals);
      setUnallocated(summary.unallocated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat target tabungan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new")) {
      openCreate();
      router.replace("/tabungan");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openCreate() {
    setName("");
    setIcon("target");
    setColor(COLORS[0]);
    setTargetAmount("");
    setTargetDate("");
    setDescription("");
    setErrors({});
    setCreateOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};
    if (!name.trim()) fieldErrors.name = "Nama tujuan wajib diisi";
    if (parseRupiahInput(targetAmount) <= 0) fieldErrors.targetAmount = "Target harus lebih dari 0";
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/savings-goals", {
        name,
        icon,
        color,
        description: description || null,
        targetAmount: parseRupiahInput(targetAmount),
        targetDate: targetDate || null,
      });
      toast.success("Target tabungan berhasil dibuat.");
      setCreateOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat target tabungan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionGoal || !actionMode) return;
    const value = parseRupiahInput(amount);
    if (value <= 0) {
      toast.error("Nominal harus lebih dari 0.");
      return;
    }
    if (actionMode === "in" && value > unallocated) {
      toast.error(`Uang belum dialokasikan hanya ${formatIDR(unallocated)}.`);
      return;
    }
    setActionLoading(true);
    try {
      await apiPost(`/api/savings-goals/${actionGoal.id}/contribute`, { amount: value, direction: actionMode });
      toast.success(actionMode === "in" ? "Tabungan berhasil ditambahkan." : "Dana berhasil ditarik.");
      setActionGoal(null);
      setActionMode(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses permintaan.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/savings-goals/${deleting.id}`);
      toast.success("Target tabungan berhasil dihapus.");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus target.");
    } finally {
      setDeleteLoading(false);
    }
  }

  function estimatePerMonth(g: SavingsGoal): string | null {
    if (!g.targetDate) return null;
    const now = new Date();
    const target = new Date(g.targetDate);
    const months = Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
    return formatIDR(Math.ceil(remaining / months));
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Target Tabungan</h1>
          <p className="text-sm text-muted">Tetapkan tujuan tabungan dan pantau progresnya.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openCreate}>
          Buat Target
        </Button>
      </div>

      <Card className="bg-primary-soft/60">
        <p className="text-xs text-muted">Uang Belum Dialokasikan (tersedia untuk ditabung)</p>
        <p className="mt-1 text-xl font-bold text-primary-dark">{formatIDR(unallocated)}</p>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<Target size={28} />}
          title="Belum ada target tabungan"
          description="Buat target seperti 'Beli Laptop' untuk mulai menabung dengan terarah."
          action={
            <Button icon={<Plus size={16} />} onClick={openCreate}>
              Buat Target
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
            const perMonth = estimatePerMonth(g);
            return (
              <Card key={g.id} className="relative">
                {g.isDemo && (
                  <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    DEMO
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${g.color}22`, color: g.color }}
                  >
                    <AppIcon name={g.icon} size={18} />
                  </div>
                  <div>
                    <p className="font-semibold">{g.name}</p>
                    {g.isCompleted && <Badge tone="success">Tercapai</Badge>}
                  </div>
                </div>
                {g.description && <p className="mt-2 text-xs text-muted">{g.description}</p>}
                <p className="mt-3 text-lg font-bold">
                  {formatIDR(g.currentAmount)} <span className="text-sm font-normal text-muted">/ {formatIDR(g.targetAmount)}</span>
                </p>
                <div className="mt-2">
                  <ProgressBar percent={pct} tone="success" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <span>{pct}% tercapai</span>
                  {g.targetDate && (
                    <span className="flex items-center gap-1">
                      <CalendarClock size={12} /> {formatTanggalID(g.targetDate)}
                    </span>
                  )}
                </div>
                {perMonth && !g.isCompleted && (
                  <p className="mt-2 rounded-lg bg-surface-muted p-2 text-xs text-muted">
                    Estimasi tabungan: <span className="font-semibold text-foreground">{perMonth}/bulan</span>
                  </p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<ArrowDownToLine size={13} />}
                    onClick={() => {
                      setActionGoal(g);
                      setActionMode("in");
                      setAmount("");
                    }}
                  >
                    Tambah
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<ArrowUpFromLine size={13} />}
                    onClick={() => {
                      setActionGoal(g);
                      setActionMode("out");
                      setAmount("");
                    }}
                  >
                    Tarik
                  </Button>
                </div>
                <button
                  onClick={() => setDeleting(g)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs text-muted hover:text-danger"
                >
                  <Trash2 size={12} /> Hapus target
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Buat Target Tabungan">
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          <div>
            <Label htmlFor="goalName" required>
              Nama Tujuan
            </Label>
            <Input id="goalName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Beli Laptop" />
            <FieldError message={errors.name} />
          </div>
          <div>
            <Label>Ikon</Label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                    icon === i ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"
                  }`}
                >
                  <AppIcon name={i} size={16} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Warna</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }}
                  aria-label={`Pilih warna ${c}`}
                />
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="targetAmount" required>
              Nominal Target
            </Label>
            <Input
              id="targetAmount"
              inputMode="numeric"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted">{formatIDR(parseRupiahInput(targetAmount))}</p>
            <FieldError message={errors.targetAmount} />
          </div>
          <div>
            <Label htmlFor="targetDate">Tanggal Target (Opsional)</Label>
            <Input id="targetDate" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button type="submit" fullWidth loading={saving}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!actionMode}
        onClose={() => {
          setActionMode(null);
          setActionGoal(null);
        }}
        title={actionMode === "in" ? `Tambah Tabungan "${actionGoal?.name}"` : `Tarik dari "${actionGoal?.name}"`}
      >
        <form onSubmit={handleAction} noValidate className="space-y-4">
          {actionMode === "in" && (
            <p className="rounded-xl bg-surface-muted p-3 text-xs text-muted">
              Uang belum dialokasikan saat ini: <span className="font-semibold text-foreground">{formatIDR(unallocated)}</span>
            </p>
          )}
          <div>
            <Label htmlFor="goalAmount" required>
              Nominal
            </Label>
            <Input id="goalAmount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            <p className="mt-1 text-xs text-muted">{formatIDR(parseRupiahInput(amount))}</p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => {
                setActionMode(null);
                setActionGoal(null);
              }}
            >
              Batal
            </Button>
            <Button type="submit" fullWidth loading={actionLoading}>
              Konfirmasi
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Hapus Target Tabungan"
        description={`Target "${deleting?.name}" akan dihapus. Tarik dulu dana yang sudah terkumpul jika ada.`}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}

export default function TabunganPage() {
  return (
    <Suspense>
      <TabunganContent />
    </Suspense>
  );
}
