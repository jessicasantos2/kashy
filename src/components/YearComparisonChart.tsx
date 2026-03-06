import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/data/financialData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { filterDisplayYears } from "@/lib/utils";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const LINE_COLORS = ["hsl(280 80% 60%)", "hsl(160 84% 39%)", "hsl(200 80% 50%)"];

export function YearComparisonChart() {
  const { user } = useAuth();
  const [allTx, setAllTx] = useState<{ date: string; value: number; type: string }[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("transactions")
      .select("date, value, type")
      .eq("type", "despesa")
      .order("date", { ascending: true })
      .limit(5000)
      .then(({ data }) => setAllTx(data ?? []));
  }, [user]);

  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    allTx.forEach(tx => {
      const y = parseInt(tx.date.split("-")[0]);
      if (!isNaN(y)) yearSet.add(y);
    });
    return filterDisplayYears(Array.from(yearSet)).sort((a, b) => b - a);
  }, [allTx]);

  // Auto-select top 3 years on first load
  useEffect(() => {
    if (availableYears.length > 0 && selectedYears.length === 0) {
      setSelectedYears(availableYears.slice(0, 3));
    }
  }, [availableYears]);

  const toggleYear = (year: number) => {
    setSelectedYears(prev => {
      if (prev.includes(year)) {
        return prev.filter(y => y !== year);
      }
      if (prev.length >= 3) return prev;
      return [...prev, year].sort((a, b) => b - a);
    });
  };

  const displayYears = useMemo(() => selectedYears.sort((a, b) => b - a), [selectedYears]);

  const chartData = useMemo(() => {
    return MONTHS.map((month, i) => {
      const entry: Record<string, string | number | null> = { month };
      displayYears.forEach(year => {
        const prefix = `${year}-${String(i + 1).padStart(2, "0")}`;
        const total = allTx
          .filter(tx => tx.date.startsWith(prefix))
          .reduce((acc, t) => acc + t.value, 0);
        entry[`${year}`] = total || null;
      });
      return entry;
    });
  }, [allTx, displayYears]);

  const hasData = allTx.length > 0;

  if (!hasData) {
    return (
      <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "350ms" }}>
        <h3 className="text-lg font-semibold mb-1">Comparativo Anual</h3>
        <p className="text-sm text-muted-foreground">Adicione transações para ver o comparativo entre anos.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "350ms" }}>
      <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
        <div>
          <h3 className="text-lg font-semibold">Comparativo Anual</h3>
          <p className="text-sm text-muted-foreground">Evolução dos gastos por ano (selecione até 3)</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {availableYears.map(year => {
          const isSelected = selectedYears.includes(year);
          return (
            <Badge
              key={year}
              variant={isSelected ? "default" : "outline"}
              className={`cursor-pointer select-none transition-colors ${
                isSelected ? "" : "opacity-60 hover:opacity-100"
              } ${!isSelected && selectedYears.length >= 3 ? "opacity-30 cursor-not-allowed" : ""}`}
              onClick={() => {
                if (!isSelected && selectedYears.length >= 3) return;
                toggleYear(year);
              }}
            >
              {year}
            </Badge>
          );
        })}
      </div>
      {displayYears.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Selecione pelo menos um ano para visualizar.</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "13px", color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
              <Legend />
              {displayYears.map((year, i) => (
                <Line key={year} type="monotone" dataKey={`${year}`} stroke={LINE_COLORS[i]} strokeWidth={i === 0 ? 2.5 : 2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
