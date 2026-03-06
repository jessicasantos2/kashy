import { useRef, useState } from "react";
import { BarChart3, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/data/financialData";
import { useDashboardData } from "@/hooks/useDashboardData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { createWorkbook, addJsonSheet, downloadWorkbook } from "@/lib/excel";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899",
  "#10b981", "#f97316", "#6366f1", "#14b8a6",
  "#e11d48", "#84cc16", "#0ea5e9", "#a855f7",
  "#ef4444", "#22c55e",
];

const Relatorios = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const {
    loading,
    monthlyTotals,
    categoryTotals,
    cardTotals,
    personTotals,
    availableYears,
  } = useDashboardData(selectedYear);

  const yearsToShow = availableYears.length > 0 ? availableYears : [new Date().getFullYear()];

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`relatorio-${selectedYear}.pdf`);
      toast({ title: "PDF exportado com sucesso" });
    } catch {
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const wb = await createWorkbook();
      addJsonSheet(wb, "Gastos por Mês", monthlyTotals.map((m) => ({ Mês: m.month, Total: m.total })));
      addJsonSheet(wb, "Por Categoria", categoryTotals.map((c) => ({ Categoria: c.name, Total: c.total })));
      addJsonSheet(wb, "Por Cartão", cardTotals.map((c) => ({ Cartão: c.name, Total: c.total })));
      addJsonSheet(wb, "Por Pessoa", personTotals.map((p) => ({ Pessoa: p.name, Total: p.total })));
      await downloadWorkbook(wb, `relatorio-${selectedYear}.xlsx`);
      toast({ title: "Excel exportado com sucesso" });
    } catch {
      toast({ title: "Erro ao exportar Excel", variant: "destructive" });
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label || payload[0].name}</p>
          <p className="text-sm text-primary font-bold">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const renderPieChart = (data: { name: string; total: number }[], title: string) => (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-lg">{title}</h3>
      {data.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Sem dados para este ano</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground text-sm">Visualize relatórios e análises financeiras</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting}>
            <Download className="h-4 w-4 mr-1" />
            {exporting ? "Exportando..." : "PDF"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearsToShow.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        {/* Gastos por mês */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-lg">Gastos por Mês</h3>
          {monthlyTotals.some(m => m.total > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTotals}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Sem dados para este ano</p>
            </div>
          )}
        </div>

        {/* Gastos por categoria */}
        {renderPieChart(categoryTotals, "Gastos por Categoria")}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderPieChart(cardTotals, "Gastos por Cartão")}
          {renderPieChart(personTotals, "Gastos por Pessoa")}
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
