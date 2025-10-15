"use client";

import { Card } from "@heroui/react";
import { DASHBOARD_CONSTANTS } from "../constants/dashboard";
import { Interview, JobProfile } from "../types/dashboard";

interface RecentInterviewsProps {
  interviews: Interview[];
  jobProfiles: JobProfile[];
  maxItems?: number;
}

const RecentInterviewCard = ({
  interview,
  jobProfile,
}: {
  interview: Interview;
  jobProfile?: JobProfile;
}) => (
  <Card shadow="sm" radius="sm" key={interview.id} className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-medium">{jobProfile?.name || "Unknown Profile"}</h3>
        <p className="text-sm text-muted-foreground">
          {interview.level ? `Level ${interview.level}` : "No Level"} •{" "}
          {interview.intervieweeEmail || "No email"}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm text-muted-foreground">
          {interview.createdAt
            ? new Date(interview.createdAt).toLocaleDateString()
            : "No date"}
        </p>
        {/* <Link href={`/app/meeting/room/${interview.id}`}>
          <Button size="sm" variant="outline">
            View
          </Button>
        </Link> */}
      </div>
    </div>
  </Card>
);

export const RecentInterviews = ({
  interviews,
  jobProfiles,
  maxItems = DASHBOARD_CONSTANTS.RECENT_INTERVIEWS_LIMIT,
}: RecentInterviewsProps) => {
  if (!interviews || interviews.length === 0) {
    return null;
  }

  const recentInterviews = interviews.slice(0, maxItems);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Recent Interviews</h2>
      <div className="space-y-3">
        {recentInterviews.map((interview) => {
          if (!interview.id) return null;

          const jobProfile = jobProfiles.find(
            (profile) => profile.id === interview.jobProfileId,
          );

          return (
            <RecentInterviewCard
              key={interview.id}
              interview={interview}
              jobProfile={jobProfile}
            />
          );
        })}
      </div>
    </div>
  );
};
