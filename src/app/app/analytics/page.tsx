"use client";

import { useGAuth } from "@root/app/hooks/guath.hook";
import { Users, Video, Calendar, MessageSquare, Activity } from "lucide-react";
import { AdminAccessGuard } from "@root/app/app/admin/components/partials/AdminAccessGuard";
import {
  AnalyticsHeader,
  MetricsGrid,
  UserStatusBreakdownCard,
  FiltersSection,
  UserGrowthChart,
  EngagementMetricsChart,
  UserDetailsList,
  AnalyticsFooter,
  useAnalyticsData,
  type MetricCardData,
} from "@root/app/app/analytics/components";
import { Card } from "@heroui/react";

export default function AnalyticsPage() {
  const { gauthUser } = useGAuth();

  // Use analytics hook for all data and state management
  const {
    metricsLoading,
    filtersExpanded,
    setFiltersExpanded,
    totalMetrics,
    filteredUsers,
    activeFiltersCount,
    userStatusBreakdown,
    userGrowthData,
    engagementMetricsData,
    filters,
    getThemeClasses,
    clearAllFilters,
    updateFilter,
    getStatusBadgeColor,
  } = useAnalyticsData();

  // Metrics data for the grid
  const metrics: MetricCardData[] = [
    {
      id: "total-users",
      label: "Total Users",
      value: totalMetrics.totalUsers,
      icon: Users,
      theme: "primary",
      loading: metricsLoading,
      error: null,
    },
    {
      id: "active-users",
      label: "Active Users",
      value: userStatusBreakdown.active,
      icon: Activity,
      theme: "primary",
      loading: metricsLoading,
      error: null,
    },
    {
      id: "total-interviews",
      label: "Total Interviews",
      value: totalMetrics.totalInterviews,
      icon: Video,
      theme: "secondary",
      loading: metricsLoading,
      error: null,
    },
    {
      id: "completed-interviews",
      label: "Completed",
      value: totalMetrics.completedInterviews,
      icon: Calendar,
      theme: "secondary",
      loading: metricsLoading,
      error: null,
    },
    {
      id: "total-workspaces",
      label: "Total Workspaces",
      value: totalMetrics.totalWorkspaces,
      icon: MessageSquare,
      theme: "primary",
      loading: metricsLoading,
      error: null,
    },
  ];

  return (
    <AdminAccessGuard>
      <div className="min-h-screen bg-background">
        <AnalyticsHeader gauthUser={gauthUser} />

        <main className="container mx-auto px-6 py-8">
          <Card shadow="sm" radius="lg" className="overflow-hidden">
            <div className="p-8">
              <MetricsGrid
                metrics={metrics}
                getThemeClasses={getThemeClasses}
              />

              <UserStatusBreakdownCard
                userStatusBreakdown={userStatusBreakdown}
                totalMetrics={totalMetrics}
                metricsLoading={metricsLoading}
              />

              <FiltersSection
                filters={filters}
                activeFiltersCount={activeFiltersCount}
                filtersExpanded={filtersExpanded}
                setFiltersExpanded={setFiltersExpanded}
                updateFilter={updateFilter}
                clearAllFilters={clearAllFilters}
                filteredUsersCount={filteredUsers.length}
                totalUsersCount={totalMetrics.totalUsers}
              />

              <UserDetailsList
                filteredUsers={filteredUsers}
                metricsLoading={metricsLoading}
                clearAllFilters={clearAllFilters}
                getStatusBadgeColor={getStatusBadgeColor}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <UserGrowthChart
                  userGrowthData={userGrowthData}
                  metricsLoading={metricsLoading}
                />

                <EngagementMetricsChart
                  engagementMetricsData={engagementMetricsData}
                  metricsLoading={metricsLoading}
                />
              </div>
            </div>
          </Card>
        </main>

        <AnalyticsFooter />
      </div>
    </AdminAccessGuard>
  );
}
