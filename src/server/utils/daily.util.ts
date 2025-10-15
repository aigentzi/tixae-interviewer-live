import { daily, DailyError } from "@root/lib/daily.lib";

// Helper function to safely delete Daily rooms
export const safeDailyRoomDeletion = async (roomId: string) => {
  try {
    await daily.deleteRoom(roomId);
    console.log(`Successfully deleted Daily room: ${roomId}`);
  } catch (error) {
    if (error instanceof DailyError && error.message.includes("not found")) {
      console.log(
        `Daily room ${roomId} not found (likely already expired or never created)`
      );
    } else {
      console.error(`Error deleting Daily room ${roomId}:`, error);
    }
  }
};
