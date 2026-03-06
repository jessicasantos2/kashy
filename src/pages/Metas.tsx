import { useState } from "react";
import { Target, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/data/financialData";
import { useGoals } from "@/hooks/useGoals";

const emptyGoalForm = { name: "", targetAmount: 0 };
const emptyEntryForm = { date: "", amount: 0 };

const Metas = () => {
  const { goals, loading, addGoal, updateGoal, removeGoal, addEntry, removeEntry } = useGoals();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalForm, setGoalForm] = useState(emptyGoalForm);

  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryForm, setEntryForm] = useState(emptyEntryForm);

  const getCurrent = (g: typeof goals[0]) => g.entries.reduce((s, e) => s + e.amount, 0);
  const getProgress = (g: typeof goals[0]) => g.target_amount > 0 ? Math.min((getCurrent(g) / g.target_amount) * 100, 100) : 0;

  const openNewGoal = () => { setEditingGoalId(null); setGoalForm(emptyGoalForm); setGoalDialogOpen(true); };
  const openEditGoal = (g: typeof goals[0]) => { setEditingGoalId(g.id); setGoalForm({ name: g.name, targetAmount: g.target_amount }); setGoalDialogOpen(true); };

  const saveGoal = async () => {
    if (!goalForm.name.trim() || goalForm.targetAmount <= 0) return;
    if (editingGoalId) {
      await updateGoal(editingGoalId, goalForm.name, goalForm.targetAmount);
    } else {
      await addGoal(goalForm.name, goalForm.targetAmount);
    }
    setGoalDialogOpen(false);
  };

  const openNewEntry = () => { setEntryForm(emptyEntryForm); setEntryDialogOpen(true); };

  const saveEntry = async () => {
    if (!entryForm.date || entryForm.amount <= 0 || !selectedGoalId) return;
    await addEntry(selectedGoalId, entryForm);
    setEntryDialogOpen(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  if (selectedGoal) {
    const current = getCurrent(selectedGoal);
    const progress = getProgress(selectedGoal);
    const remaining = Math.max(selectedGoal.target_amount - current, 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedGoalId(null)}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{selectedGoal.name}</h1>
            <p className="text-sm text-muted-foreground">{formatCurrency(current)} de {formatCurrency(selectedGoal.target_amount)} · Faltam {formatCurrency(remaining)}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Progresso</span><span className="font-medium">{progress.toFixed(1)}%</span></div>
          <Progress value={progress} className="h-3" />
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div><p className="text-xs text-muted-foreground">Objetivo</p><p className="text-sm font-bold">{formatCurrency(selectedGoal.target_amount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Atual</p><p className="text-sm font-bold text-primary">{formatCurrency(current)}</p></div>
            <div><p className="text-xs text-muted-foreground">Restante</p><p className="text-sm font-bold text-destructive">{formatCurrency(remaining)}</p></div>
          </div>
        </div>
        <div className="flex justify-end"><Button onClick={openNewEntry} className="gap-2"><Plus className="w-4 h-4" /> Novo Aporte</Button></div>
        {selectedGoal.entries.length === 0 ? (
          <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center"><Target className="w-12 h-12 text-muted-foreground/40 mb-4" /><h3 className="text-lg font-semibold">Nenhum aporte</h3><p className="text-sm text-muted-foreground mt-1">Adicione aportes para acompanhar o progresso.</p></div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
              <TableBody>{selectedGoal.entries.map(e => (
                <TableRow key={e.id}><TableCell>{new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell><TableCell className="text-right font-medium text-primary">{formatCurrency(e.amount)}</TableCell><TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeEntry(e.id)}><Trash2 className="w-4 h-4" /></Button></TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </div>
        )}
        <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Novo Aporte</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={entryForm.date} onChange={e => setEntryForm({ ...entryForm, date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step={0.01} min={0} value={entryForm.amount || ""} onChange={e => setEntryForm({ ...entryForm, amount: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>Cancelar</Button>
              <Button onClick={saveEntry} disabled={!entryForm.date || entryForm.amount <= 0}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Metas</h1><p className="text-muted-foreground text-sm">Defina e acompanhe suas metas financeiras</p></div>
        <Button onClick={openNewGoal} className="gap-2"><Plus className="w-4 h-4" /> Nova Meta</Button>
      </div>
      {goals.length === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center"><Target className="w-12 h-12 text-muted-foreground/40 mb-4" /><h3 className="text-lg font-semibold">Nenhuma meta definida</h3><p className="text-sm text-muted-foreground mt-1">Crie metas para organizar seu planejamento.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(g => {
            const current = getCurrent(g);
            const progress = getProgress(g);
            return (
              <div key={g.id} className="glass-card rounded-xl p-5 flex flex-col gap-4 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setSelectedGoalId(g.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Target className="w-5 h-5 text-primary" /></div><span className="font-semibold">{g.name}</span></div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditGoal(g)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeGoal(g.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground"><span>{formatCurrency(current)}</span><span>{progress.toFixed(0)}%</span></div>
                  <p className="text-lg font-bold">{formatCurrency(g.target_amount)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingGoalId ? "Editar Meta" : "Nova Meta"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={goalForm.name} onChange={e => setGoalForm({ ...goalForm, name: e.target.value })} maxLength={50} placeholder="Ex: Reserva de emergência" /></div>
            <div className="space-y-2"><Label>Valor Objetivo (R$)</Label><Input type="number" step={0.01} min={0} value={goalForm.targetAmount || ""} onChange={e => setGoalForm({ ...goalForm, targetAmount: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveGoal} disabled={!goalForm.name.trim() || goalForm.targetAmount <= 0}>{editingGoalId ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Metas;
