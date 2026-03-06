import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, Pencil, Trash2, Landmark, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency } from "@/data/financialData";
import { useCompanyAccounts, CompanyAccount } from "@/hooks/useCompanyAccounts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const emptyForm = { name: "", bank: "", balance: 0, image_url: null as string | null };

export function CompanyAccountsTab() {
  const { accounts, loading, add, update, remove } = useCompanyAccounts();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [balancesLoading, setBalancesLoading] = useState(true);

  // Fetch balances from RPC
  useEffect(() => {
    if (!user || accounts.length === 0) {
      setBalancesLoading(false);
      return;
    }
    const fetchBalances = async () => {
      setBalancesLoading(true);
      const { data, error } = await supabase.rpc("calculate_all_company_balances" as any, {
        p_user_id: user.id,
      });
      if (!error && data) {
        const map: Record<string, number> = {};
        for (const row of data as any[]) {
          map[row.account_id] = Number(row.calculated_balance);
        }
        setBalances(map);
      }
      setBalancesLoading(false);
    };
    fetchBalances();
  }, [user, accounts]);

  const getBalance = (account: CompanyAccount) => {
    return balances[account.id] ?? account.balance;
  };

  const totalBalance = accounts.reduce((s, a) => s + getBalance(a), 0);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (a: CompanyAccount) => {
    setEditingId(a.id);
    setForm({ name: a.name, bank: a.bank, balance: a.balance, image_url: a.image_url });
    setDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/${Date.now()}.${ext}`;

    setUploading(true);
    try {
      const { error } = await supabase.storage
        .from("company-bank-logos")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("company-bank-logos")
        .getPublicUrl(path);

      setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
      toast.success("Logo enviado!");
    } catch {
      toast.error("Erro ao enviar logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await update({ id: editingId, ...form });
      } else {
        await add(form);
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading || balancesLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Landmark className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo Total</p>
            <p className={`text-lg font-bold ${totalBalance >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Conta
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center">
          <Building2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma conta cadastrada</h3>
          <p className="text-sm text-muted-foreground mt-1">Adicione contas bancárias da empresa.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead className="text-right">Saldo Inicial</TableHead>
                <TableHead className="text-right">Saldo Atual</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div
                      className="flex items-center gap-2 cursor-pointer hover:underline"
                      onClick={() => navigate(`/empresa/conta/${a.id}`)}
                    >
                      <Avatar className="h-8 w-8">
                        {a.image_url ? (
                          <AvatarImage src={a.image_url} alt={a.name} />
                        ) : null}
                        <AvatarFallback className="text-xs bg-muted">
                          {a.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{a.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{a.bank || "—"}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(a.balance)}</TableCell>
                  <TableCell className={`text-right font-medium ${getBalance(a) >= 0 ? "text-primary" : "text-destructive"}`}>
                    {formatCurrency(getBalance(a))}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(a.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar" : "Nova"} Conta Bancária</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Logo upload */}
            <div className="space-y-2">
              <Label>Logo do Banco</Label>
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  {form.image_url ? (
                    <AvatarImage src={form.image_url} alt="Logo" />
                  ) : null}
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <Landmark className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploading ? "Enviando..." : "Enviar"}
                  </Button>
                  {form.image_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((f) => ({ ...f, image_url: null }))}
                      className="gap-1.5 text-destructive"
                    >
                      <X className="w-3.5 h-3.5" /> Remover
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome da Conta</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Conta Principal" maxLength={60} />
            </div>
            <div className="space-y-2">
              <Label>Banco</Label>
              <Input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Ex: Banco do Brasil" maxLength={60} />
            </div>
            <div className="space-y-2">
              <Label>Saldo Inicial (R$)</Label>
              <Input type="number" step={0.01} value={form.balance || ""} onChange={(e) => setForm({ ...form, balance: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
