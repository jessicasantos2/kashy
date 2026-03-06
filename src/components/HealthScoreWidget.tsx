import { useHealthScore } from "@/hooks/useHealthScore";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

function getScoreColor(score: number) {
  if (score >= 75) return "hsl(160 84% 39%)";
  if (score >= 50) return "hsl(38 92% 50%)";
  return "hsl(0 72% 51%)";
}

function getScoreLabel(score: number) {
  if (score >= 90) return "Excelente";
  if (score >= 75) return "Boa";
  if (score >= 50) return "Regular";
  if (score >= 25) return "Ruim";
  return "Crítica";
}

interface Props {
  year: number;
}

export function HealthScoreWidget({ year }: Props) {
  const { score, gastos, divida, reserva, metas, feedbacks } = useHealthScore(year);
  const isMobile = useIsMobile();
  const [detailOpen, setDetailOpen] = useState(false);
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  const radius = isMobile ? 65 : 80;
  const svgSize = isMobile ? 160 : 200;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const pillars = [
    { name: "Gastos vs Renda", value: gastos, weight: "30%" },
    { name: "Endividamento", value: divida, weight: "25%" },
    { name: "Reserva Emergência", value: reserva, weight: "25%" },
    { name: "Metas", value: metas, weight: "20%" },
  ];

  const GaugeComponent = (
    <div className="relative flex-shrink-0">
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        <circle
          cx={svgSize / 2} cy={svgSize / 2} r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="12"
        />
        <circle
          cx={svgSize / 2} cy={svgSize / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
          style={{ transition: "stroke-dashoffset 1s ease-in-out, stroke 0.5s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${isMobile ? "text-3xl" : "text-4xl"} font-bold`} style={{ color }}>{score}</span>
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
    </div>
  );

  const PillarDetails = (
    <div className="flex-1 space-y-4 w-full">
      {pillars.map((p) => (
        <div key={p.name} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{p.name} <span className="text-xs">({p.weight})</span></span>
            <span className="font-semibold" style={{ color: getScoreColor(p.value) }}>{p.value}/100</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${p.value}%`, backgroundColor: getScoreColor(p.value) }}
            />
          </div>
        </div>
      ))}
      <div className="mt-4 space-y-2">
        {feedbacks.map((fb, i) => (
          <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-primary mt-0.5">💡</span>
            {fb}
          </p>
        ))}
      </div>
    </div>
  );

  // Mobile: tappable compact card → drawer with details
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setDetailOpen(true)}
          className="glass-card rounded-xl p-4 animate-fade-up w-full text-left"
        >
          <h3 className="text-base font-semibold mb-1">Score de Saúde Financeira</h3>
          <p className="text-sm text-muted-foreground mb-3">Toque para ver detalhes</p>
          <div className="flex items-center justify-center">
            {GaugeComponent}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Sua saúde financeira está em <span className="font-semibold" style={{ color }}>{score}/100</span>
          </p>
        </button>

        <Drawer open={detailOpen} onOpenChange={setDetailOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>Detalhes do Score</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto space-y-6">
              <div className="flex justify-center">{GaugeComponent}</div>
              {PillarDetails}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: full inline widget
  return (
    <div className="glass-card rounded-xl p-6 animate-fade-up">
      <h3 className="text-lg font-semibold mb-1">Score de Saúde Financeira</h3>
      <p className="text-sm text-muted-foreground mb-6">Avaliação geral das suas finanças</p>
      <div className="flex flex-col lg:flex-row items-center gap-8">
        {GaugeComponent}
        {PillarDetails}
      </div>
    </div>
  );
}
