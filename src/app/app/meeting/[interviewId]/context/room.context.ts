import {
  Interview,
  JobProfile,
  RoomMessage,
  WorkspaceSettings,
} from "@root/shared/zod-schemas";
import { Dispatch, SetStateAction, createContext } from "react";

export interface RoomContextType {
  roomName: string | null;
  setRoomName: Dispatch<SetStateAction<string | null>>;
  username: string;
  setUsername: Dispatch<SetStateAction<string>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  interview: Interview | null;
  setInterview: Dispatch<SetStateAction<Interview | null>>;
  refetchInterview: () => void;
  validateRoom: (roomName: string) => void;
  createRoomToken: (roomName: string, username: string) => void;
  interviewLoading: boolean;
  stripeVerificationSessionId: string;
  setStripeVerificationSessionId: Dispatch<SetStateAction<string>>;
  isOwner: boolean;
  roomMessages: RoomMessage[];
  setRoomMessages: Dispatch<SetStateAction<RoomMessage[]>>;
  workspaceSettings: WorkspaceSettings | null;
  agentId: string;
  jobProfile: JobProfile | null;
  rescheduleNeeded: boolean;
  resetSteps: () => void;
  isRescheduling: boolean;
  setIsRescheduling: Dispatch<SetStateAction<boolean>>;
}

const defaultRoomContext: RoomContextType = {
  roomName: "",
  setRoomName: () => {},
  username: "",
  setUsername: () => {},
  error: null,
  setError: () => {},
  interview: null,
  setInterview: () => {},
  refetchInterview: () => {},
  validateRoom: (roomName: string) => {},
  createRoomToken: (roomName: string, username: string) => {},
  roomMessages: [],
  setRoomMessages: () => {},
  interviewLoading: false,
  stripeVerificationSessionId: "",
  setStripeVerificationSessionId: () => {},
  isOwner: false,
  workspaceSettings: null,
  agentId: "",
  jobProfile: null,
  rescheduleNeeded: false,
  resetSteps: () => {},
  isRescheduling: false,
  setIsRescheduling: () => {},
};

export const RoomContext = createContext<RoomContextType>(defaultRoomContext);
