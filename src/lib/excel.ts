import ExcelJS from "exceljs";

export async function createWorkbook(): Promise<ExcelJS.Workbook> {
  return new ExcelJS.Workbook();
}

export function addJsonSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  data: Record<string, unknown>[]
) {
  if (data.length === 0) return;
  const ws = wb.addWorksheet(sheetName);
  const columns = Object.keys(data[0]);
  ws.columns = columns.map((key) => ({ header: key, key, width: 20 }));
  // Bold header row
  ws.getRow(1).font = { bold: true };
  data.forEach((row) => ws.addRow(row));
}

export async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readWorkbookFromBuffer(data: ArrayBuffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  return wb;
}

export function sheetToArray(wb: ExcelJS.Workbook): any[][] {
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const result: any[][] = [];
  ws.eachRow((row) => {
    const values = (row.values as any[]).slice(1); // ExcelJS rows are 1-indexed
    result.push(values);
  });
  return result;
}
