import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/data/financialData";
import { parseLocalDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Person, PersonTxType } from "@/hooks/usePeople";
import { createWorkbook, addJsonSheet, downloadWorkbook } from "@/lib/excel";

const txTypeLabels: Record<PersonTxType, string> = {
  pagamento: "Pagamento",
  divida_minha: "Dívida Minha",
  divida_pessoa: "Dívida da Pessoa",
};

interface Props {
  person: Person;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function PersonReportExport({ person, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [period, setPeriod] = useState("total");
  const [exporting, setExporting] = useState(false);

  const periods = (() => {
    const set = new Set<string>();
    person.transactions.forEach((t) => set.add(t.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  })();

  const filtered =
    period === "total"
      ? person.transactions
      : person.transactions.filter((t) => t.date.startsWith(period));

  // Categorize transactions
  const dividaPessoa = filtered.filter((t) => t.type === "divida_pessoa");
  const dividaMinha = filtered.filter((t) => t.type === "divida_minha");
  const pagamentos = filtered.filter((t) => t.type === "pagamento");

  const totalDividaPessoa = dividaPessoa.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalDividaMinha = dividaMinha.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalPagamentos = pagamentos.reduce((s, t) => s + Math.abs(t.amount), 0);

  // Pending = divida_pessoa + divida_minha that haven't been offset by pagamentos
  const balance = filtered.reduce((s, t) => s + t.amount, 0);

  const periodLabel = period === "total" ? "Total (todos os meses)" : (() => {
    const [y, m] = period.split("-");
    return `${monthNames[parseInt(m) - 1]} ${y}`;
  })();

  const handleExportExcel = async () => {
    try {
      const wb = await createWorkbook();

      // Sheet 1: All transactions
      const rows = filtered.map((t) => ({
        Data: parseLocalDate(t.date).toLocaleDateString("pt-BR"),
        Tipo: txTypeLabels[t.type] || "Dívida da Pessoa",
        Descrição: t.description,
        Valor: Math.abs(t.amount),
      }));
      addJsonSheet(wb, "Transações", rows);

      // Sheet 2: Dívida da Pessoa (me deve)
      if (dividaPessoa.length > 0) {
        const dpRows = dividaPessoa.map((t) => ({
          Data: parseLocalDate(t.date).toLocaleDateString("pt-BR"),
          Descrição: t.description,
          Valor: Math.abs(t.amount),
        }));
        dpRows.push({ Data: "", Descrição: "TOTAL", Valor: totalDividaPessoa });
        addJsonSheet(wb, "Me Deve", dpRows);
      }

      // Sheet 3: Dívida Minha (eu devo)
      if (dividaMinha.length > 0) {
        const dmRows = dividaMinha.map((t) => ({
          Data: parseLocalDate(t.date).toLocaleDateString("pt-BR"),
          Descrição: t.description,
          Valor: Math.abs(t.amount),
        }));
        dmRows.push({ Data: "", Descrição: "TOTAL", Valor: totalDividaMinha });
        addJsonSheet(wb, "Eu Devo", dmRows);
      }

      // Sheet 4: Pagamentos
      if (pagamentos.length > 0) {
        const pgRows = pagamentos.map((t) => ({
          Data: parseLocalDate(t.date).toLocaleDateString("pt-BR"),
          Descrição: t.description,
          Valor: Math.abs(t.amount),
        }));
        pgRows.push({ Data: "", Descrição: "TOTAL", Valor: totalPagamentos });
        addJsonSheet(wb, "Pagamentos", pgRows);
      }

      // Sheet 5: Resumo
      const resumo = [
        { Categoria: "Dívida da Pessoa (me deve)", Valor: totalDividaPessoa },
        { Categoria: "Dívida Minha (eu devo)", Valor: totalDividaMinha },
        { Categoria: "Pagamentos realizados", Valor: totalPagamentos },
        { Categoria: "", Valor: 0 as number },
        { Categoria: `Saldo final ${balance >= 0 ? "(a receber)" : "(a pagar)"}`, Valor: Math.abs(balance) },
      ];
      addJsonSheet(wb, "Resumo", resumo);

      await downloadWorkbook(wb, `relatorio-${person.name.toLowerCase().replace(/\s+/g, "-")}-${period}.xlsx`);
      toast({ title: "Excel exportado com sucesso" });
    } catch {
      toast({ title: "Erro ao exportar Excel", variant: "destructive" });
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");
      const margin = 15;
      let y = margin;

      pdf.setFontSize(18);
      pdf.text(`Relatório - ${person.name}`, margin, y);
      y += 8;
      pdf.setFontSize(11);
      pdf.text(`Período: ${periodLabel}`, margin, y);
      y += 10;

      // Summary box
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("RESUMO", margin, y); y += 6;
      pdf.setFont("helvetica", "normal");
      pdf.text(`Dívida da Pessoa (me deve): ${formatCurrency(totalDividaPessoa)}`, margin, y); y += 5;
      pdf.text(`Dívida Minha (eu devo): ${formatCurrency(totalDividaMinha)}`, margin, y); y += 5;
      pdf.text(`Pagamentos realizados: ${formatCurrency(totalPagamentos)}`, margin, y); y += 5;
      pdf.setFont("helvetica", "bold");
      pdf.text(`Saldo final: ${formatCurrency(Math.abs(balance))} ${balance >= 0 ? "(a receber)" : "(a pagar)"}`, margin, y);
      pdf.setFont("helvetica", "normal");
      y += 10;

      const printSection = (title: string, txs: typeof filtered) => {
        if (txs.length === 0) return;
        if (y > 260) { pdf.addPage(); y = margin; }
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, margin, y); y += 2;
        pdf.line(margin, y, 195, y); y += 5;

        const cols = [margin, 50, 140];
        pdf.setFontSize(9);
        pdf.text("Data", cols[0], y);
        pdf.text("Descrição", cols[1], y);
        pdf.text("Valor", cols[2], y);
        y += 5;

        pdf.setFont("helvetica", "normal");
        for (const t of txs) {
          if (y > 275) { pdf.addPage(); y = margin; }
          pdf.text(parseLocalDate(t.date).toLocaleDateString("pt-BR"), cols[0], y);
          pdf.text(t.description.slice(0, 50), cols[1], y);
          pdf.text(formatCurrency(Math.abs(t.amount)), cols[2], y);
          y += 5;
        }
        const total = txs.reduce((s, t) => s + Math.abs(t.amount), 0);
        pdf.setFont("helvetica", "bold");
        pdf.text(`Total: ${formatCurrency(total)}`, cols[2] - 15, y);
        pdf.setFont("helvetica", "normal");
        y += 8;
      };

      printSection("DÍVIDA DA PESSOA (ME DEVE)", dividaPessoa);
      printSection("DÍVIDA MINHA (EU DEVO)", dividaMinha);
      printSection("PAGAMENTOS REALIZADOS", pagamentos);

      pdf.save(`relatorio-${person.name.toLowerCase().replace(/\s+/g, "-")}-${period}.pdf`);
      toast({ title: "PDF exportado com sucesso" });
    } catch {
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Relatório — {person.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Total (todos os meses)</SelectItem>
                {periods.map((p) => {
                  const [y, m] = p.split("-");
                  return (
                    <SelectItem key={p} value={p}>
                      {monthNames[parseInt(m) - 1]} {y}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="glass-card rounded-xl p-4 space-y-2 text-sm">
            <p className="font-semibold text-foreground">Resumo do Relatório</p>
            <div className="space-y-1">
              <p className="text-primary">Dívida da Pessoa (me deve): <strong>{formatCurrency(totalDividaPessoa)}</strong></p>
              <p className="text-destructive">Dívida Minha (eu devo): <strong>{formatCurrency(totalDividaMinha)}</strong></p>
              <p className="text-accent-foreground">Pagamentos realizados: <strong>{formatCurrency(totalPagamentos)}</strong></p>
            </div>
            <div className="border-t border-border pt-2 mt-2">
              <p className="font-semibold">
                Saldo: <strong>{formatCurrency(Math.abs(balance))}</strong>{" "}
                <span className={balance >= 0 ? "text-primary" : "text-destructive"}>
                  {balance >= 0 ? "(a receber)" : "(a pagar)"}
                </span>
              </p>
            </div>
            <p className="text-muted-foreground text-xs">Transações: {filtered.length}</p>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button onClick={handleExportPDF} disabled={exporting} className="gap-2">
            <Download className="h-4 w-4" /> {exporting ? "Exportando..." : "PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
