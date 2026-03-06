import { TrendingDown, TrendingUp, DollarSign, CreditCard, Wallet, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/data/financialData";

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: "expense" | "salary" | "available" | "average";
  trend?: "up" | "down";
  delay?: number;
}

const iconMap = {
  expense: CreditCard,
  salary: DollarSign,
  available: Wallet,
  average: BarChart3,
};

export function MetricCard({ title, value, subtitle, icon, trend, delay = 0 }: MetricCardProps) {
  const Icon = iconMap[icon];
  const isNegative = value < 0;

  return (
    <div
      className="glass-card rounded-xl p-6 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trend === "up" ? "text-destructive" : "text-primary"}`}>
            {trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className={`text-2xl font-bold tracking-tight ${isNegative ? "text-destructive" : "text-foreground"}`}>
        {formatCurrency(value)}
      </p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
