import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { YearData, getCategoryTotals, formatCurrency } from "@/data/financialData";

const COLORS = [
  "hsl(160 84% 39%)",
  "hsl(200 80% 50%)",
  "hsl(38 92% 50%)",
  "hsl(280 60% 55%)",
  "hsl(0 72% 51%)",
  "hsl(160 40% 60%)",
  "hsl(220 60% 50%)",
  "hsl(30 80% 55%)",
  "hsl(340 60% 50%)",
  "hsl(180 50% 45%)",
];

interface CategoryChartProps {
  data: YearData;
}

export function CategoryChart({ data }: CategoryChartProps) {
  const categories = getCategoryTotals(data).slice(0, 10);

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
      <h3 className="text-lg font-semibold mb-1">Top Categorias</h3>
      <p className="text-sm text-muted-foreground mb-4">Maiores despesas do ano</p>
      <div className="flex items-center gap-4">
        <div className="w-44 h-44 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categories} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="total">
                {categories.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2 overflow-auto max-h-44">
          {categories.map((cat, i) => (
            <div key={cat.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground truncate max-w-[140px]">{cat.name}</span>
              </div>
              <span className="font-medium text-foreground">{formatCurrency(cat.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
