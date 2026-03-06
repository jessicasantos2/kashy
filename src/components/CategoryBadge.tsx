import { lazy, Suspense, useState, useEffect, ComponentType } from "react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { Tag, LucideProps } from "lucide-react";

interface CategoryBadgeProps {
  name: string;
  icon: string;
  color: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

function SafeIcon({ name, color, size = 16 }: { name: string; color: string; size?: number }) {
  const [IconComponent, setIconComponent] = useState<ComponentType<LucideProps> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const iconName = name as keyof typeof dynamicIconImports;
    const importFn = dynamicIconImports[iconName];
    if (!importFn) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    importFn()
      .then((mod) => {
        if (!cancelled) setIconComponent(() => mod.default);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, [name]);

  if (failed || (!IconComponent && !dynamicIconImports[name as keyof typeof dynamicIconImports])) {
    return <Tag size={size} color={color} />;
  }
  if (!IconComponent) {
    return <div style={{ width: size, height: size }} />;
  }
  return <IconComponent size={size} color={color} />;
}

export function CategoryBadge({ name, icon, color, showLabel = true, size = "sm" }: CategoryBadgeProps) {
  const iconSize = size === "sm" ? 14 : 18;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex items-center justify-center rounded-md"
        style={{
          backgroundColor: color + "1a",
          padding: size === "sm" ? "3px" : "5px",
        }}
      >
        <SafeIcon name={icon} color={color} size={iconSize} />
      </span>
      {showLabel && <span className="text-sm">{name}</span>}
    </span>
  );
}
