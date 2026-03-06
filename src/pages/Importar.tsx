import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/data/financialData";
import { toast } from "@/hooks/use-toast";
import { useTransactions } from "@/hooks/useTransactions";
import { readWorkbookFromBuffer, sheetToArray } from "@/lib/excel";

interface ImportedRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  valid: boolean;
}

function normalizeHeader(h: any): string {
  if (!h) return "";
  return String(h).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseLocalizedNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  let cleaned = String(value).trim().replace(/\s/g, "").replace(/[R$€$]/g, "");
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  if (lastDot === -1 && lastComma === -1) return parseFloat(cleaned) || null;
  if (lastDot > lastComma) cleaned = cleaned.replace(/,/g, "");
  else if (lastComma > lastDot) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDate(value: any): string | null {
  if (!value) return null;
  if (typeof value === "number" && value > 1 && value < 100000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (value instanceof Date) {
    const y = value.getFullYear();
    if (y > 1000) return `${y}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "string") {
    const t = value.trim();
    const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
    const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  return null;
}

const Importar = () => {
  const [rows, setRows] = useState<ImportedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addMany } = useTransactions();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const data = await file.arrayBuffer();
    const wb = await readWorkbookFromBuffer(data);
    const json: any[][] = sheetToArray(wb);

    if (json.length < 2) {
      toast({ title: "Planilha vazia", description: "A planilha não contém dados.", variant: "destructive" });
      return;
    }

    const headers = json[0].map(normalizeHeader);
    const dateIdx = headers.findIndex(h => h.includes("data") || h.includes("date"));
    const descIdx = headers.findIndex(h => h.includes("descri") || h.includes("description") || h.includes("nome"));
    const valIdx = headers.findIndex(h => h.includes("valor") || h.includes("value") || h.includes("amount"));

    if (dateIdx === -1 || descIdx === -1 || valIdx === -1) {
      toast({ title: "Colunas não encontradas", description: "A planilha deve ter colunas: Data, Descrição, Valor", variant: "destructive" });
      return;
    }

    const imported: ImportedRow[] = [];
    for (let i = 1; i < json.length; i++) {
      const row = json[i];
      if (!row || row.length === 0) continue;
      const date = parseDate(row[dateIdx]);
      const description = row[descIdx] ? String(row[descIdx]).trim() : "";
      const amount = parseLocalizedNumber(row[valIdx]);
      const valid = !!date && description.length > 0 && amount !== null && amount !== 0;
      imported.push({ id: crypto.randomUUID(), date: date || "", description, amount: amount || 0, valid });
    }

    setRows(imported);
    toast({ title: "Planilha carregada", description: `${imported.length} linhas encontradas, ${imported.filter(r => r.valid).length} válidas.` });
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  const confirmImport = async () => {
    const valid = rows.filter(r => r.valid);
    if (valid.length === 0) return;
    setImporting(true);
    const txs = valid.map(r => ({
      date: r.date,
      description: r.description,
      value: Math.abs(r.amount),
      type: r.amount >= 0 ? "receita" as const : "despesa" as const,
      category: "Outros",
      account: null,
      card: null,
      person: null,
    }));
    const success = await addMany(txs);
    setImporting(false);
    if (success) {
      toast({ title: "Importação concluída", description: `${valid.length} transações salvas no banco de dados.` });
      setRows([]);
      setFileName("");
    }
  };

  const validCount = rows.filter(r => r.valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Importar Planilha</h1><p className="text-muted-foreground text-sm">Importe transações a partir de um arquivo Excel</p></div>

      <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center cursor-pointer border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 transition-colors" onClick={() => fileRef.current?.click()}>
        <Upload className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold">Selecione um arquivo Excel</h3>
        <p className="text-sm text-muted-foreground mt-1">Formatos aceitos: .xlsx, .xls, .csv</p>
        <p className="text-xs text-muted-foreground mt-2">A planilha deve conter colunas: <strong>Data</strong>, <strong>Descrição</strong>, <strong>Valor</strong></p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <span className="font-medium">{fileName}</span>
              <Badge variant="secondary">{rows.length} linhas</Badge>
              <Badge className="bg-primary/10 text-primary border-0">{validCount} válidas</Badge>
              {invalidCount > 0 && <Badge variant="destructive">{invalidCount} inválidas</Badge>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setRows([]); setFileName(""); }}>Cancelar</Button>
              <Button onClick={confirmImport} disabled={validCount === 0 || importing} className="gap-2">
                <Check className="w-4 h-4" /> {importing ? "Importando..." : `Importar ${validCount} transações`}
              </Button>
            </div>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead className="w-12">Status</TableHead><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id} className={!r.valid ? "opacity-50" : ""}>
                    <TableCell>{r.valid ? <Check className="w-4 h-4 text-primary" /> : <X className="w-4 h-4 text-destructive" />}</TableCell>
                    <TableCell>{r.date ? new Date(r.date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell>{r.description || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{r.amount ? formatCurrency(r.amount) : "—"}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRow(r.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Instruções detalhadas */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          Como preparar sua planilha
        </h2>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">Formatos aceitos</p>
            <p>Arquivos <Badge variant="secondary">.xlsx</Badge> <Badge variant="secondary">.xls</Badge> <Badge variant="secondary">.csv</Badge></p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Colunas obrigatórias</p>
            <p>A planilha deve conter <strong>3 colunas</strong> com os seguintes cabeçalhos (ou variações):</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li><strong>Data</strong> — aceita também: <code className="text-xs bg-muted px-1 rounded">date</code>, <code className="text-xs bg-muted px-1 rounded">data</code></li>
              <li><strong>Descrição</strong> — aceita também: <code className="text-xs bg-muted px-1 rounded">description</code>, <code className="text-xs bg-muted px-1 rounded">nome</code>, <code className="text-xs bg-muted px-1 rounded">descricao</code></li>
              <li><strong>Valor</strong> — aceita também: <code className="text-xs bg-muted px-1 rounded">value</code>, <code className="text-xs bg-muted px-1 rounded">amount</code></li>
            </ul>
            <p className="mt-1 text-xs">O sistema detecta cabeçalhos automaticamente, ignorando acentos e diferenças de maiúsculas/minúsculas.</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Formatos de data aceitos</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><code className="text-xs bg-muted px-1 rounded">15/03/2025</code> (formato brasileiro)</li>
              <li><code className="text-xs bg-muted px-1 rounded">2025-03-15</code> (formato ISO)</li>
              <li>Datas seriais do Excel (número inteiro)</li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Formatos de valor aceitos</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><code className="text-xs bg-muted px-1 rounded">R$ 150,00</code> ou <code className="text-xs bg-muted px-1 rounded">1.200,00</code> (formato brasileiro)</li>
              <li><code className="text-xs bg-muted px-1 rounded">-250.50</code> (formato internacional)</li>
              <li>Valores <strong>positivos</strong> = Receita · Valores <strong>negativos</strong> = Despesa</li>
            </ul>
          </div>
        </div>

        {/* Exemplo visual */}
        <div>
          <p className="font-medium text-foreground mb-2 text-sm">Exemplo de planilha válida</p>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold">Data</TableHead>
                  <TableHead className="text-xs font-bold">Descrição</TableHead>
                  <TableHead className="text-xs font-bold text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-xs">15/03/2025</TableCell>
                  <TableCell className="text-xs">Supermercado Extra</TableCell>
                  <TableCell className="text-xs text-right text-destructive">-R$ 350,00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs">2025-03-10</TableCell>
                  <TableCell className="text-xs">Salário mensal</TableCell>
                  <TableCell className="text-xs text-right text-primary">R$ 5.000,00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs">01/03/2025</TableCell>
                  <TableCell className="text-xs">Aluguel</TableCell>
                  <TableCell className="text-xs text-right text-destructive">-1200,00</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Observação importante */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">⚠️ Observação importante</p>
          <p className="text-sm text-muted-foreground">
            Os campos <strong>'conta'</strong>, <strong>'cartão'</strong>, <strong>'pessoa'</strong> e <strong>'categoria'</strong> não são preenchidos automaticamente durante a importação. Todas as transações serão categorizadas como <strong>"Outros"</strong> e não terão vínculos. O usuário poderá editar essas informações individualmente na página de transações.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Importar;
