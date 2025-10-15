import { Target } from "lucide-react";
import type { EngagementMetricsData } from "./types";
import { Card } from "@heroui/react";

interface EngagementMetricsChartProps {
  engagementMetricsData: EngagementMetricsData[];
  metricsLoading: boolean;
}

export function EngagementMetricsChart({
  engagementMetricsData,
  metricsLoading,
}: EngagementMetricsChartProps) {
  return (
    <Card shadow="sm" radius="sm" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Engagement Metrics
        </h3>
        <Target className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="h-80 p-4">
        {metricsLoading ? (
          <div className="h-full bg-muted/30 rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-center">
              <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Loading metrics...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 flex pb-2">
              <div className="w-12 flex flex-col justify-between items-end pr-2 h-full">
                {[100, 80, 60, 40, 20, 0].map((tick, index) => (
                  <span
                    key={index}
                    className="text-xs text-muted-foreground font-mono"
                  >
                    {tick}%
                  </span>
                ))}
              </div>

              <div className="flex-1 relative border-l border-b border-border pl-2 pb-2">
                {[20, 40, 60, 80].map((line) => (
                  <div
                    key={line}
                    className="absolute w-full border-t border-border/30"
                    style={{ bottom: `${line}%` }}
                  />
                ))}

                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ height: "calc(100% - 24px)" }}
                >
                  {engagementMetricsData.map((data, index) => {
                    if (index >= engagementMetricsData.length - 1) return null;

                    const x1 =
                      (index / (engagementMetricsData.length - 1)) * 100;
                    const x2 =
                      ((index + 1) / (engagementMetricsData.length - 1)) * 100;
                    const y1 = 100 - data.completionRate;
                    const y2 =
                      100 - engagementMetricsData[index + 1].completionRate;

                    return (
                      <line
                        key={`completion-${index}`}
                        x1={`${x1}%`}
                        y1={`${y1}%`}
                        x2={`${x2}%`}
                        y2={`${y2}%`}
                        stroke="hsl(var(--primary))"
                        strokeWidth="2"
                        className="drop-shadow-sm"
                      />
                    );
                  })}

                  {engagementMetricsData.map((data, index) => {
                    if (index >= engagementMetricsData.length - 1) return null;

                    const x1 =
                      (index / (engagementMetricsData.length - 1)) * 100;
                    const x2 =
                      ((index + 1) / (engagementMetricsData.length - 1)) * 100;
                    const y1 = 100 - data.returnRate;
                    const y2 =
                      100 - engagementMetricsData[index + 1].returnRate;

                    return (
                      <line
                        key={`return-${index}`}
                        x1={`${x1}%`}
                        y1={`${y1}%`}
                        x2={`${x2}%`}
                        y2={`${y2}%`}
                        stroke="hsl(var(--secondary))"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                        className="drop-shadow-sm"
                      />
                    );
                  })}
                </svg>

                <div
                  className="relative h-full"
                  style={{ height: "calc(100% - 24px)" }}
                >
                  {engagementMetricsData.map((data, index) => {
                    const xPosition =
                      (index / (engagementMetricsData.length - 1)) * 100;
                    const isLastTwoMonths =
                      index >= engagementMetricsData.length - 2;

                    return (
                      <div
                        key={data.month}
                        className="absolute"
                        style={{ left: `${xPosition}%` }}
                      >
                        <div
                          className="absolute w-3 h-3 bg-primary rounded-full -translate-x-1.5 group cursor-pointer hover:scale-125 transition-transform duration-200 border-2 border-background shadow-lg"
                          style={{ bottom: `${data.completionRate}%` }}
                        >
                          <div
                            className={`absolute bottom-4 ${
                              isLastTwoMonths
                                ? "right-0"
                                : "left-1/2 -translate-x-1/2"
                            } bg-background border border-border rounded-lg px-3 py-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-20 whitespace-nowrap`}
                          >
                            <div className="text-center">
                              <p className="font-semibold text-foreground mb-1">
                                {data.month}
                              </p>
                              <p className="text-primary text-sm">
                                Completion: {data.completionRate}%
                              </p>
                              <p className="text-secondary text-sm">
                                Return Rate: {Math.round(data.returnRate)}%
                              </p>
                              <p className="text-muted-foreground text-sm">
                                Avg Duration: {data.avgDuration}m
                              </p>
                            </div>
                          </div>
                        </div>

                        <div
                          className="absolute w-3 h-3 bg-secondary rounded-full -translate-x-1.5 hover:scale-125 transition-transform duration-200 border-2 border-background shadow-lg"
                          style={{ bottom: `${data.returnRate}%` }}
                        />

                        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2">
                          <span className="text-xs text-muted-foreground font-medium">
                            {data.month}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 py-2 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-primary rounded-sm" />
                <span className="text-xs text-muted-foreground">
                  Completion Rate
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border-t-2 border-dashed border-secondary" />
                <span className="text-xs text-muted-foreground">
                  Return Rate
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
