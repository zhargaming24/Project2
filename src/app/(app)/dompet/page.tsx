"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Archive, Wallet as WalletIcon } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "../../../lib/client/api";
import { Card, EmptyState, Skeleton, Modal, ConfirmDialog } from "../../../components/ui/surfaces";
import { Button, Input, Label, Select, FieldError } from "../../../components/ui/controls";
import { formatIDR, parseRupiahInput } from "../../../lib/money";
import { AppIcon } from "../../../components/icon-map";
import { WALLET_TEMPLATES } from "../../../lib/categories-seed";
import type { Wallet, WalletType } from "../../../lib/types";

const COLORS = ["#10b981", "#2563eb", "#f59e0b", "#1d4ed8", "#00aa13", "#7c3aed", "#ef4444", "#64748b"];

export default function DompetPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Wallet | null>(null);
  const [archiving, setArchiving] = useState<Wallet | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("cash");
  const [color, setColor] = useState(COLORS[0]);
  const [initialBalance, setInitialBalance] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ wallets: Wallet[] }>("/api/wallets");
      setWallets(data.wallets);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat dompet.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName("");
    setType("cash");
    setColor(COLORS[0]);
    setInitialBalance("");
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(w: Wallet) {
    setEditing(w);
    setName(w.name);
    setType(w.type);
    setColor(w.color);
    setInitialBalance(String(w.initialBalance));
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Nama dompet wajib diisi" });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (editing) {
        await apiPatch(`/api/wallets/${editing.id}`, { name, type, color });
        toast.success("Dompet berhasil diperbarui.");
      } else {
        await apiPost("/api/wallets", {
          name,
          type,
          icon: type === "cash" ? "banknote" : type === "bank" ? "landmark" : "smartphone",
          color,
          initialBalance: parseRupiahInput(initialBalance),
        });
        toast.success("Dompet berhasil ditambahkan.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan dompet.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!archiving) return;
    setArchiveLoading(true);
    try {
      await apiPatch(`/api/wallets/${archiving.id}`, { isArchived: true });
      toast.success("Dompet berhasil diarsipkan.");
      setArchiving(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengarsipkan dompet.");
    } finally {
      setArchiveLoading(false);
    }
  }

  const activeWallets = wallets.filter((w) => !w.isArchived);
  const archivedWallets = wallets.filter((w) => w.isArchived);
  const total = activeWallets.reduce((s, w) => s + w.currentBalance, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Dompet</h1>
          <p className="text-sm text-muted">Tempat uang Anda benar-benar disimpan: tunai, bank, atau dompet digital.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openCreate}>
          Tambah Dompet
        </Button>
      </div>

      <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
        <p className="text-xs text-emerald-50">Total Saldo Seluruh Dompet</p>
        <p className="mt-1 text-2xl font-bold">{formatIDR(total)}</p>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : activeWallets.length === 0 ? (
        <EmptyState
          icon={<WalletIcon size={28} />}
          title="Belum ada dompet"
          description="Tambahkan dompet pertama Anda seperti Uang Tunai atau BCA beserta saldonya."
          action={
            <Button icon={<Plus size={16} />} onClick={openCreate}>
              Tambah Dompet
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeWallets.map((w) => (
            <Card key={w.id} className="relative">
              {w.isDemo && (
                <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  DEMO
                </span>
              )}
              <div
                className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: `${w.color}22`, color: w.color }}
              >
                <AppIcon name={w.icon} size={20} />
              </div>
              <p className="text-sm text-muted">{w.name}</p>
              <p className="mt-0.5 text-xl font-bold">{formatIDR(w.currentBalance)}</p>
              <p className="mt-1 text-xs text-muted capitalize">
                {{ cash: "Tunai", bank: "Rekening Bank", ewallet: "Dompet Digital", other: "Lainnya" }[w.type]}
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" icon={<Pencil size={14} />} onClick={() => openEdit(w)} fullWidth>
                  Ubah
                </Button>
                <Button size="sm" variant="outline" icon={<Archive size={14} />} onClick={() => setArchiving(w)} fullWidth>
                  Arsip
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {archivedWallets.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted">Dompet Diarsipkan</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archivedWallets.map((w) => (
              <Card key={w.id} className="opacity-60">
                <p className="text-sm font-medium">{w.name}</p>
                <p className="text-xs text-muted">{formatIDR(w.currentBalance)}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Ubah Dompet" : "Tambah Dompet"}>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {!editing && (
            <div>
              <Label>Pilih Cepat</Label>
              <div className="flex flex-wrap gap-2">
                {WALLET_TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => {
                      setName(t.name);
                      setType(t.type);
                      setColor(t.color);
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="name" required>
              Nama Dompet
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            <FieldError message={errors.name} />
          </div>
          <div>
            <Label htmlFor="type">Jenis</Label>
            <Select id="type" value={type} onChange={(e) => setType(e.target.value as WalletType)}>
              <option value="cash">Uang Tunai</option>
              <option value="bank">Rekening Bank</option>
              <option value="ewallet">Dompet Digital</option>
              <option value="other">Lainnya</option>
            </Select>
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
          {!editing && (
            <div>
              <Label htmlFor="initialBalance" required>
                Saldo Awal
              </Label>
              <Input
                id="initialBalance"
                inputMode="numeric"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0"
              />
              <p className="mt-1 text-xs text-muted">{formatIDR(parseRupiahInput(initialBalance))}</p>
            </div>
          )}
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
        open={!!archiving}
        title="Arsipkan Dompet"
        description={`Dompet "${archiving?.name}" akan diarsipkan dan tidak muncul di daftar aktif. Riwayat transaksi tetap tersimpan.`}
        confirmLabel="Arsipkan"
        onCancel={() => setArchiving(null)}
        onConfirm={handleArchive}
        loading={archiveLoading}
      />
    </div>
  );
}
