"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  User,
  ShieldCheck,
  Tags,
  Palette,
  Database,
  Plus,
  Trash2,
  Sun,
  Moon,
  Download,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import clsx from "clsx";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../lib/client/api";
import { Card, ConfirmDialog, Modal } from "../../../components/ui/surfaces";
import { Button, Input, Label, Select, FieldError } from "../../../components/ui/controls";
import { AppIcon, ICON_NAMES } from "../../../components/icon-map";
import type { Category } from "../../../lib/types";

type Tab = "profil" | "keamanan" | "kategori" | "tema" | "data";

const TABS: Array<{ id: Tab; label: string; icon: typeof User }> = [
  { id: "profil", label: "Profil", icon: User },
  { id: "keamanan", label: "Keamanan", icon: ShieldCheck },
  { id: "kategori", label: "Kategori", icon: Tags },
  { id: "tema", label: "Tema", icon: Palette },
  { id: "data", label: "Data Akun", icon: Database },
];

export default function PengaturanPage() {
  const [tab, setTab] = useState<Tab>("profil");

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Pengaturan</h1>
        <p className="text-sm text-muted">Kelola profil, keamanan, kategori, tema, dan data akun Anda.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-primary text-white" : "bg-surface-muted text-muted hover:text-foreground",
            )}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "profil" && <ProfilTab />}
      {tab === "keamanan" && <KeamananTab />}
      {tab === "kategori" && <KategoriTab />}
      {tab === "tema" && <TemaTab />}
      {tab === "data" && <DataTab />}
    </div>
  );
}

function ProfilTab() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<{ profile: { name: string; email: string } }>("/api/profile");
        setName(data.profile.name || "");
        setEmail(data.profile.email);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuat profil.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPatch("/api/profile", { name });
      toast.success("Profil berhasil diperbarui.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Card>Memuat...</Card>;

  return (
    <Card className="max-w-lg">
      <h2 className="mb-4 font-semibold">Informasi Profil</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <Label htmlFor="name">Nama Lengkap</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled className="opacity-60" />
          <p className="mt-1 text-xs text-muted">Email tidak dapat diubah.</p>
        </div>
        <div>
          <Label htmlFor="currency">Mata Uang</Label>
          <Input id="currency" value="Rupiah Indonesia (IDR)" disabled className="opacity-60" />
        </div>
        <Button type="submit" loading={saving}>
          Simpan Perubahan
        </Button>
      </form>
    </Card>
  );
}

function KeamananTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await apiPost("/api/auth/change-password", { currentPassword, newPassword });
      toast.success("Kata sandi berhasil diperbarui.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah kata sandi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid max-w-lg gap-5">
      <Card>
        <h2 className="mb-4 font-semibold">Ubah Kata Sandi</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Kata Sandi Saat Ini</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Kosongkan jika masuk via Google"
            />
          </div>
          <div>
            <Label htmlFor="newPassword" required>
              Kata Sandi Baru
            </Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="confirmPassword" required>
              Konfirmasi Kata Sandi Baru
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <FieldError message={error} />
          </div>
          <Button type="submit" loading={loading}>
            Perbarui Kata Sandi
          </Button>
        </form>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Keluar dari Akun</h2>
        <p className="mb-3 text-sm text-muted">Akhiri sesi Anda di perangkat ini.</p>
        <Button variant="danger" onClick={() => signOut({ callbackUrl: "/" })}>
          Keluar
        </Button>
      </Card>
    </div>
  );
}

function KategoriTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [icon, setIcon] = useState("tag");
  const [color, setColor] = useState("#10b981");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ categories: Category[] }>("/api/categories");
      setCategories(data.categories);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat kategori.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setName("");
    setType("expense");
    setIcon("tag");
    setColor("#10b981");
    setError(undefined);
    setModalOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama kategori wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/categories", { name, type, icon, color });
      toast.success("Kategori berhasil ditambahkan.");
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan kategori.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/categories/${deleting.id}`);
      toast.success("Kategori berhasil dihapus.");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus kategori.");
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) return <Card>Memuat...</Card>;

  const expenseCats = categories.filter((c) => c.type === "expense");
  const incomeCats = categories.filter((c) => c.type === "income");

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button icon={<Plus size={16} />} onClick={openCreate}>
          Tambah Kategori
        </Button>
      </div>
      <Card>
        <h2 className="mb-3 font-semibold">Kategori Pengeluaran</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {expenseCats.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <AppIcon name={c.icon} size={14} /> {c.name}
              </span>
              {!c.isDefault && (
                <button onClick={() => setDeleting(c)} className="text-muted hover:text-danger">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Kategori Pemasukan</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {incomeCats.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <AppIcon name={c.icon} size={14} /> {c.name}
              </span>
              {!c.isDefault && (
                <button onClick={() => setDeleting(c)} className="text-muted hover:text-danger">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Kategori">
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          <div>
            <Label htmlFor="catName" required>
              Nama Kategori
            </Label>
            <Input id="catName" value={name} onChange={(e) => setName(e.target.value)} />
            <FieldError message={error} />
          </div>
          <div>
            <Label htmlFor="catType">Jenis</Label>
            <Select id="catType" value={type} onChange={(e) => setType(e.target.value as "income" | "expense")}>
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </Select>
          </div>
          <div>
            <Label>Ikon</Label>
            <div className="grid grid-cols-8 gap-2">
              {ICON_NAMES.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-lg border",
                    icon === i ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted",
                  )}
                >
                  <AppIcon name={i} size={15} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="catColor">Warna</Label>
            <Input id="catColor" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 p-1" />
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
        title="Hapus Kategori"
        description={`Kategori "${deleting?.name}" akan dihapus. Kategori yang masih dipakai transaksi tidak dapat dihapus.`}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}

function TemaTab() {
  const { theme, setTheme } = useTheme();
  return (
    <Card className="max-w-lg">
      <h2 className="mb-4 font-semibold">Tampilan</h2>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setTheme("light")}
          className={clsx(
            "flex flex-col items-center gap-2 rounded-2xl border p-5",
            theme === "light" ? "border-primary bg-primary-soft" : "border-border",
          )}
        >
          <Sun size={22} />
          <span className="text-sm font-medium">Mode Terang</span>
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={clsx(
            "flex flex-col items-center gap-2 rounded-2xl border p-5",
            theme === "dark" ? "border-primary bg-primary-soft" : "border-border",
          )}
        >
          <Moon size={22} />
          <span className="text-sm font-medium">Mode Gelap</span>
        </button>
      </div>
    </Card>
  );
}

function DataTab() {
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleSeed() {
    setSeeding(true);
    try {
      await apiPost("/api/demo/seed");
      toast.success("Data demo berhasil ditambahkan. Lihat di Dashboard.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat data demo.");
    } finally {
      setSeeding(false);
    }
  }

  async function handleClear() {
    setClearing(true);
    try {
      await apiPost("/api/demo/clear");
      toast.success("Data demo berhasil dihapus.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus data demo.");
    } finally {
      setClearing(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      await apiPost("/api/account/delete");
      toast.success("Akun berhasil dihapus.");
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus akun.");
      setDeleteLoading(false);
    }
  }

  return (
    <div className="grid max-w-lg gap-5">
      <Card>
        <h2 className="mb-2 flex items-center gap-2 font-semibold">
          <Download size={16} /> Ekspor Data
        </h2>
        <p className="mb-3 text-sm text-muted">Unduh seluruh data keuangan Anda dalam format JSON.</p>
        <a href="/api/account/export">
          <Button variant="secondary" icon={<Download size={16} />}>
            Ekspor Data Akun
          </Button>
        </a>
      </Card>
      <Card>
        <h2 className="mb-2 flex items-center gap-2 font-semibold">
          <Sparkles size={16} /> Data Demo
        </h2>
        <p className="mb-3 text-sm text-muted">
          Coba aplikasi dengan data contoh yang jelas berlabel &quot;(Demo)&quot; — tidak akan tercampur dengan data asli Anda.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" loading={seeding} onClick={handleSeed}>
            Buat Data Demo
          </Button>
          <Button variant="outline" loading={clearing} onClick={handleClear}>
            Hapus Data Demo
          </Button>
        </div>
      </Card>
      <Card className="border-danger/30">
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-danger">
          <TriangleAlert size={16} /> Zona Berbahaya
        </h2>
        <p className="mb-3 text-sm text-muted">
          Menghapus akun akan menghapus seluruh data keuangan Anda secara permanen dan tidak dapat dibatalkan.
        </p>
        <Button variant="danger" onClick={() => setDeleteOpen(true)}>
          Hapus Akun
        </Button>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        title="Hapus Akun Secara Permanen"
        description="Semua dompet, transaksi, kantong, anggaran, dan target tabungan Anda akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus Akun"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
        loading={deleteLoading}
      />
    </div>
  );
}
