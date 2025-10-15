import { Button } from "@root/components/ui/button";
import { FC } from "react";
import { useRoom } from "../../hooks/room.hook";

export const PreMeetingFinalize: FC<{
  next: () => void;
  prev: () => void;
}> = ({ next, prev }) => {
  const { interview } = useRoom();
  return (
    <div className="flex flex-col gap-4 w-full">
      <h1>Everything is set up!</h1>
      <p>You are now ready to start the interview.</p>
      {interview?.introVideoUrl && (
        <div className="rounded-xl overflow-hidden bg-muted border">
          {/* <div className="p-3 text-sm font-medium">Intro Video</div> */}
          <video
            className="w-full h-full object-cover"
            src={interview.introVideoUrl}
            controls
            preload="metadata"
          />
        </div>
      )}
      <div className="flex flex-row items-center justify-between gap-2 w-full">
        <Button onPress={prev} variant="bordered">
          Previous
        </Button>
        <Button onPress={next} variant="solid">
          Next
        </Button>
      </div>
    </div>
  );
};
