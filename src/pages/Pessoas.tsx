import { useState, useMemo } from "react";
import { Users, Plus, Pencil, Trash2, ArrowLeft, ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight, FileBarChart, Banknote, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/data/financialData";
import { usePeople, type PersonTxType } from "@/hooks/usePeople";
import PersonReportExport from "@/components/PersonReportExport";

const emptyPersonForm = { name: "" };
const emptyTxForm = { date: "", description: "", amount: 0, type: "divida_pessoa" as PersonTxType };
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const txTypeLabels: Record<PersonTxType, string> = {
  pagamento: "Pagamento",
  divida_minha: "Dívida Minha",
  divida_pessoa: "Dívida da Pessoa",
};

const Pessoas = () => {
  const { people, loading, addPerson, updatePerson, removePerson, addTransaction, removeTransaction } = usePeople();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [personForm, setPersonForm] = useState(emptyPersonForm);

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txForm, setTxForm] = useState(emptyTxForm);
  const [reportPersonId, setReportPersonId] = useState<string | null>(null);

  // Month filter
  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth());

  const prevMonth = () => {
    if (filterMonth === 0) { setFilterMonth(11); setFilterYear(y => y - 1); }
    else setFilterMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (filterMonth === 11) { setFilterMonth(0); setFilterYear(y => y + 1); }
    else setFilterMonth(m => m + 1);
  };

  const filterPrefix = `${filterYear}-${String(filterMonth + 1).padStart(2, "0")}`;

  const [showAllMonths, setShowAllMonths] = useState(true);

  const filteredPeople = useMemo(() => people.map(p => {
    const txs = showAllMonths ? p.transactions : p.transactions.filter(t => t.date.startsWith(filterPrefix));
    return { ...p, transactions: txs };
  }), [people, filterPrefix, showAllMonths]);

  const getBalance = (txs: { amount: number }[]) => txs.reduce((s, t) => s + t.amount, 0);

  const getOverallBalance = (personId: string) => {
    const person = people.find(p => p.id === personId);
    if (!person) return 0;
    return person.transactions.reduce((s, t) => s + t.amount, 0);
  };

  const openNewPerson = () => { setEditingPersonId(null); setPersonForm(emptyPersonForm); setPersonDialogOpen(true); };
  const openEditPerson = (p: typeof people[0]) => { setEditingPersonId(p.id); setPersonForm({ name: p.name }); setPersonDialogOpen(true); };

  const savePerson = async () => {
    if (!personForm.name.trim()) return;
    if (editingPersonId) { await updatePerson(editingPersonId, personForm.name); } else { await addPerson(personForm.name); }
    setPersonDialogOpen(false);
  };

  const openNewTx = () => { setTxForm(emptyTxForm); setTxDialogOpen(true); };

  const saveTx = async () => {
    if (!txForm.description.trim() || !txForm.date || !selectedPersonId || txForm.amount <= 0) return;
    // Adjust sign based on type
    const finalAmount = txForm.type === "divida_pessoa" ? Math.abs(txForm.amount)
      : -Math.abs(txForm.amount); // pagamento and divida_minha are negative
    await addTransaction(selectedPersonId, { ...txForm, amount: finalAmount });
    setTxDialogOpen(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const MonthNavigator = () => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth} disabled={showAllMonths}><ChevronLeft className="w-4 h-4" /></Button>
      <span className={`text-sm font-medium min-w-[140px] text-center ${showAllMonths ? "text-muted-foreground" : ""}`}>
        {showAllMonths ? "Todos os meses" : `${monthNames[filterMonth]} ${filterYear}`}
      </span>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth} disabled={showAllMonths}><ChevronRight className="w-4 h-4" /></Button>
      <Button variant={showAllMonths ? "default" : "outline"} size="sm" className="h-8 text-xs ml-1" onClick={() => setShowAllMonths(!showAllMonths)}>
        Todos
      </Button>
    </div>
  );

  const selectedPerson = filteredPeople.find(p => p.id === selectedPersonId);

  if (selectedPerson) {
    const overallBal = getOverallBalance(selectedPerson.id);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedPersonId(null)}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{selectedPerson.name}</h1>
            <p className={`text-sm font-medium ${overallBal > 0 ? "text-primary" : overallBal < 0 ? "text-destructive" : "text-muted-foreground"}`}>
              Saldo geral: {overallBal > 0 ? "Deve para você" : overallBal < 0 ? "Você deve" : "Quitado"} · {formatCurrency(Math.abs(overallBal))}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <MonthNavigator />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReportPersonId(selectedPerson.id)} className="gap-2"><FileBarChart className="w-4 h-4" /> Relatório</Button>
            <Button onClick={openNewTx} className="gap-2"><Plus className="w-4 h-4" /> Nova Transação</Button>
          </div>
        </div>

        {selectedPerson.transactions.length === 0 ? (
          <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center">
            <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma transação neste período</h3>
            <p className="text-sm text-muted-foreground mt-1">Navegue entre os meses ou adicione novas transações.</p>
          </div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
              <TableBody>
                {selectedPerson.transactions.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell>{new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        tx.type === "pagamento" ? "bg-accent text-accent-foreground" :
                        tx.type === "divida_minha" ? "bg-destructive/10 text-destructive" :
                        "bg-primary/10 text-primary"
                      }`}>
                        {tx.type === "pagamento" ? <Banknote className="w-3 h-3" /> : tx.type === "divida_minha" ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                        {txTypeLabels[tx.type] || "Dívida da Pessoa"}
                      </span>
                    </TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell className={`text-right font-medium ${tx.amount >= 0 ? "text-primary" : "text-destructive"}`}>{tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeTransaction(tx.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nova Transação</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={txForm.type} onValueChange={(v) => setTxForm({ ...txForm, type: v as PersonTxType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="divida_pessoa">Dívida da Pessoa</SelectItem>
                    <SelectItem value="divida_minha">Dívida Minha</SelectItem>
                    <SelectItem value="pagamento">Pagamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Descrição</Label><Input value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} placeholder="Ex: Almoço" maxLength={100} /></div>
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step={0.01} min={0.01} value={txForm.amount || ""} onChange={e => setTxForm({ ...txForm, amount: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTxDialogOpen(false)}>Cancelar</Button>
              <Button onClick={saveTx} disabled={!txForm.description.trim() || !txForm.date}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {reportPersonId && (() => {
          const rp = people.find(p => p.id === reportPersonId);
          return rp ? <PersonReportExport person={rp} open onOpenChange={(o) => { if (!o) setReportPersonId(null); }} /> : null;
        })()}
      </div>
    );
  }

  const totalOwedToMe = filteredPeople.reduce((s, p) => { const b = getBalance(p.transactions); return b > 0 ? s + b : s; }, 0);
  const totalIOwn = filteredPeople.reduce((s, p) => { const b = getBalance(p.transactions); return b < 0 ? s + Math.abs(b) : s; }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Pessoas</h1><p className="text-muted-foreground text-sm">Controle financeiro com outras pessoas</p></div>
        <Button onClick={openNewPerson} className="gap-2"><Plus className="w-4 h-4" /> Nova Pessoa</Button>
      </div>
      <div className="flex items-center justify-center">
        <MonthNavigator />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 min-w-0"><div className="p-2.5 rounded-lg bg-primary/10 flex-shrink-0"><ArrowUpRight className="w-5 h-5 text-primary" /></div><div className="min-w-0"><p className="text-sm text-muted-foreground">Me devem</p><p className="text-lg md:text-xl font-bold text-primary truncate">{formatCurrency(totalOwedToMe)}</p></div></div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 min-w-0"><div className="p-2.5 rounded-lg bg-destructive/10 flex-shrink-0"><ArrowDownLeft className="w-5 h-5 text-destructive" /></div><div className="min-w-0"><p className="text-sm text-muted-foreground">Eu devo</p><p className="text-lg md:text-xl font-bold text-destructive truncate">{formatCurrency(totalIOwn)}</p></div></div>
      </div>
      {people.length === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center">
          <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma pessoa cadastrada</h3>
          <p className="text-sm text-muted-foreground mt-1">Adicione pessoas para controlar dívidas e créditos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPeople.map(p => {
            const bal = getBalance(p.transactions);
            const label = showAllMonths ? "Saldo geral" : "Saldo do mês";
            return (
              <div key={p.id} className="glass-card rounded-xl p-5 flex flex-col justify-between gap-4 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setSelectedPersonId(p.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div><span className="font-semibold">{p.name}</span></div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setReportPersonId(p.id)}><FileBarChart className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditPerson(p)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removePerson(p.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-lg font-bold ${bal > 0 ? "text-primary" : bal < 0 ? "text-destructive" : "text-foreground"}`}>{bal > 0 ? "+" : ""}{formatCurrency(bal)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{bal > 0 ? "Deve para você" : bal < 0 ? "Você deve" : "Quitado"}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={personDialogOpen} onOpenChange={setPersonDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingPersonId ? "Editar Pessoa" : "Nova Pessoa"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2"><div className="space-y-2"><Label>Nome</Label><Input value={personForm.name} onChange={e => setPersonForm({ ...personForm, name: e.target.value })} maxLength={50} placeholder="Ex: João" /></div></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPersonDialogOpen(false)}>Cancelar</Button>
            <Button onClick={savePerson} disabled={!personForm.name.trim()}>{editingPersonId ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {reportPersonId && (() => {
        const rp = people.find(p => p.id === reportPersonId);
        return rp ? <PersonReportExport person={rp} open onOpenChange={(o) => { if (!o) setReportPersonId(null); }} /> : null;
      })()}
    </div>
  );
};

export default Pessoas;
