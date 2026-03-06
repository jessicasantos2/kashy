import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/data/financialData";

interface MonthlyChartProps {
  data: { month: string; total: number }[];
  salary: number;
  className?: string;
}

export function MonthlyChart({ data, salary, className }: MonthlyChartProps) {
  return (
    <div className={`glass-card rounded-xl p-6 animate-fade-up flex flex-col ${className ?? ""}`} style={{ animationDelay: "200ms" }}>
      <h3 className="text-lg font-semibold mb-1">Despesas Mensais</h3>
      <p className="text-sm text-muted-foreground mb-6">Comparativo mensal de gastos vs salário</p>
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "13px",
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar dataKey="total" name="Total Gastos" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.total > salary ? "hsl(0 72% 51%)" : "hsl(160 84% 39%)"} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-muted-foreground">Dentro do orçamento</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Acima do orçamento</span>
        </div>
        {salary > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-muted-foreground">Salário: <span className="text-foreground font-medium">{formatCurrency(salary)}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
