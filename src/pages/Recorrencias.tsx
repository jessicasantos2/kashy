import { useState } from "react";
import { RefreshCw, Plus, Pencil, Trash2, Zap, Loader2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { formatCurrency } from "@/data/financialData";
import { useRecurrences } from "@/hooks/useRecurrences";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/useCategories";

const emptyForm = { name: "", amount: 0, category: "", target: "", day_of_month: 1, start_date: null as string | null, end_date: null as string | null };

const Recorrencias = () => {
  const { recurrences, loading, add, update, remove } = useRecurrences();
  const { allCategoryNames: CATEGORIES } = useCategories();
  const { accounts } = useAccounts();
  const { cards } = useCreditCards();

  

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [generating, setGenerating] = useState(false);

  const totalMonthly = recurrences.reduce((s, i) => s + i.amount, 0);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (r: typeof recurrences[0]) => {
    setEditingId(r.id);
    setForm({ name: r.name, amount: r.amount, category: r.category, target: r.target, day_of_month: r.day_of_month, start_date: r.start_date, end_date: r.end_date });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || form.amount <= 0 || !form.category || !form.target || form.day_of_month < 1 || form.day_of_month > 31) return;
    if (editingId) {
      await update(editingId, form);
    } else {
      await add(form);
    }
    setDialogOpen(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recurring-transactions", { body: {} });
      if (error) throw error;
      const count = data?.generated ?? 0;
      if (count > 0) {
        toast.success(`${count} transação(ões) gerada(s) com sucesso!`);
      } else {
        toast.info("Todas as transações do mês já foram geradas.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar transações automáticas");
    } finally {
      setGenerating(false);
    }
  };

  const parseLocalDate = (dateStr: string | null) => {
    if (!dateStr) return undefined;
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const toDateStr = (date: Date | undefined) => {
    if (!date) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Recorrências</h1><p className="text-muted-foreground text-sm">Gerencie suas despesas automáticas mensais</p></div>
        <div className="flex items-center gap-2">
          <Button onClick={handleGenerate} variant="outline" className="gap-2" disabled={generating || recurrences.length === 0}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Gerar Mês Atual
          </Button>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Nova Recorrência</Button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5 flex items-center gap-4">
        <div className="p-2.5 rounded-lg bg-primary/10"><RefreshCw className="w-5 h-5 text-primary" /></div>
        <div><p className="text-sm text-muted-foreground">Total mensal recorrente</p><p className="text-xl font-bold">{formatCurrency(totalMonthly)}</p></div>
        <Badge variant="secondary" className="ml-auto">{recurrences.length} {recurrences.length === 1 ? "item" : "itens"}</Badge>
      </div>

      {recurrences.length === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center"><RefreshCw className="w-12 h-12 text-muted-foreground/40 mb-4" /><h3 className="text-lg font-semibold">Nenhuma recorrência</h3><p className="text-sm text-muted-foreground mt-1">Crie despesas automáticas que se repetem todo mês.</p></div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Dia</TableHead><TableHead>Categoria</TableHead><TableHead>Conta/Cartão</TableHead><TableHead>Período</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>
              {[...recurrences].sort((a, b) => a.day_of_month - b.day_of_month).map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><Badge variant="outline">Dia {r.day_of_month}</Badge></TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>{r.target}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.start_date || r.end_date ? (
                      <>
                        {r.start_date ? format(parseLocalDate(r.start_date)!, "dd/MM/yyyy") : "—"}
                        {" → "}
                        {r.end_date ? format(parseLocalDate(r.end_date)!, "dd/MM/yyyy") : "—"}
                      </>
                    ) : (
                      <span className="italic">Sem limite</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium text-destructive">{formatCurrency(r.amount)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>
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
          <DialogHeader><DialogTitle>{editingId ? "Editar" : "Nova"} Recorrência</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={50} placeholder="Ex: Aluguel" /></div>
            <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step={0.01} min={0} value={form.amount || ""} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Conta bancária</Label>
                <Select value={accounts.some(a => a.name === form.target) ? form.target : ""} onValueChange={v => setForm({ ...form, target: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.name} value={a.name}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cartão de crédito</Label>
                <Select value={cards.some(c => c.name === form.target) ? form.target : ""} onValueChange={v => setForm({ ...form, target: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{cards.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Selecione uma conta bancária ou um cartão de crédito. Ao escolher um, o outro será desmarcado automaticamente.</p>
            <div className="space-y-2"><Label>Dia do mês</Label><Input type="number" min={1} max={31} value={form.day_of_month} onChange={e => setForm({ ...form, day_of_month: parseInt(e.target.value) || 1 })} /></div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data de início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.start_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.start_date ? format(parseLocalDate(form.start_date)!, "dd/MM/yyyy") : "Opcional"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parseLocalDate(form.start_date)}
                      onSelect={(d) => setForm({ ...form, start_date: toDateStr(d) })}
                      className="p-3 pointer-events-auto"
                      locale={ptBR}
                    />
                    {form.start_date && (
                      <div className="p-2 border-t">
                        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setForm({ ...form, start_date: null })}>Limpar data</Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data de fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.end_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.end_date ? format(parseLocalDate(form.end_date)!, "dd/MM/yyyy") : "Opcional"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parseLocalDate(form.end_date)}
                      onSelect={(d) => setForm({ ...form, end_date: toDateStr(d) })}
                      className="p-3 pointer-events-auto"
                      locale={ptBR}
                    />
                    {form.end_date && (
                      <div className="p-2 border-t">
                        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setForm({ ...form, end_date: null })}>Limpar data</Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Defina um período opcional para controlar quando esta recorrência deve ser cobrada. Útil para aluguéis com reajuste ou despesas temporárias.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!form.name.trim() || form.amount <= 0 || !form.category || !form.target}>{editingId ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recorrencias;
