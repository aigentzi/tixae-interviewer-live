import { Button } from "@root/components/ui/button";
import { Clock, MessageSquare, Timer, User, Users, Video } from "lucide-react";
import type { UserStatus, UserWithMetrics } from "./types";
import { Card } from "@heroui/react";

interface UserDetailsListProps {
  filteredUsers: UserWithMetrics[];
  metricsLoading: boolean;
  clearAllFilters: () => void;
  getStatusBadgeColor: (status: UserStatus) => string;
}

export function UserDetailsList({
  filteredUsers,
  metricsLoading,
  clearAllFilters,
  getStatusBadgeColor,
}: UserDetailsListProps) {
  const getDaysSinceLastActivity = (lastActivity: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastActivity.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card shadow="sm" radius="sm" className="mb-8">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          User Details
        </h3>

        {metricsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <Card key={item} className="p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-muted/30 rounded-full" />
                    <div className="space-y-2">
                      <div className="h-4 bg-muted/30 rounded w-32" />
                      <div className="h-3 bg-muted/30 rounded w-24" />
                    </div>
                  </div>
                  <div className="h-6 bg-muted/30 rounded w-20" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((metric) => (
                    <div key={metric} className="text-center">
                      <div className="h-6 bg-muted/30 rounded mb-1" />
                      <div className="h-4 bg-muted/30 rounded" />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredUsers.map((user) => {
              const daysSinceActivity = getDaysSinceLastActivity(
                user.lastActivity,
              );

              return (
                <Card
                  key={user.id}
                  className="p-6 border border-default-200 bg-card shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center border-2 border-primary/30">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-foreground">
                          {user.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                              user.status,
                            )}`}
                          >
                            {user.status.charAt(0).toUpperCase() +
                              user.status.slice(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Member since{" "}
                            {user.createdAt.toLocaleDateString("en-US", {
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {daysSinceActivity} day
                        {daysSinceActivity !== 1 ? "s" : ""} ago
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last seen:{" "}
                        {user.lastActivity.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-lg font-bold text-foreground">
                        {user.workspacesCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Workspaces
                      </p>
                    </div>

                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Video className="w-4 h-4 text-secondary" />
                      </div>
                      <p className="text-lg font-bold text-foreground">
                        {user.interviewsCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Interviews
                      </p>
                    </div>

                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Timer className="w-4 h-4 text-secondary" />
                      </div>
                      <p className="text-lg font-bold text-foreground">
                        {user.avgInterviewDuration}m
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Avg Duration
                      </p>
                    </div>

                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-lg font-bold text-foreground">
                        {user.totalMinutes.toLocaleString()}m
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Minutes
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-foreground mb-2">
                  No users found
                </p>
                <p className="text-muted-foreground mb-4">
                  No users match the current filters. Try adjusting your search
                  criteria.
                </p>
                <Button variant="bordered" onPress={clearAllFilters}>
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
