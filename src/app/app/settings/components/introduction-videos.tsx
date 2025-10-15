"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { api } from "@root/trpc/react";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { z } from "zod";
import { introductionVideoScheme } from "@root/shared/schemes/workspace-settings.schemes";
import { Button } from "@root/components/ui/button";
import { Label } from "@root/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { Input, Progress } from "@heroui/react";
import { useUploader } from "@root/app/hooks/uploader.hook";
import { Info, Loader2, Square, Timer, Upload, Video, X } from "lucide-react";
import InlineNotification from "@root/app/components/InlineNotification";

// Constants for video upload limits
const MAX_FILE_SIZE_MB = 100;
const LARGE_FILE_THRESHOLD_MB = 10;
const MAX_SECONDS = 120;

async function uploadToVercel(file: File): Promise<string> {
  const { upload } = (await import("@vercel/blob/client")) as any;
  const result = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
  });
  return result.url as string;
}

export default function IntroductionVideos() {
  const t = useTranslations("settings");
  const { activeWorkspace, setActiveWorkspace } = useActiveWorkspace();

  const [video, setVideo] = useState<z.infer<typeof introductionVideoScheme>>(
    activeWorkspace?.settings?.introductionVideo || {
      url: null,
      durationSec: null,
      title: "",
    }
  );
  const [recording, setRecording] = useState(false);
  const [time, setTime] = useState(0);
  const [videos, setVideos] = useState<
    z.infer<typeof introductionVideoScheme>[]
  >(activeWorkspace?.settings?.introductionVideos || []);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  const updateMutation = api.workspace.update.useMutation({
    onSuccess: () => {
      setNotification({
        type: "success",
        message: t("introVideoSaved", "Introduction video saved"),
      });
    },
    onError: (e) => setNotification({ type: "error", message: e.message }),
  });

  useEffect(() => {
    setVideo(
      activeWorkspace?.settings?.introductionVideo || {
        url: null,
        durationSec: null,
        title: "",
      }
    );
    setVideos(activeWorkspace?.settings?.introductionVideos || []);
  }, [
    activeWorkspace?.settings?.introductionVideo,
    activeWorkspace?.settings?.introductionVideos,
  ]);

  const format = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0"
    )}`;

  const {
    uploading,
    uploadProgress,
    getRootProps,
    getInputProps,
    isDragActive,
  } = useUploader("introduction-video", {
    maxSize: MAX_FILE_SIZE_MB * 1024 * 1024, // 100MB limit
    accept: {
      "video/*": [".mp4", ".webm", ".mov", ".avi", ".mkv"],
    },
    customUpload: async (file) => {
      // Validate file size first
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        throw new Error(
          `File size (${fileSizeMB.toFixed(
            1
          )}MB) exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB`
        );
      }

      // Validate duration before uploading
      const tempUrl = URL.createObjectURL(file);
      try {
        const probe = document.createElement("video");
        probe.preload = "metadata";
        probe.src = tempUrl;
        const duration = await new Promise<number>((resolve, reject) => {
          probe.onloadedmetadata = () =>
            resolve(Math.round(probe.duration || 0));
          probe.onerror = () => reject(new Error("Failed to load metadata"));
        });
        if (duration > MAX_SECONDS) {
          throw new Error(t("max2min", "Maximum length is 2 minutes"));
        }

        // Upload directly to Vercel Blob to bypass server limits
        const url = await uploadToVercel(file);
        return url;
      } finally {
        URL.revokeObjectURL(tempUrl);
      }
    },
    onSuccess: async (url, file) => {
      try {
        // Recompute duration client-side (fast metadata probe)
        let duration = 0;
        if (file) {
          const temp = URL.createObjectURL(file);
          const probe = document.createElement("video");
          probe.preload = "metadata";
          probe.src = temp;
          duration = await new Promise<number>((resolve, reject) => {
            probe.onloadedmetadata = () =>
              resolve(Math.round(probe.duration || 0));
            probe.onerror = () => reject(new Error("Failed to load metadata"));
          });
          URL.revokeObjectURL(temp);
        } else {
          const probe = document.createElement("video");
          probe.preload = "metadata";
          probe.src = url;
          await new Promise<void>((resolve, reject) => {
            probe.onloadedmetadata = () => resolve();
            probe.onerror = () => reject(new Error("Failed to load metadata"));
          });
          duration = Math.round(probe.duration || 0);
        }
        const item = {
          url,
          durationSec: duration,
          title: video?.title || "",
          createdAt: new Date(),
        } as z.infer<typeof introductionVideoScheme>;
        setVideo((prev) => ({ ...prev, url, durationSec: duration }));
        setVideos((prev) => [item, ...prev]);
        setNotification({
          type: "success",
          message: t("videoUploaded", "Video uploaded"),
        });
      } catch {
        const item = {
          url,
          durationSec: undefined,
          title: video?.title || "",
          createdAt: new Date(),
        } as z.infer<typeof introductionVideoScheme>;
        setVideo((prev) => ({ ...prev, url }));
        setVideos((prev) => [item, ...prev]);
        setNotification({
          type: "success",
          message: t("videoUploaded", "Video uploaded"),
        });
      }
    },
    maxFiles: 1,
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      streamRef.current = stream;
      // Attach live preview
      try {
        if (previewRef.current) {
          (previewRef.current as any).srcObject = stream;
          await previewRef.current.play().catch(() => {});
        }
      } catch {}
      const mimeType = MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp9,opus"
      )
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";
      const rec = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) =>
        e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach((t) => t.stop());
        if (previewRef.current) {
          try {
            previewRef.current.pause();
          } catch {}
          (previewRef.current as any).srcObject = null;
        }

        // Upload recorded blob using appropriate upload method
        try {
          const file = new File([blob], `intro-${Date.now()}.webm`, {
            type: blob.type,
          });

          const fileSizeMB = file.size / (1024 * 1024);
          let uploadUrl: string;

          // Upload directly to Vercel Blob to bypass server limits
          uploadUrl = await uploadToVercel(file);

          const item = {
            url: uploadUrl,
            durationSec: Math.min(time, MAX_SECONDS),
            title: video?.title || "",
            createdAt: new Date(),
          } as z.infer<typeof introductionVideoScheme>;
          setVideo(item);
          setVideos((prev) => [item, ...prev]);
          setNotification({
            type: "success",
            message: t("videoRecorded", "Video recorded and uploaded"),
          });
        } catch (e: any) {
          setNotification({
            type: "error",
            message: e?.message || "Upload failed",
          });
        } finally {
          setRecording(false);
          setTime(0);
        }
      };
      rec.start();
      setRecording(true);
      setTime(0);
      timerRef.current = setInterval(() => {
        setTime((s) => {
          if (s + 1 >= MAX_SECONDS) {
            rec.stop();
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      setNotification({
        type: "error",
        message: t("cannotAccessDevices", "Cannot access camera/microphone"),
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(activeWorkspace?.settings?.introductionVideo || null) !==
        JSON.stringify(video || null) ||
      JSON.stringify(activeWorkspace?.settings?.introductionVideos || []) !==
        JSON.stringify(videos || [])
    );
  }, [
    activeWorkspace?.settings?.introductionVideo,
    activeWorkspace?.settings?.introductionVideos,
    video,
    videos,
  ]);

  const save = () => {
    if (!activeWorkspace?.id) return;
    if (video?.durationSec && video.durationSec > MAX_SECONDS) {
      setNotification({
        type: "error",
        message: t("max2min", "Maximum length is 2 minutes"),
      });
      return;
    }
    updateMutation.mutate({
      workspaceId: activeWorkspace.id,
      settings: {
        ...activeWorkspace.settings,
        introductionVideo: {
          url: video?.url || null,
          durationSec: video?.durationSec || null,
          title: video?.title || "",
        },
        introductionVideos: videos,
      },
    });
    setActiveWorkspace({
      ...activeWorkspace,
      settings: {
        ...activeWorkspace.settings,
        introductionVideo: {
          url: video?.url || null,
          durationSec: video?.durationSec || null,
          title: video?.title || "",
        },
        introductionVideos: videos,
      },
      updatedAt: new Date(),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {t("introductionVideos", "Introduction Videos")}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {t(
              "introVideosDesc",
              "Record or upload a short introduction video (max 2 minutes) to welcome candidates."
            )}
          </p>
        </div>
        <Button
          color="primary"
          size="sm"
          onPress={save}
          isDisabled={!hasChanges}
          isLoading={updateMutation.isPending}
        >
          {t("save", "Save")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload */}
        <Card className="w-full">
          <CardHeader className="flex flex-row items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>{t("upload", "Upload")}</CardTitle>
              <CardDescription>
                {t(
                  "uploadDesc",
                  "Drag & drop your video or choose a file (MP4/WEBM/MOV, max 2 minutes)"
                )}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {video?.url ? (
              <div className="relative w-full overflow-hidden rounded-xl bg-muted">
                <video
                  controls
                  className="w-full h-64 object-cover"
                  src={video.url || undefined}
                  preload="metadata"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    variant="solid"
                    color="danger"
                    size="sm"
                    onPress={() =>
                      setVideo({ url: null, durationSec: null, title: "" })
                    }
                  >
                    <X className="w-4 h-4 mr-1" /> {t("remove", "Remove")}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 h-64 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary hover:bg-primary/5"
                }`}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isDragActive
                      ? t("dropHere", "Drop your video here")
                      : t("dragHere", "Drag & drop your video here")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("orClick", "or click to choose a file")}
                  </p>
                </div>
                <input
                  id="introduction-video-file-input"
                  className="hidden"
                  {...getInputProps()}
                />
              </div>
            )}

            {uploading && (
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <Progress
                  aria-label="Upload"
                  value={uploadProgress}
                  className="flex-1"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("title", "Title")}</Label>
                <Input
                  value={video?.title || ""}
                  onValueChange={(v) =>
                    setVideo((prev) => ({ ...(prev || {}), title: v }))
                  }
                  variant="bordered"
                  color="primary"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("duration", "Duration")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${video?.durationSec || 0}s`}
                    variant="bordered"
                  />
                  <div className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    <Timer className="w-3 h-3" /> 02:00 {t("max", "max")}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5" />
              <span>
                {t(
                  "guidelines",
                  "Guidelines: MP4/WEBM/MOV • Max 2 minutes • Recommend 720p or lower for faster upload"
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Record */}
        <Card className="w-full">
          <CardHeader className="flex flex-row items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>{t("record", "Record")}</CardTitle>
              <CardDescription>
                {t(
                  "recordDesc",
                  "Use your camera and microphone to record an introduction (auto‑stops at 2 minutes)"
                )}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {recording ? (
              <div className="relative w-full overflow-hidden rounded-xl bg-black">
                <video
                  ref={previewRef}
                  className="w-full h-64 object-cover"
                  muted
                  playsInline
                  autoPlay
                />
              </div>
            ) : (
              <div className="relative w-full h-64 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Video className="w-6 h-6" />
                  <p className="text-xs text-center px-4">
                    {t(
                      "cameraPreviewPlaceholder",
                      "Camera preview will appear here when recording starts"
                    )}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              {!recording ? (
                <Button variant="bordered" onPress={startRecording}>
                  <Video className="w-4 h-4 mr-2" />{" "}
                  {t("startRecording", "Start Recording")}
                </Button>
              ) : (
                <Button
                  variant="bordered"
                  className="text-red-600"
                  onPress={stopRecording}
                >
                  <Square className="w-4 h-4 mr-2" /> {t("stop", "Stop")}
                </Button>
              )}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm">
                <Timer className="w-4 h-4" /> {format(time)} / 02:00
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                "recordingInfo",
                "Recording stops automatically at 2 minutes."
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* inline preview handled inside Upload card */}

      {/* Gallery */}
      {videos && videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {videos.map((v, idx) => (
            <Card key={(v.url || "") + idx}>
              <CardHeader className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    {v.title || t("untitled", "Untitled")}
                  </CardTitle>
                  <CardDescription>
                    {(v.durationSec || 0) + "s"}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="bordered"
                  onPress={() =>
                    setVideos((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  {t("remove", "Remove")}
                </Button>
              </CardHeader>
              <CardContent>
                <video
                  controls
                  className="w-full rounded-lg"
                  src={v.url || undefined}
                  preload="metadata"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
