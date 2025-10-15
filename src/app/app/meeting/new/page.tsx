"use client";

import { createId } from "@paralleldrive/cuid2";
import { api } from "@root/trpc/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaCheck, FaCopy, FaSpinner } from "react-icons/fa";

export default function NewMeetingPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState('');
  const router = useRouter();

  const createRoomMutation = api.daily.createRoom.useMutation({
    onSuccess: (data) => {
      setRoomUrl(data.url);
      setRoomName(data.name);
      setIsCreating(false);
    },
    onError: (error) => {
      setError(error.message);
      setIsCreating(false);
    },
  });

  useEffect(() => {
    // Auto-generate a username if not set
    if (!username) {
      setUsername(`User-${Math.floor(Math.random() * 10000)}`);
    }
  }, []);

  const copyToClipboard = () => {
    if (roomUrl) {
      navigator.clipboard.writeText(roomUrl).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        },
        (err) => {
          console.error('Could not copy text: ', err);
        }
      );
    }
  };

  const createRoom = async () => {
    setIsCreating(true);
    setError(null);

    createRoomMutation.mutate({
      name: `tixae-interview-${createId()}`,
      properties: {
        exp: parseInt(process.env.NEXT_PUBLIC_MAX_ROOM_MINUTES || "60"),
      }
    });
  };

  const joinMeeting = () => {
    if (roomName && username) {
      router.push(`/app/meeting/${roomName}?username=${encodeURIComponent(username)}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-100 to-white">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Create a New Meeting</h1>

        {!roomUrl ? (
          <div>
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
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
              onClick={createRoom}
              disabled={isCreating || !username}
              className={`w-full flex justify-center items-center px-4 py-2 bg-primary text-white rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${(isCreating || !username) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {isCreating ? (
                <>
                  <FaSpinner className="animate-spin mr-2" /> Creating Meeting...
                </>
              ) : (
                'Create Meeting'
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-6 p-3 bg-gray-100 rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-1">Meeting URL:</p>
              <div className="flex items-center">
                <input
                  type="text"
                  readOnly
                  value={roomUrl}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-2 border border-gray-300 border-l-0 rounded-r-md shadow-sm bg-gray-50 hover:bg-gray-100 focus:outline-none"
                  title="Copy to clipboard"
                >
                  {copied ? <FaCheck className="text-green-500" /> : <FaCopy />}
                </button>
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              <button
                onClick={joinMeeting}
                className="w-full px-4 py-2 bg-primary text-white rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Join Meeting
              </button>

              <button
                onClick={() => {
                  setRoomUrl(null);
                  setRoomName(null);
                }}
                className="w-full px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Create Another Meeting
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-primary hover:text-blue-600">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
