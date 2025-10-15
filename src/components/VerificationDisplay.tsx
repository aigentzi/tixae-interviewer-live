import React from "react";
import { api } from "@root/trpc/react";

interface VerificationDisplayProps {
  verificationId: string;
}

export const VerificationDisplay: React.FC<VerificationDisplayProps> = ({
  verificationId,
}) => {
  const { data: verificationData, isLoading: dataLoading } =
    api.interviews.getVerificationSessionFromStripe.useQuery(
      {
        verificationId,
      },
      {
        enabled: !!verificationId,
      }
    );

  if (dataLoading) {
    return <div>Loading verification data...</div>;
  }

  if (!verificationData) {
    return <div>No verification data found</div>;
  }

  return (
    <div className="space-y-6 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Identity Verification Results</h3>
      <pre>{JSON.stringify(verificationData, null, 2)}</pre>
    </div>
  );
};
