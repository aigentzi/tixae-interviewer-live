export interface Interview {
  id?: string;
  jobProfileId?: string;
  level?: string | number | null;
  intervieweeEmail?: string;
  createdAt?: Date | string;
  userId?: string;
  updatedAt?: Date;
  content?: string;
  workspaceId?: string;
  feedback?: string;
}

export interface JobProfile {
  id?: string;
  name?: string;
}

export interface DashboardStats {
  jobProfilesCount: number;
  totalInterviews: number;
  monthlyInterviews: number;
}
