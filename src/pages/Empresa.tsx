import { useState, useMemo } from "react";
import { Building2, Plus, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/data/financialData";
import { useCompanyEntries, CompanyEntry } from "@/hooks/useCompanyEntries";
import { useCategories } from "@/hooks/useCategories";
import { useCompanyAccounts } from "@/hooks/useCompanyAccounts";
import { Badge } from "@/components/ui/badge";
import { CompanyAccountsTab } from "@/components/CompanyAccountsTab";

const emptyForm = { date: "", description: "", amount: 0, category: "Outros", company_account_id: "" };

const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const Empresa = () => {
  const { revenues, expenses, loading, add, update, remove } = useCompanyEntries();
  const { allCategoryNames } = useCategories();
  const { accounts: companyAccounts } = useCompanyAccounts();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonthNum, setSelectedMonthNum] = useState(String(now.getMonth() + 1).padStart(2, "0"));

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => String(cur - 2 + i));
  }, []);

  const prefix = `${selectedYear}-${selectedMonthNum}`;
  const filteredRevenues = useMemo(() => revenues.filter(e => e.date.startsWith(prefix)), [revenues, prefix]);
  const filteredExpenses = useMemo(() => expenses.filter(e => e.date.startsWith(prefix)), [expenses, prefix]);

  const chartData = useMemo(() => {
    const SHORT_MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return SHORT_MONTHS.map((name, i) => {
      const monthPrefix = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
      const rev = revenues.filter(e => e.date.startsWith(monthPrefix)).reduce((s, e) => s + e.amount, 0);
      const exp = expenses.filter(e => e.date.startsWith(monthPrefix)).reduce((s, e) => s + e.amount, 0);
      return { name, Receitas: rev, Gastos: exp };
    });
  }, [revenues, expenses, selectedYear]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"revenue" | "expense">("revenue");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [revPage, setRevPage] = useState(1);
  const [expPage, setExpPage] = useState(1);
  const PAGE_SIZE = 25;
  const [search, setSearch] = useState("");

  const applySearch = (entries: CompanyEntry[]) => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      e.description.toLowerCase().includes(q) ||
      (e.category || "").toLowerCase().includes(q)
    );
  };

  const searchedRevenues = useMemo(() => applySearch(filteredRevenues), [filteredRevenues, search]);
  const searchedExpenses = useMemo(() => applySearch(filteredExpenses), [filteredExpenses, search]);

  const totalRevenue = filteredRevenues.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const profit = totalRevenue - totalExpenses;

  const openNew = (type: "revenue" | "expense") => {
    setDialogType(type);
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (entry: CompanyEntry) => {
    setDialogType(entry.type as "revenue" | "expense");
    setEditingId(entry.id);
    setForm({ date: entry.date, description: entry.description, amount: entry.amount, category: entry.category || "Outros", company_account_id: entry.company_account_id });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.description.trim() || !form.date || form.amount <= 0 || !form.company_account_id) return;
    setSaving(true);
    try {
      if (editingId) {
        await update({ id: editingId, type: dialogType, ...form });
      } else {
        await add({ type: dialogType, ...form });
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await remove(id);
  };

  const getAccountName = (id: string | null) => {
    if (!id) return "—";
    return companyAccounts.find(a => a.id === id)?.name || "—";
  };

  const renderTable = (entries: CompanyEntry[], type: "revenue" | "expense", descLabel: string, page: number, setPage: (p: number) => void) => {
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    const paginated = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return entries.length === 0 ? (
      <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center">
        <Building2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold">Nenhum registro</h3>
        <p className="text-sm text-muted-foreground mt-1">Adicione {type === "revenue" ? "receitas" : "gastos"} para começar.</p>
      </div>
    ) : (
      <div className="space-y-3">
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>{descLabel}</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">{e.category || "Outros"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{getAccountName(e.company_account_id)}</TableCell>
                  <TableCell className={`text-right font-medium ${type === "revenue" ? "text-primary" : "text-destructive"}`}>
                    {formatCurrency(e.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{entries.length} registro{entries.length !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span>{page} / {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresa</h1>
          <p className="text-muted-foreground text-sm">Gerencie as finanças da sua empresa</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonthNum} onValueChange={setSelectedMonthNum}>
            <SelectTrigger className="w-[120px] bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_LABELS.map((label, i) => (
                <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[90px] bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 min-w-0">
          <div className="p-2.5 rounded-lg bg-primary/10 flex-shrink-0"><TrendingUp className="w-5 h-5 text-primary" /></div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Faturamento</p>
            <p className="text-lg md:text-xl font-bold text-primary truncate">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 min-w-0">
          <div className="p-2.5 rounded-lg bg-destructive/10 flex-shrink-0"><TrendingDown className="w-5 h-5 text-destructive" /></div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Gastos</p>
            <p className="text-lg md:text-xl font-bold text-destructive truncate">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 min-w-0">
          <div className={`p-2.5 rounded-lg flex-shrink-0 ${profit >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
            <DollarSign className={`w-5 h-5 ${profit >= 0 ? "text-primary" : "text-destructive"}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Lucro</p>
            <p className={`text-lg md:text-xl font-bold truncate ${profit >= 0 ? "text-primary" : "text-destructive"}`}>{formatCurrency(profit)}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-base font-semibold mb-4">Evolução Mensal — {selectedYear}</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
            <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
            <Legend />
            <Bar dataKey="Receitas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gastos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="revenues">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <TabsList>
            <TabsTrigger value="revenues">Receitas</TabsTrigger>
            <TabsTrigger value="expenses">Gastos</TabsTrigger>
            <TabsTrigger value="accounts">Contas</TabsTrigger>
          </TabsList>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 w-40 md:w-56 bg-secondary/50"
              />
            </div>
            <Button onClick={() => openNew("revenue")} variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Receita</Button>
            <Button onClick={() => openNew("expense")} variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Gasto</Button>
          </div>
        </div>
        <TabsContent value="revenues" className="mt-4">
          {renderTable(searchedRevenues, "revenue", "Origem", revPage, setRevPage)}
        </TabsContent>
        <TabsContent value="expenses" className="mt-4">
          {renderTable(searchedExpenses, "expense", "Descrição", expPage, setExpPage)}
        </TabsContent>
        <TabsContent value="accounts" className="mt-4">
          <CompanyAccountsTab />
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar" : "Nova"} {dialogType === "revenue" ? "Receita" : "Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{dialogType === "revenue" ? "Origem" : "Descrição"}</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={dialogType === "revenue" ? "Ex: Venda de produto" : "Ex: Aluguel"} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {allCategoryNames.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conta Bancária <span className="text-destructive">*</span></Label>
              <Select value={form.company_account_id || ""} onValueChange={v => setForm({ ...form, company_account_id: v })}>
                <SelectTrigger className={!form.company_account_id ? "border-destructive/50" : ""}>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {companyAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}{acc.bank ? ` (${acc.bank})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!form.company_account_id && <p className="text-xs text-destructive">Selecione uma conta bancária</p>}
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step={0.01} min={0} value={form.amount || ""} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.description.trim() || !form.date || form.amount <= 0 || !form.company_account_id}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Empresa;
