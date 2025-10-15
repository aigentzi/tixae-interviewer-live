import { BarChart3 } from "lucide-react";
import type { UserGrowthData } from "./types";
import { Card } from "@heroui/react";

interface UserGrowthChartProps {
  userGrowthData: UserGrowthData[];
  metricsLoading: boolean;
}

export function UserGrowthChart({
  userGrowthData,
  metricsLoading,
}: UserGrowthChartProps) {
  return (
    <Card shadow="sm" radius="sm" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">User Growth</h3>
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="h-80 p-4">
        {metricsLoading ? (
          <div className="h-full bg-muted/30 rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading chart...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 flex pb-2">
              <div className="w-12 flex flex-col justify-between items-end pr-2 h-full">
                {(() => {
                  const maxUsers = Math.max(
                    ...userGrowthData.map((d) => d.users),
                  );
                  const yAxisTicks = 5;
                  const step = Math.ceil(maxUsers / yAxisTicks);
                  const ticks = [];
                  for (let i = yAxisTicks; i >= 0; i--) {
                    ticks.push(step * i);
                  }
                  return ticks.map((tick, index) => (
                    <span
                      key={index}
                      className="text-xs text-muted-foreground font-mono"
                    >
                      {tick}
                    </span>
                  ));
                })()}
              </div>

              <div className="flex-1 flex items-end justify-between gap-2 border-l border-b border-border pl-2 pb-2">
                {userGrowthData.map((data, index) => {
                  const maxUsers = Math.max(
                    ...userGrowthData.map((d) => d.users),
                  );
                  const height =
                    maxUsers > 0 ? (data.users / maxUsers) * 100 : 0;
                  const newUsersHeight =
                    maxUsers > 0 ? (data.newUsers / maxUsers) * 100 : 0;

                  return (
                    <div
                      key={data.month}
                      className="flex-1 flex flex-col items-center group"
                    >
                      <div className="w-full h-44 flex flex-col justify-end mb-2 relative">
                        <div
                          className="w-full bg-primary/20 rounded-t-sm transition-all duration-300 group-hover:bg-primary/30"
                          style={{ height: `${height}%` }}
                        />
                        <div
                          className="w-full bg-primary rounded-t-sm absolute bottom-0 transition-all duration-300 group-hover:bg-primary/80"
                          style={{ height: `${newUsersHeight}%` }}
                        />

                        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded-lg px-3 py-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-10 whitespace-nowrap">
                          <div className="text-center">
                            <p className="font-semibold text-foreground">
                              {data.users} total
                            </p>
                            <p className="text-muted-foreground">
                              +{data.newUsers} new
                            </p>
                          </div>
                        </div>
                      </div>

                      <span className="text-xs text-muted-foreground font-medium">
                        {data.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 py-2`">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-sm" />
                <span className="text-xs text-muted-foreground">New Users</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary/20 rounded-sm" />
                <span className="text-xs text-muted-foreground">
                  Total Users
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
