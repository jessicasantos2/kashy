import { useState, useRef, useMemo } from "react";
import { CreditCard, Plus, Pencil, Trash2, ChevronRight, ArrowLeft, ImagePlus, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/data/financialData";
import { Progress } from "@/components/ui/progress";
import { useCreditCards } from "@/hooks/useCreditCards";

const emptyCardForm = { name: "", card_limit: 0, closing_day: 1, due_day: 10, image_url: null as string | null };
const emptyChargeForm = { date: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; })(), description: "", installments: "1/1", value: 0 };

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const Cartoes = () => {
  const { cards, loading, addCard, updateCard, removeCard, addCharge, updateCharge, removeCharge } = useCreditCards();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCardForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [chargeDialog, setChargeDialog] = useState(false);
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null);
  const [chargeForm, setChargeForm] = useState(emptyChargeForm);

  // Month filter state
  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth()); // 0-indexed

  const prevMonth = () => {
    if (filterMonth === 0) { setFilterMonth(11); setFilterYear(y => y - 1); }
    else setFilterMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (filterMonth === 11) { setFilterMonth(0); setFilterYear(y => y + 1); }
    else setFilterMonth(m => m + 1);
  };

  const filterPrefix = `${filterYear}-${String(filterMonth + 1).padStart(2, "0")}`;

  // Filter charges by selected month
  const filteredCards = useMemo(() => cards.map(c => ({
    ...c,
    charges: c.charges.filter(ch => ch.date.startsWith(filterPrefix)),
  })), [cards, filterPrefix]);

  // Future charges: after the selected month (compromising limit)
  const futureChargesMap = useMemo(() => {
    const map = new Map<string, typeof cards[0]["charges"]>();
    const nextMonth = new Date(filterYear, filterMonth + 1, 1);
    const nextPrefix = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
    cards.forEach(c => {
      map.set(c.id, c.charges.filter(ch => ch.date > filterPrefix + "-31").sort((a, b) => a.date.localeCompare(b.date)));
    });
    return map;
  }, [cards, filterPrefix, filterYear, filterMonth]);

  const openNew = () => { setEditingId(null); setForm(emptyCardForm); setDialogOpen(true); };
  const openEdit = (c: typeof cards[0]) => { setEditingId(c.id); setForm({ name: c.name, card_limit: c.card_limit, closing_day: c.closing_day, due_day: c.due_day, image_url: c.image_url }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim() || form.card_limit <= 0) return;
    if (editingId) { await updateCard(editingId, form); } else { await addCard(form); }
    setDialogOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const totalLimit = cards.reduce((s, c) => s + c.card_limit, 0);
  const totalUsed = filteredCards.reduce((s, c) => s + c.charges.reduce((a, ch) => a + ch.value, 0), 0);
  const totalFuture = cards.reduce((s, c) => s + (futureChargesMap.get(c.id) || []).reduce((a, ch) => a + ch.value, 0), 0);
  const totalCommittedAll = totalUsed + totalFuture;

  const activeCard = filteredCards.find((c) => c.id === selectedCard);

  const openNewCharge = () => { setEditingChargeId(null); setChargeForm(emptyChargeForm); setChargeDialog(true); };
  const openEditCharge = (ch: NonNullable<typeof activeCard>["charges"][0]) => {
    setEditingChargeId(ch.id);
    setChargeForm({ date: ch.date, description: ch.description, installments: ch.installments || "1/1", value: ch.value });
    setChargeDialog(true);
  };

  const saveCharge = async () => {
    if (!chargeForm.description.trim() || chargeForm.value <= 0 || !selectedCard) return;
    if (editingChargeId) { await updateCharge(editingChargeId, chargeForm); } else { await addCharge(selectedCard, chargeForm); }
    setChargeDialog(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const MonthNavigator = () => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
      <span className="text-sm font-medium min-w-[140px] text-center">{monthNames[filterMonth]} {filterYear}</span>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
    </div>
  );

  // Detail view
  if (activeCard) {
    const used = activeCard.charges.reduce((a, ch) => a + ch.value, 0);
    const futureCharges = futureChargesMap.get(activeCard.id) || [];
    const futureTotal = futureCharges.reduce((a, ch) => a + ch.value, 0);
    const totalCommitted = used + futureTotal;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCard(null)}><ArrowLeft className="w-5 h-5" /></Button>
          {activeCard.image_url ? (
            <img src={activeCard.image_url} alt={activeCard.name} className="w-10 h-10 rounded-lg object-contain" />
          ) : (
            <div className="p-2 rounded-lg bg-primary/10"><CreditCard className="w-5 h-5 text-primary" /></div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{activeCard.name}</h1>
            <p className="text-sm text-muted-foreground">Fatura · Fech. dia {activeCard.closing_day} · Venc. dia {activeCard.due_day}</p>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <MonthNavigator />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-sm:gap-3">
          <div className="glass-card rounded-xl p-5 max-sm:py-5 max-sm:px-3"><p className="text-sm max-sm:text-xs text-muted-foreground">Limite</p><p className="text-xl max-sm:text-base font-bold">{formatCurrency(activeCard.card_limit)}</p></div>
          <div className="glass-card rounded-xl p-5 max-sm:py-5 max-sm:px-3"><p className="text-sm max-sm:text-xs text-muted-foreground">Usado ({monthNames[filterMonth]})</p><p className="text-xl max-sm:text-base font-bold text-destructive">{formatCurrency(used)}</p></div>
          <div className="glass-card rounded-xl p-5 max-sm:py-5 max-sm:px-3"><p className="text-sm max-sm:text-xs text-muted-foreground">Comprometido (futuro)</p><p className="text-xl max-sm:text-base font-bold text-amber-500">{formatCurrency(futureTotal)}</p></div>
          <div className="glass-card rounded-xl p-5 max-sm:py-5 max-sm:px-3"><p className="text-sm max-sm:text-xs text-muted-foreground">Disponível real</p><p className="text-xl max-sm:text-base font-bold text-primary">{formatCurrency(activeCard.card_limit - totalCommitted)}</p></div>
        </div>

        <h2 className="text-lg font-semibold">Lançamentos do mês</h2>


        {activeCard.charges.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center"><p className="text-muted-foreground">Nenhum lançamento neste mês.</p></div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Parcelas</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-20"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {activeCard.charges.map((ch) => (
                  <TableRow key={ch.id}>
                    <TableCell className="whitespace-nowrap">{new Date(ch.date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-medium">{ch.description}</TableCell>
                    <TableCell>{ch.installments}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">{formatCurrency(ch.value)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCharge(ch)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCharge(ch.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {futureCharges.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Lançamentos futuros <span className="text-sm font-normal text-muted-foreground">({futureCharges.length} parcelas · {formatCurrency(futureTotal)})</span></h2>
            </div>
            <div className="glass-card rounded-xl overflow-hidden border border-amber-500/20">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Parcelas</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-20"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {futureCharges.map((ch) => (
                    <TableRow key={ch.id} className="opacity-75">
                      <TableCell className="whitespace-nowrap">{new Date(ch.date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-medium">{ch.description}</TableCell>
                      <TableCell>{ch.installments}</TableCell>
                      <TableCell className="text-right font-bold text-amber-500">{formatCurrency(ch.value)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCharge(ch.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <Dialog open={chargeDialog} onOpenChange={setChargeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editingChargeId ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={chargeForm.date} onChange={(e) => setChargeForm({ ...chargeForm, date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Parcelas</Label><Input value={chargeForm.installments} onChange={(e) => setChargeForm({ ...chargeForm, installments: e.target.value })} maxLength={10} placeholder="1/3" /></div>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Input value={chargeForm.description} onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })} maxLength={100} /></div>
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" min={0} step={0.01} value={chargeForm.value || ""} onChange={(e) => setChargeForm({ ...chargeForm, value: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChargeDialog(false)}>Cancelar</Button>
              <Button onClick={saveCharge} disabled={!chargeForm.description.trim() || chargeForm.value <= 0}>{editingChargeId ? "Salvar" : "Adicionar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Cartões</h1><p className="text-muted-foreground text-sm">Gerencie seus cartões de crédito</p></div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Novo Cartão</Button>
      </div>

      <div className="flex items-center justify-center">
        <MonthNavigator />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-sm:gap-3">
        <div className="glass-card rounded-xl p-5 max-sm:py-5 max-sm:px-3"><p className="text-sm max-sm:text-xs text-muted-foreground">Limite Total</p><p className="text-xl max-sm:text-base font-bold">{formatCurrency(totalLimit)}</p></div>
        <div className="glass-card rounded-xl p-5 max-sm:py-5 max-sm:px-3"><p className="text-sm max-sm:text-xs text-muted-foreground">Usado ({monthNames[filterMonth]})</p><p className="text-xl max-sm:text-base font-bold text-destructive">{formatCurrency(totalUsed)}</p></div>
        <div className="glass-card rounded-xl p-5 max-sm:py-5 max-sm:px-3"><p className="text-sm max-sm:text-xs text-muted-foreground">Comprometido (futuro)</p><p className="text-xl max-sm:text-base font-bold text-amber-500">{formatCurrency(totalFuture)}</p></div>
        <div className="glass-card rounded-xl p-5 max-sm:py-5 max-sm:px-3"><p className="text-sm max-sm:text-xs text-muted-foreground">Disponível real</p><p className="text-xl max-sm:text-base font-bold text-primary">{formatCurrency(totalLimit - totalCommittedAll)}</p></div>
      </div>

      {totalLimit > 0 && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2"><span className="text-muted-foreground">Uso geral ({monthNames[filterMonth]})</span><span className="font-medium">{Math.round((totalUsed / totalLimit) * 100)}%</span></div>
          <Progress value={(totalUsed / totalLimit) * 100} className="h-2" />
        </div>
      )}

      {cards.length === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center">
          <CreditCard className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">Nenhum cartão cadastrado</h3>
          <p className="text-sm text-muted-foreground mt-1">Adicione seus cartões para controlar faturas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((c) => {
            const used = c.charges.reduce((a, ch) => a + ch.value, 0);
            const future = (futureChargesMap.get(c.id) || []).reduce((a, ch) => a + ch.value, 0);
            const totalCommitted = used + future;
            const pct = c.card_limit > 0 ? (totalCommitted / c.card_limit) * 100 : 0;
            const available = c.card_limit - totalCommitted;
            return (
              <div key={c.id} className="glass-card rounded-xl p-5 space-y-4 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setSelectedCard(c.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {c.image_url ? (<img src={c.image_url} alt={c.name} className="w-9 h-9 rounded-lg object-contain" />) : (<div className="p-2 rounded-lg bg-primary/10"><CreditCard className="w-5 h-5 text-primary" /></div>)}
                    <div><span className="font-semibold">{c.name}</span><p className="text-xs text-muted-foreground">Fech. {c.closing_day} · Venc. {c.due_day}</p></div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCard(c.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{formatCurrency(used)} usado{future > 0 ? ` + ${formatCurrency(future)} futuro` : ""}</span>
                    <span>{formatCurrency(c.card_limit)}</span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className="h-1.5" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Disponível: <span className={`font-semibold ${available < 0 ? "text-destructive" : "text-foreground"}`}>{formatCurrency(available)}</span></span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Editar Cartão" : "Novo Cartão"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Logo do Banco</Label>
              <div className="flex items-center gap-3">
                {form.image_url ? (<img src={form.image_url} alt="Logo" className="w-12 h-12 rounded-lg object-contain border border-border" />) : (<div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center"><ImagePlus className="w-5 h-5 text-muted-foreground" /></div>)}
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>{form.image_url ? "Trocar Imagem" : "Enviar Imagem"}</Button>
                  {form.image_url && (<Button type="button" variant="ghost" size="sm" className="text-destructive ml-1" onClick={() => setForm({ ...form, image_url: null })}>Remover</Button>)}
                </div>
              </div>
            </div>
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={50} placeholder="Ex: Nubank" /></div>
            <div className="space-y-2"><Label>Limite (R$)</Label><Input type="number" min={0} step={0.01} value={form.card_limit || ""} onChange={(e) => setForm({ ...form, card_limit: parseFloat(e.target.value) || 0 })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Dia de Fechamento</Label><Input type="number" min={1} max={31} value={form.closing_day} onChange={(e) => setForm({ ...form, closing_day: parseInt(e.target.value) || 1 })} /></div>
              <div className="space-y-2"><Label>Dia de Vencimento</Label><Input type="number" min={1} max={31} value={form.due_day} onChange={(e) => setForm({ ...form, due_day: parseInt(e.target.value) || 10 })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || form.card_limit <= 0}>{editingId ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cartoes;
