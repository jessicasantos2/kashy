import { useBudgets } from "@/hooks/useBudgets";
import { formatCurrency } from "@/data/financialData";
import { Target, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

function getBarColor(percent: number) {
  if (percent >= 100) return "bg-destructive";
  if (percent >= 80) return "bg-warning";
  return "bg-primary";
}

export function BudgetWidget() {
  const { budgets, loading } = useBudgets();
  const navigate = useNavigate();

  if (loading) return null;

  const alerts = budgets.filter((b) => b.percent >= 80);
  const top = budgets.slice(0, 5);

  if (top.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Orçamentos do Mês</h3>
            <p className="text-sm text-muted-foreground">
              {alerts.length > 0
                ? `${alerts.length} categoria(s) em alerta`
                : "Todos dentro do limite"}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/orcamentos")}
          className="text-xs text-primary hover:underline"
        >
          Ver todos
        </button>
      </div>

      <div className="space-y-3">
        {top.map((b) => (
          <div key={b.id}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium flex items-center gap-1.5">
                {b.percent >= 80 && (
                  <AlertTriangle
                    className={`w-3.5 h-3.5 ${
                      b.percent >= 100 ? "text-destructive" : "text-warning"
                    }`}
                  />
                )}
                {b.category}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatCurrency(b.spent)} / {formatCurrency(b.limit_amount)}
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(b.percent)}`}
                style={{ width: `${Math.min(100, b.percent)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
