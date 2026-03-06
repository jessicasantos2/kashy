export interface Expense {
  day: number;
  description: string;
  values: (number | null)[];
}

export interface YearData {
  year: number;
  months: string[];
  expenses: Expense[];
  totals: (number | null)[];
  salary: number;
  available: (number | null)[];
}

const MONTHS_12 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const data2025: YearData = {
  year: 2025,
  months: MONTHS_12,
  expenses: [
    { day: 1, description: "Passagem", values: [300, 300, 60, null, null, null, null, null, null, null, null, null] },
    { day: 5, description: "Fies", values: [null, null, null, null, null, null, null, null, null, null, null, null] },
    { day: 8, description: "Aluguel", values: [237.46, 263.13, 164.29, 101.94, 144.50, 0, 291.50, 291.50, 291.50, 327.51, 327.51, 291.50] },
    { day: 8, description: "Itaú/Cheq. especial", values: [13.61, 35.76, 234.56, 234.56, 234.56, 234.56, 234.56, 234.56, null, null, null, null] },
    { day: 9, description: "Gustavo Renegociação", values: [870, 870, null, null, null, null, null, null, null, null, null, null] },
    { day: 9, description: "Mentoria Individual", values: [652.34, 652.34, 652.34, 652.34, 652.34, 652.34, 652.34, 652.34, 652.34, 652.34, 652.34, 652.34] },
    { day: 17, description: "Renner", values: [null, 718, null, null, null, null, null, 44.96, 44.96, 44.96, 44.98, null] },
    { day: 11, description: "Reneg./Protesto", values: [155.57, 155.57, 155.57, 155.57, 155.57, null, null, null, null, null, null, null] },
    { day: 12, description: "Fatura Tim", values: [53.99, 59.99, 76.85, 76.99, 76.99, 85.50, 234.99, 34.99, 41.19, 34.99, 34.99, 34.99] },
    { day: 12, description: "Fatura Tim Pai", values: [68.99, 74.99, 74.99, 74.99, 74.99, 74.99, 74.99, 74.99, 74.99, 74.99, 74.99, 74.99] },
    { day: 14, description: "BW Patrícia", values: [718, 718, 718, 765, 718, null, null, null, null, null, null, null] },
    { day: 15, description: "Cartão Inter", values: [62.64, 39.69, 151.14, 124.23, 29.83, null, null, 39.44, 23.80, 56.63, 75.80, 53.16] },
    { day: 15, description: "Cartão Pan", values: [null, 23.87, 23.87, 23.87, 15, 23.87, 23.87, 23.87, 23.87, 56.13, 56.13, 56.13] },
    { day: 15, description: "Cartão Itaú", values: [null, 41.44, 144.69, 225.70, 620.55, 738.60, 669.02, 491.67, 1061.10, 150.44, 85.97, 143.07] },
    { day: 20, description: "Academia", values: [135.78, 135.78, null, null, null, null, null, null, null, null, null, null] },
    { day: 20, description: "Cartão PagBank", values: [394.97, 191.81, null, null, null, 1050.06, 371.54, 414.16, 526.90, 511.33, 394.37, 317.15] },
    { day: 20, description: "Cartão Will", values: [42.20, 63.57, 113.16, 223.46, 59.27, 468.09, 264.73, 89.67, 34.58, 9.68, 204.53, 60.43] },
    { day: 26, description: "Mentoria Individual Low Ticket", values: [276, 276, null, null, null, null, null, null, 537, 537, 537, 537] },
    { day: 21, description: "Cartão Neon", values: [98.79, 96.06, 193.16, 117.90, 33.33, 253.53, 70.29, 14.69, 168.48, 62.86, 75.10, 230.17] },
    { day: 0, description: "Plataformas recorrência", values: [null, 235.79, null, null, null, null, null, null, null, null, null, null] },
  ],
  totals: [4080.34, 4951.79, 2762.62, 2776.55, 2814.93, 3581.54, 2887.83, 2406.84, 3480.71, 2518.86, 2563.71, 2450.93],
  salary: 2300,
  available: [-1780.34, -2651.79, -462.62, -752.76, -791.14, -1557.75, -864.04, -383.05, -1456.92, -495.07, -539.92, -427.14],
};

export const data2024: YearData = {
  year: 2024,
  months: MONTHS_12,
  expenses: [
    { day: 1, description: "Passagem", values: [161.60, 202, 202, 101, 35, 101, 181.80, 171.70, 181.80, 191.90, 202, 181.80] },
    { day: 5, description: "Fies", values: [153, null, 153, null, null, 153, null, null, 153, null, null, 153] },
    { day: 15, description: "Acordo ITAÚ", values: [null, 147.84, 147.80, 147.88, 147.88, 147.88, 147.88, null, null, null, null, null] },
    { day: 10, description: "Aluguel", values: [309, 309, 287, 287.67, 287, 282.67, 282.67, 282.67, 282.67, 282.67, 282.67, 282.67] },
    { day: 20, description: "Academia", values: [130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 135.78] },
    { day: 12, description: "Fatura Tim", values: [48.99, 50.29, 48.99, 48.99, 53.99, 53.99, 55.11, 53.99, 53.99, 53.99, 53.99, 53.99] },
    { day: 12, description: "Fatura Tim Pai", values: [64, 64, 63.99, 63.99, 68.99, 68.99, 68.99, 68.99, 68.99, 68.99, 68.99, 68.99] },
    { day: 20, description: "Cartão PagBank", values: [539.22, 497.78, 461.85, 426.10, 754.86, 1098.38, 1374.18, 697.33, 1224.07, 488.14, 552.03, 852.93] },
    { day: 21, description: "Neon", values: [236.61, 208.61, 139.37, 109.01, 107.34, 144.34, 167.73, 126.34, 92.89, 83.38, 73.89, 179.14] },
    { day: 20, description: "Banco Will", values: [null, null, null, null, null, null, null, null, null, null, 77.18, 402.80] },
    { day: 2, description: "Banco Inter", values: [null, null, null, null, null, null, null, null, null, null, 50.98, null] },
    { day: 20, description: "Poupança AP J&G", values: [350, 350, 350, 350, 350, 350, 350, 350, null, null, null, null] },
    { day: 18, description: "Renner", values: [143.32, 170.70, 182.87, 198.97, 198.97, 54.36, 54.36, 32.38, null, null, null, null] },
    { day: 8, description: "Itaú/Cheque especial", values: [121.69, 84.94, 47.65, 28.56, null, 84.47, null, 101.86, null, null, 16.27, null] },
    { day: 0, description: "Renegociação/Protesto", values: [null, null, null, null, null, null, null, null, 201.29, 155.57, 155.57, 155.57] },
    { day: 0, description: "Gastos avulsos", values: [130, null, null, null, null, null, null, 19, null, 362, 256.40, null] },
    { day: 0, description: "Jéssica", values: [null, null, null, null, null, null, null, 181, null, null, null, 870] },
    { day: 0, description: "OAB/Concurso", values: [null, 320, null, null, null, null, null, 85, null, null, null, null] },
  ],
  totals: [2387.43, 2535.16, 2214.52, 1863.61, 2134.03, 2669.08, 2812.72, 2300.26, 2388.70, 1816.64, 1919.97, 3336.67],
  salary: 2200,
  available: [-187.43, -335.16, -14.52, 336.39, 65.97, -469.08, -612.72, -100.26, -188.70, 383.36, 280.03, -1136.67],
};

export const data2026: YearData = {
  year: 2026,
  months: MONTHS_12,
  expenses: [
    { day: 1, description: "Fies", values: [null, null, null, null, null, null, null, null, null, null, null, null] },
    { day: 5, description: "Aluguel", values: [291.50, 291.50, 291.50, 291.50, 327.51, 327.51, 327.51, 327.51, 327.51, 327.51, 327.51, 327.51] },
    { day: 12, description: "Fatura Tim", values: [35.71, 40.99, 40.99, 40.99, 40.99, 40.99, 40.99, 40.99, 40.99, 40.99, 40.99, 40.99] },
    { day: 12, description: "Fatura Tim Pai", values: [74.99, 80.99, 74.99, 74.99, 74.99, 74.99, 74.99, 74.99, 74.99, 74.99, 74.99, 74.99] },
    { day: 15, description: "Cartão Inter", values: [62.58, 38.83, 37.70, null, null, null, null, null, null, null, null, null] },
    { day: 15, description: "Cartão Pan", values: [56.13, 23.87, null, null, null, null, null, null, null, null, null, null] },
    { day: 15, description: "Cartão Itaú", values: [206.07, 79.64, 29.64, 29.64, 29.64, 29.64, 29.64, 29.64, 29.64, 29.64, 29.64, 29.64] },
    { day: 20, description: "Cartão PagBank", values: [314.42, 254.50, 210.03, 210.03, 10.03, 10.03, 10.03, 10.03, null, null, null, null] },
    { day: 20, description: "Cartão Will", values: [60.43, 60.43, 60.43, 60.43, 60.43, 60.43, 60.43, 60.43, 60.43, 60.43, 60.43, 9.86] },
    { day: 26, description: "Mentoria Individual Low Ticket", values: [537, 537, 537, 537, 537, 537, 537, 537, 537, null, null, null] },
    { day: 21, description: "Cartão Neon", values: [47.15, 47.15, 49.88, 9.70, null, null, null, null, null, null, null, null] },
    { day: 8, description: "Ismar", values: [100, null, null, null, null, null, null, null, null, null, null, null] },
    { day: 20, description: "Notebook", values: [null, 291.50, 291.50, 291.50, null, null, null, null, null, null, null, null] },
    { day: 10, description: "Compra do mês", values: [null, 100, 100, 100, 100, 100, 100, 100, null, null, null, null] },
    { day: 17, description: "Renner", values: [null, null, 34.65, 34.65, 34.65, 34.65, 34.65, 34.65, 34.65, 34.65, null, null] },
  ],
  totals: [1785.98, 1846.40, 1758.31, 1680.43, 1215.24, 1215.24, 1215.24, 1115.24, 568.21, 533.56, 482.99, 473.13],
  salary: 1500,
  available: [-285.98, -346.40, -258.31, -180.43, 284.76, 284.76, 284.76, 384.76, 931.79, 966.44, 1017.01, 1026.87],
};

export const allYears: YearData[] = [data2026, data2025, data2024];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getYearSummary(data: YearData) {
  const validTotals = data.totals.filter((t): t is number => t !== null);
  const totalExpenses = validTotals.reduce((a, b) => a + b, 0);
  const avgMonthly = validTotals.length > 0 ? totalExpenses / validTotals.length : 0;
  const maxMonth = Math.max(...validTotals);
  const minMonth = Math.min(...validTotals);
  const validAvailable = data.available.filter((a): a is number => a !== null);
  const avgAvailable = validAvailable.length > 0 ? validAvailable.reduce((a, b) => a + b, 0) / validAvailable.length : 0;

  return { totalExpenses, avgMonthly, maxMonth, minMonth, avgAvailable };
}

export function getCategoryTotals(data: YearData) {
  return data.expenses.map((exp) => ({
    name: exp.description,
    total: exp.values.reduce((acc, v) => acc + (v ?? 0), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
}
