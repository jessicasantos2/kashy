import { useState, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { usePeople } from "@/hooks/usePeople";
import { useCategories } from "@/hooks/useCategories";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/data/financialData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Edit, Check, CircleDashed, Loader2 } from "lucide-react";
import { CategoryBadge } from "@/components/CategoryBadge";

const MONTHS_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const Transacoes = () => {
  const isMobile = useIsMobile();
  const now = new Date();
  const { transactions, loading, add: addTransaction, remove: deleteTransaction, update: updateTransaction, togglePaid } = useTransactions();
  const { accounts } = useAccounts();
  const { cards } = useCreditCards();
  const { people } = usePeople();
  const { categories } = useCategories();

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    description: "",
    value: "",
    type: "despesa",
    category: "Outros",
    date: new Date().toISOString().slice(0, 10),
    account: "",
    card: "",
    person: "",
    paid: true,
  });

  const years = useMemo(() => {
    const set = new Set(transactions.map(t => parseInt(t.date.slice(0, 4))));
    set.add(now.getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [transactions]);

  const filtered = useMemo(() => {
    const monthStr = String(selectedMonth + 1).padStart(2, "0");
    const yearStr = String(selectedYear);
    return transactions.filter(t => {
      const matchDate = t.date.startsWith(`${yearStr}-${monthStr}`);
      const matchSearch = !search || t.description.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || t.type === filterType;
      return matchDate && matchSearch && matchType;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedYear, selectedMonth, search, filterType]);

  const totals = useMemo(() => {
    const receitas = filtered.filter(t => t.type === "receita").reduce((s, t) => s + t.value, 0);
    const despesas = filtered.filter(t => t.type === "despesa").reduce((s, t) => s + t.value, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [filtered]);

  const handleSubmit = async () => {
    if (!form.description || !form.value) return;
    await addTransaction({
      description: form.description,
      value: parseFloat(form.value),
      type: form.type,
      category: form.category,
      date: form.date,
      account: form.account || null,
      card: form.card || null,
      person: form.person || null,
      paid: form.paid,
    });
    setForm({ description: "", value: "", type: "despesa", category: "Outros", date: new Date().toISOString().slice(0, 10), account: "", card: "", person: "", paid: true });
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Transações</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size={isMobile ? "sm" : "default"}>
              <Plus className="h-4 w-4 mr-1" /> Nova
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Transação</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Descrição</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Supermercado" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Valor</Label>
                  <Input type="number" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0,00" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receita">Receita</SelectItem>
                      <SelectItem value="despesa">Despesa</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
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
                  <Label>Conta</Label>
                  <Select value={form.account} onValueChange={v => setForm(f => ({ ...f, account: v }))}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pessoa</Label>
                  <Select value={form.person} onValueChange={v => setForm(f => ({ ...f, person: v }))}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {people.map(p => (
                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS_LABEL.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="receita">Receitas</SelectItem>
            <SelectItem value="despesa">Despesas</SelectItem>
            <SelectItem value="transferencia">Transferências</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-card border border-border/50 p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Receitas</p>
          <p className="text-sm font-bold text-emerald-500">{formatCurrency(totals.receitas)}</p>
        </div>
        <div className="rounded-lg bg-card border border-border/50 p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Despesas</p>
          <p className="text-sm font-bold text-red-500">{formatCurrency(totals.despesas)}</p>
        </div>
        <div className="rounded-lg bg-card border border-border/50 p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Saldo</p>
          <p className={`text-sm font-bold ${totals.saldo >= 0 ? "text-emerald-500" : "text-red-500"}`}>{formatCurrency(totals.saldo)}</p>
        </div>
      </div>

      {/* Transaction list */}
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma transação encontrada.</p>
        ) : (
          filtered.map(t => (
            <div key={t.id} className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border/50 hover:bg-muted/30 transition-colors">
              <button onClick={() => togglePaid(t.id, !t.paid)} className="shrink-0">
                {t.paid ? <Check className="h-4 w-4 text-emerald-500" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${!t.paid ? "text-muted-foreground" : ""}`}>{t.description}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                  <CategoryBadge category={t.category} />
                  {t.account && <Badge variant="outline" className="text-[9px] px-1 py-0">{t.account}</Badge>}
                </div>
              </div>
              <span className={`text-sm font-semibold whitespace-nowrap ${t.type === "receita" ? "text-emerald-500" : t.type === "despesa" ? "text-red-500" : "text-blue-500"}`}>
                {t.type === "receita" ? "+" : t.type === "despesa" ? "-" : ""}{formatCurrency(t.value)}
              </span>
              <button onClick={() => deleteTransaction(t.id)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Transacoes;
