import { Card } from "@heroui/react";
import type { MetricCardData } from "./types";

interface MetricsGridProps {
  metrics: MetricCardData[];
  getThemeClasses: (theme: "primary" | "secondary") => string;
}

export function MetricsGrid({ metrics, getThemeClasses }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      {metrics.map((metric) => {
        const IconComponent = metric.icon;
        const themeClasses = getThemeClasses(metric.theme);

        return (
          <Card
            key={metric.id}
            shadow="sm"
            radius="sm"
            className="p-4 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${themeClasses}`}
              >
                <IconComponent className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">
                  {metric.label}
                </p>
                {metric.loading ? (
                  <div className="h-6 bg-muted/30 rounded animate-pulse mt-1" />
                ) : metric.error ? (
                  <p className="text-sm text-red-500 font-medium">Error</p>
                ) : (
                  <p className="text-lg font-bold text-foreground">
                    {metric.value.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
