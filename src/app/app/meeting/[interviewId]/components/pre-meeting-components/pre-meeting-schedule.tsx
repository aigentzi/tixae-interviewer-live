import { Button } from "@root/components/ui/button";
import { Label } from "@root/components/ui/label";
import { api } from "@root/trpc/react";
import { FC, useEffect, useState } from "react";
import { useRoom } from "../../hooks/room.hook";
import InlineNotification from "@root/app/components/InlineNotification";
import { DatePicker } from "@heroui/react";
import {
  getLocalTimeZone,
  now,
  parseAbsoluteToLocal,
  today,
} from "@internationalized/date";

export const PreMeetingSchedule: FC<{
  next: () => void;
  prev: () => void;
}> = ({ next, prev }) => {
  const { interview, refetchInterview, isRescheduling, setIsRescheduling } =
    useRoom();

  const [date, setDate] = useState<Date | null>(
    now(getLocalTimeZone()).toDate(),
  );
  const [stepError, setStepError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  const updateInterviewMutation = api.interviews.update.useMutation({
    onSuccess: () => {
      setNotification({
        type: "success",
        message: interview?.startTime
          ? "Interview rescheduled successfully"
          : "Interview scheduled successfully",
      });

      // Mark rescheduling as complete if we were in rescheduling mode
      if (isRescheduling) {
        setIsRescheduling(false);
      }

      refetchInterview();
    },
    onError: (error) => {
      setStepError(error.message);
    },
  });

  useEffect(() => {
    if (interview && interview.startTime) {
      const interviewStartTime = new Date(interview.startTime);
      const now = new Date();

      // If the scheduled time is in the past, reset to current time for rescheduling
      if (interviewStartTime.getTime() < now.getTime()) {
        setDate(now);
      } else {
        setDate(interviewStartTime);
      }
    }
  }, [interview]);

  const handleNextStep = () => {
    // If interview has already started (has score), just move to next step
    if (
      interview?.startTime &&
      interview?.score !== undefined &&
      interview?.score !== null
    ) {
      next();
    } else {
      // Allow scheduling/rescheduling
      if (date) {
        const startTime = new Date(date);
        const endTime = new Date(
          startTime.getTime() + (interview?.duration || 0) * 60000,
        );

        updateInterviewMutation.mutate({
          interviewId: interview?.id || "",
          data: {
            startTime,
            endTime,
            enableSchedule: true,
          },
        });
        next();
      } else {
        setStepError("Please select a date and time");
      }
    }
  };

  return (
    <div className="flex flex-row gap-2 w-full flex-wrap mt-10">
      <div className="flex flex-col gap-2 w-full">
        <h1 className="text-2xl font-bold">Schedule Meeting</h1>
        {notification && (
          <InlineNotification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
        {stepError && (
          <p className="text-red-500 text-sm bg-red-500/10 p-2 rounded-md">
            {stepError}
          </p>
        )}
        {interview?.startTime &&
        interview?.endTime &&
        interview?.score !== undefined &&
        interview?.score !== null ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Meeting Already scheduled by the interviewer.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Start Time</p>
                <div className="flex flex-col gap-2">
                  <DatePicker
                    id="startTime"
                    hideTimeZone
                    color="primary"
                    variant="bordered"
                    isDisabled
                    onChange={(value) => {
                      if (!value) return;
                      const newStartTime = value?.toDate();
                      setDate(newStartTime);
                    }}
                    showMonthAndYearPickers
                    value={
                      date
                        ? parseAbsoluteToLocal(date.toISOString())
                        : undefined
                    }
                    minValue={now(getLocalTimeZone())}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">End Time</p>
                <div className="flex flex-col gap-2">
                  <DatePicker
                    id="endTime"
                    hideTimeZone
                    color="primary"
                    isDisabled
                    variant="bordered"
                    showMonthAndYearPickers
                    value={
                      interview?.endTime
                        ? parseAbsoluteToLocal(interview?.endTime.toISOString())
                        : undefined
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Schedule a meeting with the client.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
              <div className="flex flex-col gap-2">
                <Label htmlFor="start-date">Start Date</Label>
                <DatePicker
                  id="startTime"
                  hideTimeZone
                  color="primary"
                  defaultValue={now(getLocalTimeZone())}
                  variant="bordered"
                  onChange={(value) => {
                    if (!value) return;
                    const newStartTime = value?.toDate();
                    setDate(newStartTime);
                  }}
                  showMonthAndYearPickers
                  value={
                    date ? parseAbsoluteToLocal(date.toISOString()) : undefined
                  }
                  minValue={now(getLocalTimeZone())}
                  className="flex-1"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="endTime">End Time</Label>
                <DatePicker
                  id="endTime"
                  hideTimeZone
                  color="primary"
                  variant="bordered"
                  showMonthAndYearPickers
                  value={
                    date
                      ? parseAbsoluteToLocal(
                          new Date(
                            date.getTime() + (interview?.duration || 0) * 60000,
                          ).toISOString(),
                        )
                      : undefined
                  }
                  defaultValue={now(getLocalTimeZone()).add({
                    minutes: interview?.duration || 0,
                  })}
                  isDisabled
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-row items-center justify-between gap-2 w-full">
          <Button onPress={prev} variant="bordered">
            Previous
          </Button>
          <Button
            onPress={handleNextStep}
            isDisabled={updateInterviewMutation.isPending}
            color="primary"
          >
            {updateInterviewMutation.isPending
              ? "Updating..."
              : interview?.startTime
                ? "Reschedule"
                : "Schedule"}
          </Button>
        </div>
      </div>
    </div>
  );
};
