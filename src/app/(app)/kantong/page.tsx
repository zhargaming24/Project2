"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, PiggyBank, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "../../../lib/client/api";
import { Card, EmptyState, Skeleton, Modal, ProgressBar, Badge, ConfirmDialog } from "../../../components/ui/surfaces";
import { Button, Input, Label, Select, Textarea, FieldError } from "../../../components/ui/controls";
import { formatIDR, parseRupiahInput } from "../../../lib/money";
import { AppIcon } from "../../../components/icon-map";
import { DEFAULT_POCKETS } from "../../../lib/categories-seed";
import type { Pocket } from "../../../lib/types";

const COLORS = ["#f97316", "#3b82f6", "#ec4899", "#ef4444", "#a855f7", "#10b981", "#0ea5e9", "#eab308"];

type ActionMode = "allocate" | "withdraw" | "move" | null;

export default function KantongPage() {
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [unallocated, setUnallocated] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionPocket, setActionPocket] = useState<Pocket | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [deleting, setDeleting] = useState<Pocket | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // create form
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState("piggy-bank");
  const [description, setDescription] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // action form
  const [amount, setAmount] = useState("");
  const [targetPocketId, setTargetPocketId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, summary] = await Promise.all([
        apiGet<{ pockets: Pocket[] }>("/api/pockets"),
        apiGet<{ unallocated: number }>("/api/dashboard/summary"),
      ]);
      setPockets(p.pockets.filter((x) => !x.isArchived));
      setUnallocated(summary.unallocated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat kantong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setName("");
    setColor(COLORS[0]);
    setIcon("piggy-bank");
    setDescription("");
    setMonthlyLimit("");
    setErrors({});
    setCreateOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Nama kantong wajib diisi" });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await apiPost("/api/pockets", {
        name,
        icon,
        color,
        description: description || null,
        monthlyLimit: monthlyLimit ? parseRupiahInput(monthlyLimit) : null,
      });
      toast.success("Kantong berhasil dibuat.");
      setCreateOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat kantong.");
    } finally {
      setSaving(false);
    }
  }

  function openAction(pocket: Pocket, mode: ActionMode) {
    setActionPocket(pocket);
    setActionMode(mode);
    setAmount("");
    setTargetPocketId("");
  }

  async function handleAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionPocket || !actionMode) return;
    const value = parseRupiahInput(amount);
    if (value <= 0) {
      toast.error("Nominal harus lebih dari 0.");
      return;
    }
    setActionLoading(true);
    try {
      if (actionMode === "allocate") {
        if (value > unallocated) {
          toast.error(`Uang belum dialokasikan hanya ${formatIDR(unallocated)}.`);
          setActionLoading(false);
          return;
        }
        await apiPost(`/api/pockets/${actionPocket.id}/allocate`, { amount: value, direction: "in" });
        toast.success("Alokasi berhasil ditambahkan.");
      } else if (actionMode === "withdraw") {
        await apiPost(`/api/pockets/${actionPocket.id}/allocate`, { amount: value, direction: "out" });
        toast.success("Alokasi berhasil ditarik kembali.");
      } else if (actionMode === "move") {
        if (!targetPocketId) {
          toast.error("Pilih kantong tujuan.");
          setActionLoading(false);
          return;
        }
        await apiPost(`/api/pockets/${actionPocket.id}/move`, { toPocketId: targetPocketId, amount: value });
        toast.success("Alokasi berhasil dipindahkan.");
      }
      setActionPocket(null);
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
      await apiDelete(`/api/pockets/${deleting.id}`);
      toast.success("Kantong berhasil dihapus.");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus kantong.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Kantong Keuangan</h1>
          <p className="text-sm text-muted">Bagi uang Anda untuk tujuan seperti makan, transportasi, atau tabungan.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openCreate}>
          Buat Kantong
        </Button>
      </div>

      <Card className={unallocated < 0 ? "border-danger/40 bg-red-50 dark:bg-red-500/10" : "bg-primary-soft/60"}>
        <p className="text-xs text-muted">Uang Belum Dialokasikan</p>
        <p className={`mt-1 text-xl font-bold ${unallocated < 0 ? "text-danger" : "text-primary-dark"}`}>
          {formatIDR(unallocated)}
        </p>
        <p className="mt-1 text-xs text-muted">
          Alokasi membagi uang yang sudah ada di dompet Anda — bukan menambah uang baru.
        </p>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : pockets.length === 0 ? (
        <EmptyState
          icon={<PiggyBank size={28} />}
          title="Belum ada kantong"
          description="Buat kantong seperti 'Uang Makan' atau 'Dana Darurat' untuk mulai membagi uang Anda."
          action={
            <Button icon={<Plus size={16} />} onClick={openCreate}>
              Buat Kantong
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pockets.map((p) => {
            const pct = p.monthlyLimit && p.monthlyLimit > 0 ? Math.round((p.balance / p.monthlyLimit) * 100) : null;
            return (
              <Card key={p.id} className="relative">
                {p.isDemo && (
                  <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    DEMO
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${p.color}22`, color: p.color }}
                  >
                    <AppIcon name={p.icon} size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    {p.description && <p className="text-xs text-muted">{p.description}</p>}
                  </div>
                </div>
                <p className="mt-4 text-xl font-bold">{formatIDR(p.balance)}</p>
                {p.monthlyLimit ? (
                  <>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted">
                      <span>Batas: {formatIDR(p.monthlyLimit)}</span>
                      {pct !== null && (
                        <Badge tone={pct >= 100 ? "danger" : pct >= 90 ? "warning" : pct >= 75 ? "warning" : "success"}>
                          {pct}%
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <ProgressBar percent={pct ?? 0} />
                    </div>
                    {pct !== null && pct >= 75 && (
                      <p className={`mt-2 text-xs font-medium ${pct >= 100 ? "text-danger" : "text-warning"}`}>
                        {pct >= 100
                          ? "Batas kantong ini sudah terlampaui!"
                          : pct >= 90
                            ? "Hati-hati, penggunaan sudah 90% dari batas."
                            : "Penggunaan sudah mencapai 75% dari batas."}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-xs text-muted">Tanpa batas bulanan</p>
                )}
                <div className="mt-4 grid grid-cols-3 gap-1.5">
                  <Button size="sm" variant="secondary" icon={<ArrowDownToLine size={13} />} onClick={() => openAction(p, "allocate")}>
                    Isi
                  </Button>
                  <Button size="sm" variant="outline" icon={<ArrowUpFromLine size={13} />} onClick={() => openAction(p, "withdraw")}>
                    Tarik
                  </Button>
                  <Button size="sm" variant="outline" icon={<ArrowRightLeft size={13} />} onClick={() => openAction(p, "move")}>
                    Pindah
                  </Button>
                </div>
                <button
                  onClick={() => setDeleting(p)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs text-muted hover:text-danger"
                >
                  <Trash2 size={12} /> Hapus kantong
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Buat Kantong Baru">
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          <div>
            <Label>Pilih Cepat</Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_POCKETS.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => {
                    setName(t.name);
                    setColor(t.color);
                    setIcon(t.icon);
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="pocketName" required>
              Nama Kantong
            </Label>
            <Input id="pocketName" value={name} onChange={(e) => setName(e.target.value)} />
            <FieldError message={errors.name} />
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
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="monthlyLimit">Batas Anggaran Bulanan (Opsional)</Label>
            <Input
              id="monthlyLimit"
              inputMode="numeric"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted">{monthlyLimit ? formatIDR(parseRupiahInput(monthlyLimit)) : "Tanpa batas"}</p>
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

      {/* Action modal */}
      <Modal
        open={!!actionMode}
        onClose={() => {
          setActionMode(null);
          setActionPocket(null);
        }}
        title={
          actionMode === "allocate"
            ? `Isi Kantong "${actionPocket?.name}"`
            : actionMode === "withdraw"
              ? `Tarik dari "${actionPocket?.name}"`
              : `Pindahkan dari "${actionPocket?.name}"`
        }
      >
        <form onSubmit={handleAction} noValidate className="space-y-4">
          {actionMode === "allocate" && (
            <p className="rounded-xl bg-surface-muted p-3 text-xs text-muted">
              Uang belum dialokasikan saat ini: <span className="font-semibold text-foreground">{formatIDR(unallocated)}</span>
            </p>
          )}
          {actionMode === "move" && (
            <div>
              <Label htmlFor="targetPocket" required>
                Pindahkan ke Kantong
              </Label>
              <Select id="targetPocket" value={targetPocketId} onChange={(e) => setTargetPocketId(e.target.value)}>
                <option value="">Pilih kantong tujuan</option>
                {pockets
                  .filter((p) => p.id !== actionPocket?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="actionAmount" required>
              Nominal
            </Label>
            <Input
              id="actionAmount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted">{formatIDR(parseRupiahInput(amount))}</p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => {
                setActionMode(null);
                setActionPocket(null);
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
        title="Hapus Kantong"
        description={`Kantong "${deleting?.name}" akan dihapus. Pastikan saldonya sudah dipindahkan atau ditarik terlebih dahulu.`}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
