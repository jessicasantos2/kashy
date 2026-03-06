import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Plus, Pencil, Trash2, ImagePlus, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/data/financialData";
import { useAccounts } from "@/hooks/useAccounts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const emptyForm = { name: "", balance: 0, image_url: null as string | null };

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const Contas = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  const { accounts, loading, add, update, remove, refetch } = useAccounts(monthKey);

  const { user } = useAuth();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Transfer state
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState<string>("");
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferSaving, setTransferSaving] = useState(false);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (a: typeof accounts[0]) => { setEditingId(a.id); setForm({ name: a.name, balance: a.balance, image_url: a.image_url }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingId) {
      await update(editingId, form.name, form.balance, form.image_url);
    } else {
      await add(form.name, form.balance, form.image_url);
    }
    setDialogOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };

  const totalBalance = accounts.reduce((s, a) => s + a.monthlyBalance, 0);
  const totalIncome = accounts.reduce((s, a) => s + a.monthlyIncome, 0);
  const totalExpense = accounts.reduce((s, a) => s + a.monthlyExpense, 0);

  const openTransfer = () => {
    setTransferFrom("");
    setTransferTo("");
    setTransferAmount("");
    setTransferOpen(true);
  };

  const handleTransfer = async () => {
    if (!user || !transferFrom || !transferTo || transferFrom === transferTo) return;
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0) return;
    setTransferSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const groupId = crypto.randomUUID();
      const { error } = await supabase.from("transactions").insert([
        {
          user_id: user.id,
          date: today,
          description: `Transferência para ${transferTo}`,
          category: "Transferência",
          account: transferFrom,
          type: "despesa",
          value: amount,
          paid: true,
          transaction_group_id: groupId,
        },
        {
          user_id: user.id,
          date: today,
          description: `Transferência de ${transferFrom}`,
          category: "Transferência",
          account: transferTo,
          type: "receita",
          value: amount,
          paid: true,
          transaction_group_id: groupId,
        },
      ]);
      if (error) throw error;
      toast({ title: "Transferência realizada com sucesso!" });
      setTransferOpen(false);
      await refetch();
    } catch {
      toast({ title: "Erro ao realizar transferência", variant: "destructive" });
    } finally {
      setTransferSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas contas bancárias</p>
        </div>
        <div className="flex gap-2">
          {accounts.length >= 2 && (
            <Button variant="outline" onClick={openTransfer} className="gap-2">
              <ArrowLeftRight className="w-4 h-4" /> Transferir
            </Button>
          )}
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Nova Conta</Button>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-5 h-5" /></Button>
        <span className="text-base font-semibold min-w-[180px] text-center">
          {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
        </span>
        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-5 h-5" /></Button>
      </div>

      {accounts.length === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center">
          <Wallet className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma conta cadastrada</h3>
          <p className="text-sm text-muted-foreground mt-1">Adicione suas contas para acompanhar saldos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <div key={a.id} className="glass-card rounded-xl p-5 flex flex-col justify-between gap-4 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => navigate(`/contas/${encodeURIComponent(a.name)}`)}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.name} className="w-9 h-9 rounded-lg object-contain" />
                  ) : (
                    <div className="p-2 rounded-lg bg-primary/10"><Wallet className="w-5 h-5 text-primary" /></div>
                  )}
                  <span className="font-semibold">{a.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(a); }}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); remove(a.id); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo do Mês</p>
                <p className={`text-lg font-bold ${a.monthlyBalance >= 0 ? "text-foreground" : "text-destructive"}`}>{formatCurrency(a.monthlyBalance)}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-emerald-500 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />{formatCurrency(a.monthlyIncome)}</span>
                  <span className="text-xs text-destructive flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />{formatCurrency(a.monthlyExpense)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Editar Conta" : "Nova Conta"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Logo do Banco</Label>
              <div className="flex items-center gap-3">
                {form.image_url ? (
                  <img src={form.image_url} alt="Logo" className="w-12 h-12 rounded-lg object-contain border border-border" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center"><ImagePlus className="w-5 h-5 text-muted-foreground" /></div>
                )}
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>{form.image_url ? "Trocar Imagem" : "Enviar Imagem"}</Button>
                  {form.image_url && (<Button type="button" variant="ghost" size="sm" className="text-destructive ml-1" onClick={() => setForm({ ...form, image_url: null })}>Remover</Button>)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={50} placeholder="Ex: Nubank" />
            </div>
            <div className="space-y-2">
              <Label>Saldo Atual (R$)</Label>
              <Input type="number" step={0.01} value={form.balance || ""} onChange={(e) => setForm({ ...form, balance: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>{editingId ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Transferência entre Contas</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Conta de Origem</Label>
              <Select value={transferFrom} onValueChange={setTransferFrom}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.name !== transferTo).map((a) => (
                    <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conta de Destino</Label>
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.name !== transferFrom).map((a) => (
                    <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step={0.01}
                min={0}
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleTransfer}
              disabled={transferSaving || !transferFrom || !transferTo || transferFrom === transferTo || (parseFloat(transferAmount) || 0) <= 0}
            >
              {transferSaving ? "Transferindo..." : "Transferir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contas;
