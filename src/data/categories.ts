export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Alimentação", icon: "utensils", color: "#f97316" },
  { name: "Moradia", icon: "home", color: "#8b5cf6" },
  { name: "Transporte", icon: "car", color: "#3b82f6" },
  { name: "Saúde", icon: "heart-pulse", color: "#ef4444" },
  { name: "Educação", icon: "graduation-cap", color: "#06b6d4" },
  { name: "Lazer", icon: "gamepad-2", color: "#ec4899" },
  { name: "Telecomunicações", icon: "wifi", color: "#14b8a6" },
  { name: "Assinaturas", icon: "repeat", color: "#a855f7" },
  { name: "Seguros", icon: "shield", color: "#64748b" },
  { name: "Cartão de Crédito", icon: "credit-card", color: "#f59e0b" },
  { name: "Investimentos", icon: "trending-up", color: "#22c55e" },
  { name: "Impostos", icon: "receipt", color: "#dc2626" },
  { name: "Vestuário", icon: "shirt", color: "#d946ef" },
  { name: "Serviços", icon: "wrench", color: "#78716c" },
  { name: "Pets", icon: "paw-print", color: "#a3854a" },
  { name: "Presentes", icon: "gift", color: "#e11d48" },
  { name: "Salário", icon: "dollar-sign", color: "#16a34a" },
  { name: "Freelance", icon: "laptop", color: "#0ea5e9" },
  { name: "Receita", icon: "wallet", color: "#10b981" },
  { name: "Outros", icon: "tag", color: "#6366f1" },
];

export const CATEGORIES = DEFAULT_CATEGORIES.map(c => c.name);

export function getDefaultCategoryMeta(name: string): { icon: string; color: string } {
  const found = DEFAULT_CATEGORIES.find(c => c.name === name);
  return found ? { icon: found.icon, color: found.color } : { icon: "tag", color: "#6366f1" };
}
