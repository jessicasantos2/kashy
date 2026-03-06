import { useState } from "react";
import { formatCurrency } from "@/data/financialData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { CategoryBadge } from "@/components/CategoryBadge";
import { useCategories } from "@/hooks/useCategories";
import type { DashTransaction } from "@/hooks/useDashboardData";

interface ExpenseTableProps {
  transactions: DashTransaction[];
  salary: number;
}

export function ExpenseTable({ transactions, salary }: ExpenseTableProps) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { getCategoryMeta } = useCategories();

  const filtered = transactions
    .filter(tx => tx.description.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 20);

  return (
    <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-up" style={{ animationDelay: "400ms" }}>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-base md:text-lg font-semibold">Últimas Transações</h3>
          <p className="text-sm text-muted-foreground">Transações recentes registradas</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {!isMobile && (
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transação..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-secondary/50 border-border/50"
              />
            </div>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/transacoes")}>
            Ver todas <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transação encontrada.</p>
      ) : isMobile ? (
        /* Mobile: card list */
        <div className="space-y-2">
          {filtered.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium truncate">
                  {tx.description}
                  {tx.total_installments && tx.total_installments > 1 && (
                    <span className="ml-1 text-[10px] text-muted-foreground">({tx.installment_number}/{tx.total_installments})</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {new Date(tx.date + "T00:00:00").toLocaleDateString("pt-BR")} • <CategoryBadge name={tx.category} {...getCategoryMeta(tx.category)} size="sm" />
                </p>
              </div>
              <span className={`text-sm font-bold whitespace-nowrap ${tx.type === "despesa" ? "text-destructive" : "text-primary"}`}>
                {tx.type === "despesa" ? "-" : "+"}{formatCurrency(tx.value)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: table */
        <div className="overflow-auto max-h-[400px] rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Data</TableHead>
                <TableHead className="font-semibold">Descrição</TableHead>
                <TableHead className="font-semibold">Categoria</TableHead>
                <TableHead className="font-semibold">Cartão/Conta</TableHead>
                <TableHead className="text-right font-semibold">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => (
                <TableRow key={tx.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm">
                    {new Date(tx.date + "T00:00:00").toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {tx.description}
                    {tx.total_installments && tx.total_installments > 1 && (
                      <span className="ml-1.5 text-xs text-muted-foreground">({tx.installment_number}/{tx.total_installments})</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <CategoryBadge name={tx.category} {...getCategoryMeta(tx.category)} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tx.card || tx.account || "—"}</TableCell>
                  <TableCell className={`text-sm text-right font-semibold ${tx.type === "despesa" ? "text-destructive" : "text-primary"}`}>
                    {tx.type === "despesa" ? "-" : "+"}{formatCurrency(tx.value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
