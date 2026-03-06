import { useState, useMemo } from "react";
import { useBudgets } from "@/hooks/useBudgets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/data/financialData";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Target, AlertTriangle } from "lucide-react";

import { CATEGORIES } from "@/data/categories";

function getProgressColor(percent: number) {
  if (percent >= 100) return "bg-destructive";
  if (percent >= 80) return "bg-warning";
  return "bg-primary";
}

function getStatusText(percent: number) {
  if (percent >= 100) return "Limite excedido!";
  if (percent >= 80) return "Atenção: próximo do limite";
  return `${Math.round(percent)}% utilizado`;
}

function getProgressBarColor(percent: number): string {
  if (percent >= 100) return "hsl(var(--destructive))";
  if (percent >= 80) return "hsl(38 92% 50%)";
  return "hsl(var(--primary))";
}

const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const Orcamentos = () => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonthNum, setSelectedMonthNum] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const selectedMonth = `${selectedYear}-${selectedMonthNum}`;

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => String(cur - 2 + i));
  }, []);
  const { budgets, loading, upsert, remove } = useBudgets(selectedMonth);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [limitAmount, setLimitAmount] = useState("");

  const handleSave = async () => {
    const val = parseFloat(limitAmount);
    if (!val || val <= 0) return;
    await upsert(category, val);
    setDialogOpen(false);
    setLimitAmount("");
  };

  const usedCategories = new Set(budgets.map((b) => b.category));
  const availableCategories = CATEGORIES.filter((c) => !usedCategories.has(c));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">
            Defina limites mensais por categoria
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
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
          <Button
            onClick={() => {
              if (availableCategories.length > 0) {
                setCategory(availableCategories[0]);
                setDialogOpen(true);
              }
            }}
            disabled={availableCategories.length === 0}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" /> Novo
          </Button>
        </div>
      </div>

      {budgets.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhum orçamento definido para este mês.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {budgets.map((b) => (
            <div
              key={b.id}
              className={`glass-card rounded-xl p-4 md:p-5 animate-fade-up ${
                b.percent >= 100 ? "ring-1 ring-destructive/30" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-base">{b.category}</h3>
                  <p className="text-xs text-muted-foreground">
                    Limite: {formatCurrency(b.limit_amount)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(b.id)}
                  className="text-destructive hover:bg-destructive/10 h-8 w-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">
                    {formatCurrency(b.spent)} / {formatCurrency(b.limit_amount)}
                  </span>
                  <span
                    className={`font-medium flex items-center gap-1 ${
                      b.percent >= 100
                        ? "text-destructive"
                        : b.percent >= 80
                        ? "text-warning"
                        : "text-primary"
                    }`}
                  >
                    {b.percent >= 80 && <AlertTriangle className="w-3.5 h-3.5" />}
                    {getStatusText(b.percent)}
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all ${getProgressColor(b.percent)}`}
                    style={{ width: `${Math.min(100, b.percent)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Categoria</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Limite Mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orcamentos;
