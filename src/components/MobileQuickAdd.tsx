import { useState } from "react";
import { todayString } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowLeftRight, CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useSalaries } from "@/hooks/useSalaries";
import { usePeople } from "@/hooks/usePeople";
import { formatCurrency } from "@/data/financialData";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useCategories";

type TxType = "receita" | "despesa" | "transferencia";

const typeOptions: { value: TxType; label: string; icon: typeof TrendingUp; color: string }[] = [
  { value: "receita", label: "Receita", icon: TrendingUp, color: "bg-primary/10 text-primary border-primary/30" },
  { value: "despesa", label: "Despesa", icon: TrendingDown, color: "bg-destructive/10 text-destructive border-destructive/30" },
  { value: "transferencia", label: "Transferência", icon: ArrowLeftRight, color: "bg-accent text-accent-foreground border-border" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileQuickAdd({ open, onOpenChange }: Props) {
  const { add, addInstallments } = useTransactions();
  const { accounts, refetch: refetchAccounts } = useAccounts();
  const { cards } = useCreditCards();
  const { salaries } = useSalaries();
  const { people } = usePeople();
  const { allCategoryNames } = useCategories();
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState<"type" | "form">("type");
  const [txType, setTxType] = useState<TxType>("despesa");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Outros");
  const [date, setDate] = useState(todayString());
  const [account, setAccount] = useState<string | null>(null);
  const [card, setCard] = useState<string | null>(null);
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState(2);
  const [person, setPerson] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Transfer-specific state
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");

  const reset = () => {
    setStep("type");
    setTxType("despesa");
    setValue("");
    setDescription("");
    setCategory("Outros");
    setDate(todayString());
    setAccount(null);
    setCard(null);
    setPerson(null);
    setIsInstallment(false);
    setTotalInstallments(2);
    setTransferFrom("");
    setTransferTo("");
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const selectType = (type: TxType) => {
    setTxType(type);
    if (type === "receita") {
      setCategory("Salário");
      const currentYear = new Date().getFullYear();
      const salaryEntry = salaries.find(s => s.year === currentYear && s.account);
      if (salaryEntry?.account) setAccount(salaryEntry.account);
    } else {
      setCategory("Outros");
    }
    setStep("form");
  };

  const numValue = parseFloat(value) || 0;

  const handleSave = async () => {
    if (numValue <= 0 || !description.trim()) return;
    setSaving(true);
    try {
      const type = txType === "transferencia" ? "despesa" : txType;
      const txData = {
        date,
        description: description.trim(),
        category,
        account,
        card,
        person,
        type,
      };
      if (isInstallment && totalInstallments >= 2) {
        await addInstallments(txData, numValue, totalInstallments);
      } else {
        await add({ ...txData, value: numValue });
      }
      toast({ title: "Transação salva!" });
      handleClose(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async () => {
    if (!user || !transferFrom || !transferTo || transferFrom === transferTo || numValue <= 0) return;
    setSaving(true);
    try {
      const today = todayString();
      const groupId = crypto.randomUUID();
      const { error } = await supabase.from("transactions").insert([
        {
          user_id: user.id,
          date: today,
          description: `Transferência para ${transferTo}`,
          category: "Transferência",
          account: transferFrom,
          type: "despesa",
          value: numValue,
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
          value: numValue,
          paid: true,
          transaction_group_id: groupId,
        },
      ]);
      if (error) throw error;
      toast({ title: "Transferência realizada!" });
      await refetchAccounts();
      handleClose(false);
    } catch {
      toast({ title: "Erro ao transferir", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderTransferForm = () => (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Valor (R$)</Label>
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0,00"
          className="text-2xl h-14 font-bold text-center"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label>Conta de Origem</Label>
        <Select value={transferFrom} onValueChange={setTransferFrom}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {accounts.filter(a => a.name !== transferFrom).map((a) => (
              <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {numValue > 0 && transferFrom && transferTo && (
        <p className="text-sm text-muted-foreground text-center">
          {formatCurrency(numValue)} de <strong>{transferFrom}</strong> → <strong>{transferTo}</strong>
        </p>
      )}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={() => setStep("type")}>Voltar</Button>
        <Button
          className="flex-1"
          onClick={handleTransfer}
          disabled={saving || numValue <= 0 || !transferFrom || !transferTo || transferFrom === transferTo}
        >
          {saving ? "Transferindo..." : "Transferir"}
        </Button>
      </div>
    </div>
  );

  const renderExpenseIncomeForm = () => (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Valor (R$)</Label>
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0,00"
          className="text-2xl h-14 font-bold text-center"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Supermercado" maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {allCategoryNames.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Data</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-foreground" />
              {date ? format(parse(date, "yyyy-MM-dd", new Date()), "dd/MM/yyyy") : "Selecione uma data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[9999]" align="start">
            <Calendar
              mode="single"
              selected={date ? parse(date, "yyyy-MM-dd", new Date()) : undefined}
              onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))}
              locale={ptBR}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Conta</Label>
          <Select value={account || "none"} onValueChange={(v) => setAccount(v === "none" ? null : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {accounts.map((a) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Cartão</Label>
          <Select value={card || "none"} onValueChange={(v) => setCard(v === "none" ? null : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {cards.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Pessoa</Label>
        <Select value={person || "none"} onValueChange={(v) => setPerson(v === "none" ? null : v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {people.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <Label className="text-sm font-medium">Parcelado</Label>
          <p className="text-xs text-muted-foreground">Dividir em parcelas mensais</p>
        </div>
        <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
      </div>
      {isInstallment && (
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="space-y-2">
            <Label>Nº de Parcelas</Label>
            <Input type="number" min={2} max={48} value={totalInstallments} onChange={(e) => setTotalInstallments(Math.max(2, parseInt(e.target.value) || 2))} />
          </div>
          <div className="space-y-2">
            <Label>Valor/Parcela</Label>
            <p className="text-lg font-bold mt-1">{formatCurrency(numValue > 0 ? Math.round((numValue / totalInstallments) * 100) / 100 : 0)}</p>
          </div>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={() => setStep("type")}>Voltar</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || numValue <= 0 || !description.trim()}>
          {saving ? "Salvando..." : isInstallment ? `Criar ${totalInstallments}x` : "Salvar"}
        </Button>
      </div>
    </div>
  );

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>{step === "type" ? "Nova transação" : txType === "transferencia" ? "Transferência entre Contas" : txType === "receita" ? "Nova Receita" : "Nova Despesa"}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          {step === "type" ? (
            <div className="grid grid-cols-3 gap-3 py-4">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => selectType(opt.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all active:scale-95 ${opt.color}`}
                >
                  <opt.icon className="h-7 w-7" />
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          ) : txType === "transferencia" ? renderTransferForm() : renderExpenseIncomeForm()}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
