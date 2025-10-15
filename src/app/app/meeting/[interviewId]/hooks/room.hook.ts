import { RoomContext, RoomContextType } from "../context/room.context";
import { useContext } from "react";

export const useRoom = () => {
  const context = useContext(RoomContext);

  if (!context) {
    throw new Error("useRoom must be used within a RoomProvider");
  }

  return context;
};
