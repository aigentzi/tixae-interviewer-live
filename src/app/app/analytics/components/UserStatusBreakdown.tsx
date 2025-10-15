import { TrendingUp } from "lucide-react";
import type { UserStatusBreakdown, TotalMetrics } from "./types";
import { Card } from "@heroui/react";

interface UserStatusBreakdownProps {
  userStatusBreakdown: UserStatusBreakdown;
  totalMetrics: TotalMetrics;
  metricsLoading: boolean;
}

export function UserStatusBreakdownCard({
  userStatusBreakdown,
  totalMetrics,
  metricsLoading,
}: UserStatusBreakdownProps) {
  return (
    <Card shadow="sm" radius="sm" className="mb-8">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            User Status Breakdown
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center group cursor-pointer transition-all duration-200 hover:scale-105">
            <div className="p-4 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors duration-200">
              {metricsLoading ? (
                <div className="h-8 bg-muted/30 rounded animate-pulse mb-2" />
              ) : (
                <p className="text-2xl font-bold text-primary mb-2">
                  {userStatusBreakdown.active.toLocaleString()}
                </p>
              )}
              <p className="text-sm text-muted-foreground font-medium">
                Active Users
              </p>
              <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
            </div>
          </div>

          <div className="text-center group cursor-pointer transition-all duration-200 hover:scale-105">
            <div className="p-4 rounded-lg bg-secondary/5 group-hover:bg-secondary/10 transition-colors duration-200">
              {metricsLoading ? (
                <div className="h-8 bg-muted/30 rounded animate-pulse mb-2" />
              ) : (
                <p className="text-2xl font-bold text-secondary mb-2">
                  {userStatusBreakdown.dormant.toLocaleString()}
                </p>
              )}
              <p className="text-sm text-muted-foreground font-medium">
                Dormant Users
              </p>
              <p className="text-xs text-muted-foreground mt-1">7-30 days</p>
            </div>
          </div>

          <div className="text-center group cursor-pointer transition-all duration-200 hover:scale-105">
            <div className="p-4 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors duration-200">
              {metricsLoading ? (
                <div className="h-8 bg-muted/30 rounded animate-pulse mb-2" />
              ) : (
                <p className="text-2xl font-bold text-primary mb-2">
                  {userStatusBreakdown.inactive.toLocaleString()}
                </p>
              )}
              <p className="text-sm text-muted-foreground font-medium">
                Inactive Users
              </p>
              <p className="text-xs text-muted-foreground mt-1">30+ days</p>
            </div>
          </div>

          <div className="text-center group cursor-pointer transition-all duration-200 hover:scale-105">
            <div className="p-4 rounded-lg bg-secondary/5 group-hover:bg-secondary/10 transition-colors duration-200">
              {metricsLoading ? (
                <div className="h-8 bg-muted/30 rounded animate-pulse mb-2" />
              ) : (
                <p className="text-2xl font-bold text-secondary mb-2">
                  {userStatusBreakdown.new.toLocaleString()}
                </p>
              )}
              <p className="text-sm text-muted-foreground font-medium">
                New Users
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                No content yet
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-2">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>
              Activity Rate:{" "}
              {totalMetrics.totalUsers > 0
                ? Math.round(
                    ((userStatusBreakdown.active +
                      userStatusBreakdown.dormant) /
                      totalMetrics.totalUsers) *
                      100,
                  )
                : 0}
              %
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
