import { PreMeeting } from "./pre-meeting";
import { Meeting } from "./meeting";
import { useRoomFlow } from "../hooks/useRoomFlow";
import { useRoom } from "../hooks/room.hook";
import { Card } from "@heroui/react";

export const ContentComponent = () => {
  const { roomName, workspaceSettings } = useRoom();
  const {
    showMeetingImmediately,
    currentStep,
    customStyle,
    setCurrentStep,
    handleInterviewStartWithCleanup,
  } = useRoomFlow();

  return (
    <div className="w-full h-full">
      <div className="flex flex-col gap-4 items-center justify-center h-full w-full">
        <div className="flex flex-col gap-4 items-center justify-center h-full w-full">
          <div className="flex flex-row gap-4 items-center justify-center h-full w-full">
            {workspaceSettings?.brandingConfig?.logo && (
              <img
                src={workspaceSettings.brandingConfig.logo}
                alt="logo"
                className="h-10"
              />
            )}
            <h1 className="text-2xl font-bold">
              {workspaceSettings?.brandingConfig?.name || ""}
            </h1>
          </div>
        </div>
        <Card shadow="sm" radius="sm" className="w-full p-8 max-w-[1200px]">
          {showMeetingImmediately ? (
            <Meeting roomName={roomName || ""} style={customStyle} />
          ) : (
            <PreMeeting
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              setInterviewStarted={handleInterviewStartWithCleanup}
              style={customStyle}
            />
          )}
        </Card>
      </div>
    </div>
  );
};
