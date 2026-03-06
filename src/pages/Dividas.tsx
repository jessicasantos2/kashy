import { useState } from "react";
import { parseLocalDate } from "@/lib/utils";
import { HandCoins, Plus, Pencil, Trash2, ArrowLeft, TrendingDown, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/data/financialData";
import { useDebts } from "@/hooks/useDebts";

const emptyDebtForm = { name: "", totalAmount: 0, date: "" };
const emptyPaymentForm = { date: "", description: "", amount: 0 };

const Dividas = () => {
  const { debts, loading, addDebt, updateDebt, removeDebt, addPayment, removePayment } = useDebts();
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);

  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [debtForm, setDebtForm] = useState(emptyDebtForm);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);

  const getPaid = (d: typeof debts[0]) => d.payments.reduce((s, p) => s + p.amount, 0);
  const getRemaining = (d: typeof debts[0]) => d.total_amount - getPaid(d);

  const openNewDebt = () => { setEditingDebtId(null); setDebtForm(emptyDebtForm); setDebtDialogOpen(true); };
  const openEditDebt = (d: typeof debts[0]) => { setEditingDebtId(d.id); setDebtForm({ name: d.name, totalAmount: d.total_amount, date: d.date || "" }); setDebtDialogOpen(true); };

  const saveDebt = async () => {
    if (!debtForm.name.trim() || debtForm.totalAmount <= 0) return;
    if (editingDebtId) {
      await updateDebt(editingDebtId, debtForm.name, debtForm.totalAmount, debtForm.date || undefined);
    } else {
      await addDebt(debtForm.name, debtForm.totalAmount, debtForm.date || undefined);
    }
    setDebtDialogOpen(false);
  };

  const openNewPayment = () => { setPaymentForm(emptyPaymentForm); setPaymentDialogOpen(true); };

  const savePayment = async () => {
    if (!paymentForm.description.trim() || !paymentForm.date || paymentForm.amount <= 0 || !selectedDebtId) return;
    await addPayment(selectedDebtId, paymentForm);
    setPaymentDialogOpen(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const selectedDebt = debts.find(d => d.id === selectedDebtId);

  if (selectedDebt) {
    const paid = getPaid(selectedDebt);
    const remaining = getRemaining(selectedDebt);
    const progress = selectedDebt.total_amount > 0 ? (paid / selectedDebt.total_amount) * 100 : 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedDebtId(null)}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{selectedDebt.name}</h1>
            <p className="text-sm text-muted-foreground">{formatCurrency(paid)} pago de {formatCurrency(selectedDebt.total_amount)} · Restante: {formatCurrency(remaining)}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Progresso</span><span className="font-medium">{Math.min(progress, 100).toFixed(1)}%</span></div>
          <Progress value={Math.min(progress, 100)} className="h-3" />
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div><p className="text-xs text-muted-foreground">Total</p><p className="text-sm font-bold">{formatCurrency(selectedDebt.total_amount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Pago</p><p className="text-sm font-bold text-primary">{formatCurrency(paid)}</p></div>
            <div><p className="text-xs text-muted-foreground">Restante</p><p className="text-sm font-bold text-destructive">{formatCurrency(remaining)}</p></div>
          </div>
        </div>
        <div className="flex justify-end"><Button onClick={openNewPayment} className="gap-2"><Plus className="w-4 h-4" /> Novo Pagamento</Button></div>
        {selectedDebt.payments.length === 0 ? (
          <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center"><HandCoins className="w-12 h-12 text-muted-foreground/40 mb-4" /><h3 className="text-lg font-semibold">Nenhum pagamento</h3><p className="text-sm text-muted-foreground mt-1">Adicione pagamentos para acompanhar o progresso.</p></div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Pagamento</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
              <TableBody>{selectedDebt.payments.map(p => (
                <TableRow key={p.id}><TableCell>{parseLocalDate(p.date).toLocaleDateString("pt-BR")}</TableCell><TableCell>{p.description}</TableCell><TableCell className="text-right font-medium text-primary">{formatCurrency(p.amount)}</TableCell><TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removePayment(p.id)}><Trash2 className="w-4 h-4" /></Button></TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </div>
        )}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Novo Pagamento</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Pagamento</Label><Input value={paymentForm.description} onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })} placeholder="Ex: Parcela 1" maxLength={100} /></div>
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step={0.01} min={0} value={paymentForm.amount || ""} onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
              <Button onClick={savePayment} disabled={!paymentForm.description.trim() || !paymentForm.date || paymentForm.amount <= 0}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const totalAll = debts.reduce((s, d) => s + d.total_amount, 0);
  const paidAll = debts.reduce((s, d) => s + getPaid(d), 0);
  const remainingAll = totalAll - paidAll;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Dívidas</h1><p className="text-muted-foreground text-sm">Acompanhe e controle suas dívidas</p></div>
        <Button onClick={openNewDebt} className="gap-2"><Plus className="w-4 h-4" /> Nova Dívida</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 min-w-0"><div className="p-2.5 rounded-lg bg-muted flex-shrink-0"><TrendingDown className="w-5 h-5 text-foreground" /></div><div className="min-w-0"><p className="text-sm text-muted-foreground">Total</p><p className="text-lg md:text-xl font-bold truncate">{formatCurrency(totalAll)}</p></div></div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 min-w-0"><div className="p-2.5 rounded-lg bg-primary/10 flex-shrink-0"><CheckCircle className="w-5 h-5 text-primary" /></div><div className="min-w-0"><p className="text-sm text-muted-foreground">Pago</p><p className="text-lg md:text-xl font-bold text-primary truncate">{formatCurrency(paidAll)}</p></div></div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 min-w-0"><div className="p-2.5 rounded-lg bg-destructive/10 flex-shrink-0"><AlertCircle className="w-5 h-5 text-destructive" /></div><div className="min-w-0"><p className="text-sm text-muted-foreground">Restante</p><p className="text-lg md:text-xl font-bold text-destructive truncate">{formatCurrency(remainingAll)}</p></div></div>
      </div>
      {debts.length === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center"><HandCoins className="w-12 h-12 text-muted-foreground/40 mb-4" /><h3 className="text-lg font-semibold">Nenhuma dívida registrada</h3><p className="text-sm text-muted-foreground mt-1">Registre suas dívidas para planejar pagamentos.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {debts.map(d => {
            const paid = getPaid(d);
            const remaining = getRemaining(d);
            const progress = d.total_amount > 0 ? (paid / d.total_amount) * 100 : 0;
            return (
              <div key={d.id} className="glass-card rounded-xl p-5 flex flex-col gap-4 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setSelectedDebtId(d.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><HandCoins className="w-5 h-5 text-destructive" /></div><span className="font-semibold">{d.name}</span></div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDebt(d)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeDebt(d.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Progress value={Math.min(progress, 100)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Pago: {formatCurrency(paid)}</span><span>Restante: {formatCurrency(remaining)}</span></div>
                  <p className="text-lg font-bold">{formatCurrency(d.total_amount)}</p>
                  {d.date && <p className="text-xs text-muted-foreground">Desde {parseLocalDate(d.date).toLocaleDateString("pt-BR")}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={debtDialogOpen} onOpenChange={setDebtDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingDebtId ? "Editar Dívida" : "Nova Dívida"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={debtForm.name} onChange={e => setDebtForm({ ...debtForm, name: e.target.value })} maxLength={50} placeholder="Ex: Empréstimo bancário" /></div>
            <div className="space-y-2"><Label>Data da Dívida</Label><Input type="date" value={debtForm.date} onChange={e => setDebtForm({ ...debtForm, date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Valor Total (R$)</Label><Input type="number" step={0.01} min={0} value={debtForm.totalAmount || ""} onChange={e => setDebtForm({ ...debtForm, totalAmount: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDebtDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveDebt} disabled={!debtForm.name.trim() || debtForm.totalAmount <= 0}>{editingDebtId ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dividas;
