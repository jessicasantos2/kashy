import { useState } from "react";
import { useRecurrences } from "@/hooks/useRecurrences";
import { useCategories } from "@/hooks/useCategories";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/data/financialData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { CategoryBadge } from "@/components/CategoryBadge";

const Recorrencias = () => {
  const isMobile = useIsMobile();
  const { recurrences, loading, add: addRecurrence, remove: deleteRecurrence } = useRecurrences();
  const { categories } = useCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    category: "Outros",
    target: "despesa",
    day_of_month: "1",
    start_date: "",
    end_date: "",
  });

  const handleSubmit = async () => {
    if (!form.name || !form.amount) return;
    await addRecurrence({
      name: form.name,
      amount: parseFloat(form.amount),
      category: form.category,
      target: form.target,
      day_of_month: parseInt(form.day_of_month),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    });
    setForm({ name: "", amount: "", category: "Outros", target: "despesa", day_of_month: "1", start_date: "", end_date: "" });
    setDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Recorrências</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size={isMobile ? "sm" : "default"}>
              <Plus className="h-4 w-4 mr-1" /> Nova
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Recorrência</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Aluguel" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Valor</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <Label>Dia do mês</Label>
                  <Input type="number" min="1" max="31" value={form.day_of_month} onChange={e => setForm(f => ({ ...f, day_of_month: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.target} onValueChange={v => setForm(f => ({ ...f, target: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="despesa">Despesa</SelectItem>
                      <SelectItem value="receita">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Data início</Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Data fim</Label>
                  <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {recurrences.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhuma recorrência cadastrada.</p>
      ) : (
        <div className="space-y-1">
          {recurrences.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50">
              <RefreshCw className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">Dia {r.day_of_month}</span>
                  <CategoryBadge category={r.category} />
                </div>
              </div>
              <span className={`text-sm font-semibold ${r.target === "receita" ? "text-emerald-500" : "text-red-500"}`}>
                {formatCurrency(r.amount)}
              </span>
              <button onClick={() => deleteRecurrence(r.id)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Recorrencias;
