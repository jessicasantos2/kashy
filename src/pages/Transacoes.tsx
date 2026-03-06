import { useState, useMemo, useRef } from "react";
import { todayString, getMinDisplayYear } from "@/lib/utils";
import { Plus, Pencil, Trash2, Search, ArrowLeftRight, Check, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/data/financialData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { usePeople } from "@/hooks/usePeople";
import { useSalaries } from "@/hooks/useSalaries";
import { useIsMobile } from "@/hooks/use-mobile";

import { useCategories } from "@/hooks/useCategories";
import { CategoryBadge } from "@/components/CategoryBadge";
const MONTHS = ["Todos", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const emptyForm = {
  date: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; })(),
  description: "",
  category: "Outros",
  account: null as string | null,
  card: null as string | null,
  person: "",
  value: 0,
  type: "despesa",
  isInstallment: false,
  totalInstallments: 2,
};

/* ── Swipeable Card for Mobile ── */
function SwipeableTransactionCard({
  tx,
  onEdit,
  onDelete,
  onTogglePaid,
  getCategoryMeta,
}: {
  tx: ReturnType<typeof useTransactions>["transactions"][0];
  onEdit: () => void;
  onDelete: () => void;
  onTogglePaid: () => void;
  getCategoryMeta: (name: string) => { icon: string; color: string };
}) {
  const startX = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [swiped, setSwiped] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = startX.current - e.touches[0].clientX;
    if (diff > 0) setOffsetX(Math.min(diff, 140));
  };
  const handleTouchEnd = () => {
    if (offsetX > 70) {
      setOffsetX(140);
      setSwiped(true);
    } else {
      setOffsetX(0);
      setSwiped(false);
    }
  };
  const resetSwipe = () => { setOffsetX(0); setSwiped(false); };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Actions behind */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          onClick={() => { resetSwipe(); onEdit(); }}
          className="w-[70px] bg-accent flex items-center justify-center text-accent-foreground"
        >
          <Pencil className="w-5 h-5" />
        </button>
        <button
          onClick={() => { resetSwipe(); onDelete(); }}
          className="w-[70px] bg-destructive flex items-center justify-center text-destructive-foreground"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Card */}
      <div
        className="glass-card rounded-xl p-4 relative bg-card transition-transform"
        style={{ transform: `translateX(-${offsetX}px)`, transition: swiped ? "none" : "transform 0.2s" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (swiped) resetSwipe(); }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); if (tx.type !== "receita") onTogglePaid(); }} className="flex-shrink-0" disabled={tx.type === "receita"}>
              {tx.type === "receita"
                ? <Check className="w-4 h-4 text-muted-foreground/40" />
                : tx.paid
                ? <Check className="w-4 h-4 text-primary" />
                : <CircleDashed className="w-4 h-4 text-muted-foreground" />
              }
            </button>
            <span className={`text-sm font-semibold truncate flex-1 mr-2 ${tx.paid ? "line-through opacity-60" : ""}`}>{tx.description}</span>
          </div>
          <span className={`text-sm font-bold ${tx.type === "receita" ? "text-primary" : "text-destructive"} ${tx.paid ? "opacity-60" : ""}`}>
            {tx.type === "receita" ? "+" : "-"}{formatCurrency(tx.value)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
          <span>•</span>
          <CategoryBadge name={tx.category} {...getCategoryMeta(tx.category)} size="sm" />
          {tx.total_installments && tx.total_installments > 1 && (
            <>
              <span>•</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                Parcela {tx.installment_number}/{tx.total_installments}
              </Badge>
            </>
          )}
        </div>
        {(tx.account || tx.card) && (
          <p className="text-xs text-muted-foreground mt-1">{tx.card || tx.account}</p>
        )}
      </div>
    </div>
  );
}

const Transacoes = () => {
  const { transactions, loading, add, addInstallments, update, remove, removeFutureInstallments, togglePaid } = useTransactions();
  const { accounts } = useAccounts();
  const { cards } = useCreditCards();
  const { people, addPerson } = usePeople();
  const { salaries } = useSalaries();
  const isMobile = useIsMobile();
  const { allCategoryNames, getCategoryMeta } = useCategories();
  const [newPersonName, setNewPersonName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [filterYear, setFilterYear] = useState("Todos");
  const [filterMonth, setFilterMonth] = useState("Todos");
  const [filterCategory, setFilterCategory] = useState("Todos");
  const [filterAccount, setFilterAccount] = useState("Todos");
  const [filterCard, setFilterCard] = useState("Todos");
  const [filterPerson, setFilterPerson] = useState("");
  const [search, setSearch] = useState("");

  const years = useMemo(() => {
    const minYear = getMinDisplayYear();
    const set = new Set(transactions
      .filter((t) => {
        const y = parseInt(t.date.slice(0, 4));
        // Keep transactions within 5-year window OR with installments
        return y >= minYear || (t.total_installments && t.total_installments > 1);
      })
      .map((t) => t.date.slice(0, 4)));
    return ["Todos", ...Array.from(set).sort().reverse()];
  }, [transactions]);

  const accountNames = useMemo(() => accounts.map(a => a.name), [accounts]);
  const cardNames = useMemo(() => cards.map(c => c.name), [cards]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterYear !== "Todos" && !t.date.startsWith(filterYear)) return false;
      if (filterMonth !== "Todos") {
        const mi = MONTHS.indexOf(filterMonth) - 1;
        if (parseInt(t.date.slice(5, 7)) !== mi + 1) return false;
      }
      if (filterCategory !== "Todos" && t.category !== filterCategory) return false;
      if (filterAccount !== "Todos" && t.account !== filterAccount) return false;
      if (filterCard !== "Todos" && t.card !== filterCard) return false;
      if (filterPerson && !(t.person ?? "").toLowerCase().includes(filterPerson.toLowerCase())) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, filterYear, filterMonth, filterCategory, filterAccount, filterCard, filterPerson, search]);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (tx: typeof transactions[0]) => {
    setEditingId(tx.id);
    setForm({
      date: tx.date,
      description: tx.description,
      category: tx.category,
      account: tx.account,
      card: tx.card,
      person: tx.person ?? "",
      value: tx.value,
      type: tx.type,
      isInstallment: false,
      totalInstallments: 2,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || form.value <= 0) return;
    if (editingId) {
      const { isInstallment, totalInstallments, ...txData } = form;
      await update(editingId, txData);
    } else if (form.isInstallment && form.totalInstallments >= 2) {
      const { isInstallment, totalInstallments, value, ...txData } = form;
      await addInstallments(txData, value, totalInstallments);
    } else {
      const { isInstallment, totalInstallments, ...txData } = form;
      await add(txData);
    }
    setDialogOpen(false);
  };

  const handleDelete = (tx: typeof transactions[0]) => {
    if (tx.transaction_group_id && tx.date > todayString()) {
      removeFutureInstallments(tx.transaction_group_id);
    } else {
      remove(tx.id);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Transações</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas receitas e despesas</p>
        </div>
        <Button onClick={openNew} className="gap-2" size={isMobile ? "sm" : "default"}>
          <Plus className="w-4 h-4" /> Nova
        </Button>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-3 md:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 md:gap-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Ano da transação</span>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Mês de referência</span>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Tipo de gasto</span>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {allCategoryNames.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!isMobile && (
            <>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Conta bancária</span>
                <Select value={filterAccount} onValueChange={setFilterAccount}>
                  <SelectTrigger><SelectValue placeholder="Conta" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {accountNames.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Cartão de crédito</span>
                <Select value={filterCard} onValueChange={setFilterCard}>
                  <SelectTrigger><SelectValue placeholder="Cartão" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {cardNames.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Filtrar por pessoa</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Pessoa" value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)} className="pl-9" />
                </div>
              </div>
            </>
          )}
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <span className="text-xs text-muted-foreground">Buscar descrição</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <ArrowLeftRight className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma transação encontrada</h3>
          <p className="text-sm text-muted-foreground mt-1">Adicione sua primeira transação para começar.</p>
        </div>
      ) : isMobile ? (
        /* ── Mobile: swipeable cards ── */
        <div className="space-y-2">
          {filtered.map((tx) => (
            <SwipeableTransactionCard
              key={tx.id}
              tx={tx}
              onEdit={() => openEdit(tx)}
              onDelete={() => handleDelete(tx)}
              onTogglePaid={() => togglePaid(tx.id, !tx.paid)}
              getCategoryMeta={getCategoryMeta}
            />
          ))}
        </div>
      ) : (
        /* ── Desktop: table ── */
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Cartão</TableHead>
                <TableHead>Pessoa</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => (
                <TableRow key={tx.id} className={tx.paid ? "opacity-60" : ""}>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => tx.type !== "receita" && togglePaid(tx.id, !tx.paid)} disabled={tx.type === "receita"}>
                      {tx.type === "receita" ? <Check className="w-4 h-4 text-muted-foreground/40" /> : tx.paid ? <Check className="w-4 h-4 text-primary" /> : <CircleDashed className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {tx.description}
                    {tx.total_installments && tx.total_installments > 1 && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {tx.installment_number}/{tx.total_installments}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell><CategoryBadge name={tx.category} {...getCategoryMeta(tx.category)} /></TableCell>
                  <TableCell>{tx.account || "—"}</TableCell>
                  <TableCell>{tx.card || "—"}</TableCell>
                  <TableCell>{tx.person || "—"}</TableCell>
                  <TableCell className={`text-right font-bold ${tx.type === "receita" ? "text-primary" : "text-destructive"}`}>
                    {tx.type === "receita" ? "+" : "-"} {formatCurrency(tx.value)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tx.type === "receita" ? "default" : "destructive"} className="text-xs">
                      {tx.type === "receita" ? "Receita" : "Despesa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tx)}><Pencil className="w-4 h-4" /></Button>
                      {tx.transaction_group_id && tx.date > todayString() ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFutureInstallments(tx.transaction_group_id!)}><Trash2 className="w-4 h-4" /></Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(tx.id)}><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Transação" : "Nova Transação"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => {
                  const updates: any = { type: v };
                  // Auto-fill account when switching to receita with Salário category
                  if (v === "receita" && form.category === "Salário") {
                    const currentYear = new Date().getFullYear();
                    const salaryEntry = salaries.find(s => s.year === currentYear && s.account);
                    if (salaryEntry?.account) updates.account = salaryEntry.account;
                  }
                  setForm({ ...form, ...updates });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={100} placeholder="Ex: Supermercado" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" min={0} step={0.01} value={form.value || ""} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => {
                  const updates: any = { category: v };
                  // Auto-fill account when selecting Salário category on receita
                  if (v === "Salário" && form.type === "receita" && !form.account) {
                    const currentYear = new Date().getFullYear();
                    const salaryEntry = salaries.find(s => s.year === currentYear && s.account);
                    if (salaryEntry?.account) updates.account = salaryEntry.account;
                  }
                  setForm({ ...form, ...updates });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{allCategoryNames.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {!editingId && (
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label className="text-sm font-medium">Parcelado</Label>
                  <p className="text-xs text-muted-foreground">Dividir em parcelas mensais</p>
                </div>
                <Switch checked={form.isInstallment} onCheckedChange={(v) => setForm({ ...form, isInstallment: v })} />
              </div>
            )}

            {!editingId && form.isInstallment && (
              <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="space-y-2">
                  <Label>Nº de Parcelas</Label>
                  <Input type="number" min={2} max={48} value={form.totalInstallments} onChange={(e) => setForm({ ...form, totalInstallments: Math.max(2, parseInt(e.target.value) || 2) })} />
                </div>
                <div className="space-y-2">
                  <Label>Valor da Parcela</Label>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {formatCurrency(form.value > 0 ? Math.round((form.value / form.totalInstallments) * 100) / 100 : 0)}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conta</Label>
                <Select value={form.account || "Nenhuma"} onValueChange={(v) => setForm({ ...form, account: v === "Nenhuma" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nenhuma">Nenhuma</SelectItem>
                    {accountNames.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cartão</Label>
                <Select value={form.card || "Nenhum"} onValueChange={(v) => setForm({ ...form, card: v === "Nenhum" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nenhum">Nenhum</SelectItem>
                    {cardNames.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pessoa</Label>
              <Select value={form.person || "Nenhuma"} onValueChange={(v) => {
                if (v === "__new__") return;
                setForm({ ...form, person: v === "Nenhuma" ? null : v });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nenhuma">Nenhuma</SelectItem>
                  {people.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                  <div className="px-2 py-1.5 border-t border-border mt-1">
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="Nova pessoa..."
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        className="h-8 text-sm"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                      <Button
                        size="sm"
                        className="h-8 px-3"
                        disabled={!newPersonName.trim()}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const name = newPersonName.trim();
                          if (!name) return;
                          await addPerson(name);
                          setForm({ ...form, person: name });
                          setNewPersonName("");
                        }}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.description.trim() || form.value <= 0}>
              {editingId ? "Salvar" : form.isInstallment ? `Criar ${form.totalInstallments} Parcelas` : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transacoes;
