"use client";

import { Briefcase, Clock, MessageSquare, Zap, Package } from "lucide-react";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { DashboardStats as DashboardStatsType } from "../types/dashboard";
import { Card, CardBody, CardHeader, Progress } from "@heroui/react";
import { api } from "@root/trpc/react";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";

interface DashboardStatsProps extends DashboardStatsType {}

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) => (
  <Card shadow="sm" radius="sm" className="p-2">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      {title}
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardBody className="">
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardBody>
  </Card>
);

export const DashboardStats = ({
  jobProfilesCount,
  totalInterviews,
  monthlyInterviews,
}: DashboardStatsProps) => {
  const t = useTranslations("mainPage");
  const { activeWorkspace } = useActiveWorkspace();

  // Get user limits and usage data
  const { data: userLimits, isLoading: limitsLoading } =
    api.auth.getUserLimits.useQuery(
      { workspaceId: activeWorkspace?.id || "" },
      { enabled: !!activeWorkspace?.id },
    );

  return (
    <div className="space-y-6 mb-8">
      {/* Interview Limits Section */}
      {!limitsLoading && userLimits && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subscription Usage */}
          {userLimits.recurringUsage && (
            <Card shadow="sm" radius="sm" className="p-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">
                      {t("subscriptionLimits", "Subscription Limits")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("monthlyAllocation", "Monthly allocation")}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("used", "Used")}:</span>
                    <span className="font-medium">
                      {userLimits.recurringUsage.interviewsUsed} /{" "}
                      {userLimits.recurringUsage.interviewsLimit}
                    </span>
                  </div>
                  <Progress
                    size="sm"
                    color={
                      userLimits.recurringUsage.interviewsUsed >=
                      userLimits.recurringUsage.interviewsLimit
                        ? "danger"
                        : userLimits.recurringUsage.interviewsUsed >
                            userLimits.recurringUsage.interviewsLimit * 0.8
                          ? "warning"
                          : "primary"
                    }
                    value={
                      (userLimits.recurringUsage.interviewsUsed /
                        userLimits.recurringUsage.interviewsLimit) *
                      100
                    }
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.max(
                    0,
                    userLimits.recurringUsage.interviewsLimit -
                      userLimits.recurringUsage.interviewsUsed,
                  )}{" "}
                  {t("interviewsRemaining", "interviews remaining this month")}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Bundle Credits */}
          {userLimits.bundles && userLimits.bundles.length > 0 && (
            <Card shadow="sm" radius="sm" className="p-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">
                      {t("bundleCredits", "Bundle Credits")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("purchasedInterviews", "Purchased interview packs")}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                {userLimits.bundles && userLimits.bundles.length > 0 ? (
                  <div className="space-y-3">
                    {userLimits.bundles.map((bundle, index) => (
                      <div key={bundle.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>
                            {t("bundle", "Bundle")} {index + 1}:
                          </span>
                          <span className="font-medium">
                            {bundle.interviewsLimit}{" "}
                            {t("interviews", "interviews")}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("expires", "Expires")}:{" "}
                          {new Date(bundle.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                    <div className="text-sm font-semibold text-primary">
                      {t("totalBundleCredits", "Total bundle credits")}:{" "}
                      {userLimits.bundles.reduce(
                        (sum, bundle) => sum + bundle.interviewsLimit,
                        0,
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    {t("noBundleCredits", "No bundle credits available")}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
          {/* Total Available */}
          <Card shadow="sm" radius="sm" className="p-4 lg:col-span-2">
            <CardBody>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {userLimits.totalAvailable}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("totalInterviewsAvailable", "Total interviews available")}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t(
                    "limitExplanation",
                    "Includes subscription + bundle credits",
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Existing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title={t("jobProfiles", "Job Profiles")}
          value={jobProfilesCount}
          description={t("activeProfiles", "Active profiles")}
          icon={Briefcase}
        />
        <StatCard
          title={t("totalInterviews", "Total Interviews")}
          value={totalInterviews}
          description={t("interviewsConducted", "Interviews conducted")}
          icon={MessageSquare}
        />
        <StatCard
          title={t("thisMonth", "This Month")}
          value={monthlyInterviews}
          description={t("recentInterviews", "Recent interviews")}
          icon={Clock}
        />
      </div>
    </div>
  );
};
