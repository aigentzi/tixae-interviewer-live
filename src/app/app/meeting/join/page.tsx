"use client";

import { api } from "@root/trpc/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FaSpinner } from "react-icons/fa";

export default function JoinMeetingPage() {
  const [roomName, setRoomName] = useState("");
  const [username, setUsername] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Mutations for rooms
  const validateRoomMutation = api.daily.validateRoom.useMutation({
    onSuccess: (data) => {
      // Check if this is a reschedule response
      if ("rescheduleNeeded" in data && data.rescheduleNeeded) {
        setError(
          "This interview needs to be rescheduled. Please contact the organizer.",
        );
        return;
      }

      // Normal room response - we know it has name property after reschedule check
      const roomData = data as { name: string };
      router.push(
        `/app/meeting/${roomData.name}?username=${encodeURIComponent(username)}`,
      );
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const validateAndJoinRoom = async (e: FormEvent) => {
    e.preventDefault();

    if (!roomName) {
      setError("Please enter a room code");
      return;
    }

    if (!username) {
      setError("Please enter your name");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      await validateRoomMutation.mutateAsync({ roomName });
    } catch (error) {
      console.error("Error validating room:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to validate meeting room",
      );
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-100 to-white">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Join a Meeting</h1>

        <form onSubmit={validateAndJoinRoom}>
          <div className="mb-4">
            <label
              htmlFor="roomName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Room Code
            </label>
            <input
              type="text"
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Enter room code"
              required
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Your Name
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Enter your name"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isValidating || !roomName || !username}
            className={`w-full flex justify-center items-center px-4 py-2 bg-primary text-white rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
              isValidating || !roomName || !username
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {isValidating ? (
              <>
                <FaSpinner className="animate-spin mr-2" /> Joining...
              </>
            ) : (
              "Join Meeting"
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-primary hover:text-blue-600">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
