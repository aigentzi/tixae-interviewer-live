import { useState, useCallback, useRef } from "react";
import { api } from "@root/trpc/react";
import { useRoom } from "./room.hook";

export const useMeeting = () => {
  const { username, isOwner } = useRoom();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use ref to store the current mutation to avoid dependency issues
  const mutationRef = useRef<any>(null);

  const getRoomTokenMutation = api.daily.getRoomToken.useMutation({
    onSuccess: (data) => {
      setToken(data.token);
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  // Store the current mutation in ref
  mutationRef.current = getRoomTokenMutation;

  /**
   * Initialize the room with optimized error handling and loading states
   */
  const initializeRoom = useCallback(async (roomNameStr: string, usernameStr: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Getting room token", roomNameStr, usernameStr);

      // Use the ref to avoid dependency issues
      await mutationRef.current?.mutateAsync({
        room_name: roomNameStr,
        user_name: usernameStr,
        permissions: {
          hasPresence: isOwner ? false : true,
        },
      });

      // Construct room URL
      const roomUrlStr = `https://${process.env.NEXT_PUBLIC_DAILY_CO_DOMAIN || "daily.co"}/${roomNameStr}`;
      setRoomUrl(roomUrlStr);
    } catch (error) {
      console.error("Error initializing room:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to initialize meeting room"
      );
    } finally {
      setIsLoading(false);
    }
  }, [isOwner]); // Only depend on isOwner, not the mutation

  return {
    token,
    isLoading,
    roomUrl,
    error,
    initializeRoom,
    setError,
  };
};
