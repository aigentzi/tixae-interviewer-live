import { z } from "zod";

export const createRoomRequestBodySchema = z.object({
  name: z
    .string()
    .describe("The name for the room to create."),
  privacy: z
    .enum(["public", "private"])
    .optional()
    .describe("privacy of the room either public room which enables anyone can join room or private room with access to room using room code."),
  properties: z.object({
    nbf: z
      .number()
      .optional()
      .describe("This is a unix timestamp (seconds since the epoch.) Users cannot join a meeting in this room before this time."),
    exp: z
      .number()
      .describe("This is a unix timestamp (seconds since the epoch.) Users cannot join a meeting in this room after this time. NOTE: enter this field as number of seconds needed for meeting and it will be converted to valid date."),
    max_participants: z
      .number()
      .optional()
      .describe("How many people are allowed in a room at the same time."),
    enable_screenshare: z
      .boolean()
      .optional()
      .describe("Sets whether users in a room can screen share during a session. This property cannot be changed after a session starts. For dynamic control over permissions, use the updateParticipant() method to control user permissions."),
    enable_chat: z
      .boolean()
      .optional()
      .describe("Sets whether users in a room can view and send chat messages during the session."),
    enable_shared_chat_history: z
      .boolean()
      .optional()
      .describe("When enabled, newly joined participants in Prebuilt calls will request chat history from remote peers, in order to view chat messages from before they joined."),
    start_audio_off: z
      .boolean()
      .optional()
      .describe("Disable the default behavior of automatically turning on a participant's microphone on a direct join() (i.e. without startCamera() first)."),
    start_video_off: z
      .boolean()
      .optional()
      .describe("Disable the default behavior of automatically turning on a participant's camera on a direct join() (i.e. without startCamera() first)."),
    enable_recording: z
      .enum(["cloud", "local", "raw-tracks"])
      .optional()
      .describe("enables the call recording."),
    enable_advanced_chat: z
      .boolean()
      .optional()
      .describe("Property that gives end users a richer chat experience. This includes: - Emoji reactions to chat messages - Emoji picker in the chat input form - Ability to send a Giphy chat message ⚠️ This flag only applies to Daily Prebuilt. It has no effect when building custom video applications with the Daily call object."),
  }).describe("different properties for the room created using daily.")
});

export const getMeetingTokenRequestBodySchema = z.object({
  room_name: z
    .string()
    .describe("The room for which this token is valid. If room_name isn't set, the token is valid for all rooms in your domain. *You should always set room_name if you are using this token to control access to a meeting."),
  user_name: z
    .string()
    .describe("The user's name in this meeting. The name displays in the user interface when the user is muted or has turned off the camera, and in the chat window. This username is also saved in the meeting events log."),
  exp: z
    .number()
    .optional()
    .describe("This is a unix timestamp (seconds since the epoch.) Users cannot join a meeting with this token after this time. Daily strongly recommends adding an exp. NOTE: enter this field as number of seconds needed for meeting and it will be converted to valid date."),
  enable_screenshare: z
    .boolean()
    .optional()
    .describe("Sets whether or not the user is allowed to screen share. This setting applies for the duration of the meeting. If you're looking to dynamically control whether a user can screen share during a meeting, then use the permissions token property. Default: true"),
  start_video_off: z
    .boolean()
    .optional()
    .describe("Disable the default behavior of automatically turning on a participant's camera on a direct join() (i.e. without startCamera() first). Default: false"),
  start_audio_off: z
    .boolean()
    .optional()
    .describe("Disable the default behavior of automatically turning on a participant's microphone on a direct join() (i.e. without startCamera() first). Default: false"),
  enable_recording: z
    .enum(["cloud", "local", "raw-tracks"])
    .optional()
    .describe("enables the call recording."),
  permissions: z.object({
    hasPresence: z
      .boolean()
      .optional()
      .describe("Whether the participant appears as 'present' in the call, i.e. whether they appear in participants()."),
    canSend: z
      .union([z.boolean(), z.array(z.enum(["audio", "video", "screenVideo", "screenAudio"]))])
      .optional()
      .describe("Which types of media a participant should be permitted to send Possible values: (audio, video, screenVideo, screenAudio). Note: if you want to allow all media types, you can set it to true."),
    canAdmin: z
      .union([z.boolean(), z.array(z.enum(["participants", "streaming", "transcription"]))])
      .optional()
      .describe("Which admin tasks a participant is permitted to do. Possible values: (participants, streaming, transcription) Note: if you want to allow all admin tasks, you can set it to true. and if you want to allow specific admin tasks, you can set it to an array of strings. If you want to disable all admin tasks, you can set it to false."),
  }).optional().describe("Permissions for the user."),
});

export const roomMessageSchema = z.object({
  content: z
    .string()
    .describe("The content of the message."),
  role: z
    .enum(["user", "assistant"])
    .describe("The role of the message (user or assistant)."),
  ts: z
    .date()
    .optional()
    .describe("The timestamp of the message (in milliseconds)."),
});

export type RoomMessage = z.infer<typeof roomMessageSchema>;

export const participantInfoSchema = z.object({
  id: z
    .string()
    .describe("The id of the participant."),
  name: z
    .string()
    .describe("The name of the participant."),
  role: z
    .enum(["interviewee", "assistant", "owner"])
    .describe("The role of the participant (interviewee, assistant, owner)."),
  isActive: z
    .boolean()
    .describe("Whether the participant is active."),
  joinedAt: z
    .date()
    .optional()
    .describe("The timestamp of the participant's join (in milliseconds)."),
});

export type ParticipantInfo = z.infer<typeof participantInfoSchema>;
