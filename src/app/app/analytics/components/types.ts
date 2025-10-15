export type SortOption =
  | "lastActivity"
  | "itemsCreated"
  | "totalContent"
  | "name"
  | "joinDate";

export type SortOrder = "asc" | "desc";
export type UserStatus = "active" | "dormant" | "inactive" | "new";
export type DateRange = "all" | "7days" | "30days" | "90days";

export interface FilterState {
  search: string;
  sortBy: SortOption;
  sortOrder: SortOrder;
  statusFilters: UserStatus[];
  minItems: string;
  maxItems: string;
  minContent: string;
  maxContent: string;
  dateRange: DateRange;
}

export type UserWithMetrics = {
  id: string;
  email: string;
  name: string;
  cv?: string;
  workspaceIds: string[];
  createdAt: Date;
  updatedAt: Date;
  status: UserStatus;
  workspacesCount: number;
  interviewsCount: number;
  avgInterviewDuration: number;
  totalMinutes: number;
  lastActivity: Date;
};

export interface TotalMetrics {
  totalUsers: number;
  totalWorkspaces: number;
  totalInterviews: number;
  totalInterviewMinutes: number;
  completedInterviews: number;
}

export interface MetricCardData {
  id: string;
  label: string;
  value: number;
  icon: any;
  theme: "primary" | "secondary";
  loading: boolean;
  error: string | null;
}

export interface UserStatusBreakdown {
  active: number;
  dormant: number;
  inactive: number;
  new: number;
}

export interface UserGrowthData {
  month: string;
  users: number;
  newUsers: number;
}

export interface EngagementMetricsData {
  month: string;
  completionRate: number;
  avgDuration: number;
  activeUsers: number;
  returnRate: number;
}
