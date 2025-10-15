import {
  createRoomRequestBodySchema,
  getMeetingTokenRequestBodySchema,
} from "@root/shared/zod-schemas";
import axios, { AxiosError, AxiosInstance } from 'axios';
import { z } from 'zod';
import { ServiceError } from "./service-error.lib";

export class DailyError extends ServiceError {
  constructor(message: string, comingFrom: string) {
    super(message, "Daily::" + comingFrom);
  }
};

class DailyAPI {
  public dailyAxios: AxiosInstance;

  constructor() {
    this.dailyAxios = axios.create({
      baseURL: "https://api.daily.co/v1",
      headers: {
        "Authorization": "Bearer " + process.env.DAILY_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
    });
  }

  public async createRoom(data: z.infer<typeof createRoomRequestBodySchema>) {
    try {
      const response = await this.dailyAxios.post('/rooms', {
        name: data.name,
        properties: {
          ...data.properties,
          exp: Math.floor(Date.now() / 1000) + data.properties.exp,
          enable_screenshare: data.properties.enable_screenshare || true,
          enable_chat: data.properties.enable_chat || true,
          start_video_off: data.properties.start_video_off || true,
          start_audio_off: data.properties.start_audio_off || false,
          enable_hidden_participants: true,
          enable_recording: 'cloud'
        }
      });
      return response.data
    } catch (error: any) {
      if (error instanceof AxiosError) {
        if (error.response?.data.info) {
          throw new DailyError(error.response?.data.info, "createRoom");
        } else {
          throw new DailyError(error.message, "createRoom");
        }
      }
      throw new DailyError(error.message, "createRoom");
    }
  }

  public async updateRoom(roomName: string, data: z.infer<typeof createRoomRequestBodySchema>["properties"]) {
    try {
      const response = await this.dailyAxios.post(`/rooms/${roomName}`, {
        properties: {
          ...data,
          exp: Math.floor(Date.now() / 1000) + data.exp,
          enable_screenshare: data.enable_screenshare || true,
          enable_chat: data.enable_chat || true,
          start_video_off: data.start_video_off || true,
          start_audio_off: data.start_audio_off || false,
          enable_hidden_participants: true,
        }
      });
      return response.data
    } catch (error: any) {
      if (error instanceof AxiosError) {
        if (error.response?.data.info) {
          throw new DailyError(error.response?.data.info, "updateRoom");
        } else {
          throw new DailyError(error.message, "updateRoom");
        }
      }
      throw new DailyError(error.message, "updateRoom");
    }
  }

  public async deleteRoom(roomName: string) {
    try {
      const response = await this.dailyAxios.delete(`/rooms/${roomName}`);

      return response.data;
    } catch (error: any) {
      if (error instanceof AxiosError) {
        if (error.response?.data.info) {
          throw new DailyError(error.response?.data.info, "deleteRoom");
        } else {
          throw new DailyError(error.message, "deleteRoom");
        }
      }
      throw new DailyError(error.message, "deleteRoom");
    }
  }

  public async validateRoom(roomName: string) {
    try {
      const response = await this.dailyAxios.get(`/rooms/${roomName}`);
      return response.data;
    } catch (error: any) {
      console.log(`error`, error);
      if (error instanceof AxiosError) {
        if (error.response?.data.info) {
          throw new DailyError(error.response?.data.info, "validateRoom");
        } else {
          throw new DailyError(error.message, "validateRoom");
        }
      }
      throw new DailyError(error.message, "validateRoom");
    }
  }

  public async getRoomToken(data: z.infer<typeof getMeetingTokenRequestBodySchema>) {
    try {
      const response = await this.dailyAxios.post('/meeting-tokens', { properties: { ...data } });
      return response.data;
    } catch (error: any) {
      if (error instanceof AxiosError) {
        if (error.response?.data.info) {
          throw new DailyError(error.response?.data.info, "getRoomToken");
        } else {
          throw new DailyError(error.message, "getRoomToken");
        }
      }
      throw new DailyError(error.message, "getRoomToken");
    }
  }

  public async getRecording(recordingId: string) {
    try {
      const response = await this.dailyAxios.get(`/recordings/${recordingId}`);
      return response.data;
    } catch (error: any) {
      if (error instanceof AxiosError) {
        if (error.response?.data.info) {
          throw new DailyError(error.response?.data.info, "getRecording");
        } else {
          throw new DailyError(error.message, "getRecording");
        }
      }
      throw new DailyError(error.message, "getRecording");
    }
  }

  public async getRecordingAccessLink(recordingId: string) {
    try {
      const response = await this.dailyAxios.get(`/recordings/${recordingId}/access-link`);
      return response.data;
    } catch (error: any) {
      if (error instanceof AxiosError) {
        if (error.response?.data.info) {
          throw new DailyError(error.response?.data.info, "getRecordingAccessLink");
        } else {
          throw new DailyError(error.message, "getRecordingAccessLink");
        }
      }
      throw new DailyError(error.message, "getRecordingAccessLink");
    }
  }
}

export const daily = new DailyAPI();
