"use client";

import { use } from "react";
import { RoomProvider } from "./provider/room.provider";
import { ContentComponent } from "./components/content.component";

export default function Page({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = use(params);

  return (
    <RoomProvider roomName={interviewId}>
      <ContentComponent />
    </RoomProvider>
  );
}
