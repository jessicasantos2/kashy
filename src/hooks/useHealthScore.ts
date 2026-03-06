import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useState, useEffect } from "react";

interface GoalProgress {
  target_amount: number;
  saved: number;
}

export function useHealthScore(year: number) {
  const { user } = useAuth();
  const {
    salary,
    currentMonthExpenses,
    totalDebts,
    totalSaved,
  } = useDashboardData(year);

  const [goalsProgress, setGoalsProgress] = useState<GoalProgress[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: goals } = await supabase
        .from("goals")
        .select("id, target_amount")
        .eq("user_id", user.id);
      if (!goals || goals.length === 0) { setGoalsProgress([]); return; }

      const { data: entries } = await supabase
        .from("goal_entries")
        .select("goal_id, amount")
        .eq("user_id", user.id);

      const savedMap: Record<string, number> = {};
      (entries ?? []).forEach(e => {
        savedMap[e.goal_id] = (savedMap[e.goal_id] ?? 0) + e.amount;
      });

      setGoalsProgress(goals.map(g => ({
        target_amount: g.target_amount,
        saved: savedMap[g.id] ?? 0,
      })));
    })();
  }, [user]);

  return useMemo(() => {
    if (salary <= 0) return { score: 0, gastos: 0, divida: 0, reserva: 0, metas: 0, feedbacks: ["Configure seu salário nas Configurações para calcular o score."] };

    // 1. Gastos vs Renda (30%)
    const percentualGastos = (currentMonthExpenses / salary) * 100;
    const scoreGastos = Math.max(0, Math.min(100, 100 - percentualGastos * 1.2));

    // 2. Endividamento (25%)
    const percentualDivida = totalDebts / salary;
    const scoreDivida = Math.max(0, Math.min(100, 100 - percentualDivida * 100));

    // 3. Reserva Emergência (25%) — ideal 6 meses
    const reservaRatio = totalSaved / (salary * 6);
    const scoreReserva = Math.max(0, Math.min(100, reservaRatio * 100));

    // 4. Metas (20%)
    let scoreMetas = 0;
    if (goalsProgress.length > 0) {
      const avg = goalsProgress.reduce((acc, g) => {
        const pct = g.target_amount > 0 ? Math.min(100, (g.saved / g.target_amount) * 100) : 0;
        return acc + pct;
      }, 0) / goalsProgress.length;
      scoreMetas = Math.min(100, avg);
    }

    const scoreFinal = Math.max(0, Math.min(100, Math.round(
      scoreGastos * 0.30 +
      scoreDivida * 0.25 +
      scoreReserva * 0.25 +
      scoreMetas * 0.20
    )));

    // Feedbacks
    const feedbacks: string[] = [];
    if (percentualGastos > 70) {
      const reducao = Math.round(percentualGastos - 70);
      feedbacks.push(`Reduza suas despesas em ${reducao}% para atingir o ideal de 70% da renda.`);
    }
    if (percentualDivida > 0.3) {
      feedbacks.push("Seu endividamento está alto. Priorize quitar dívidas.");
    }
    if (reservaRatio < 1) {
      const falta = Math.round((1 - reservaRatio) * salary * 6);
      feedbacks.push(`Faltam R$ ${falta.toLocaleString("pt-BR")} para completar sua reserva de emergência.`);
    }
    if (goalsProgress.length === 0) {
      feedbacks.push("Crie metas financeiras para melhorar seu score.");
    } else if (scoreMetas < 50) {
      feedbacks.push("Aumente seus aportes nas metas para elevar sua pontuação.");
    }
    if (feedbacks.length === 0) {
      feedbacks.push("Parabéns! Sua saúde financeira está excelente. 🎉");
    }

    return {
      score: scoreFinal,
      gastos: Math.round(scoreGastos),
      divida: Math.round(scoreDivida),
      reserva: Math.round(scoreReserva),
      metas: Math.round(scoreMetas),
      feedbacks,
    };
  }, [salary, currentMonthExpenses, totalDebts, totalSaved, goalsProgress]);
}
