import { useState, useRef, useEffect, useCallback } from "react";

export const useMediaDevices = () => {
  // Camera state
  const [cameraStatus, setCameraStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const cameraRef = useRef<HTMLVideoElement>(null);

  // Audio state
  const [audioStatus, setAudioStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>(
    [],
  );
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isAudioActive, setIsAudioActive] = useState(false);

  // Refs for audio visualization
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Get available media devices
   */
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) =>
          device.kind === "videoinput" && device.deviceId !== "default",
      );
      const audioDevices = devices.filter(
        (device) =>
          device.kind === "audioinput" && device.deviceId !== "default",
      );

      // Only update if we have devices with proper labels or if we don't have any devices yet
      if (
        videoDevices.length > 0 &&
        (videoDevices[0].label || cameras.length === 0)
      ) {
        setCameras(videoDevices);

        // Set default camera if none selected
        if (!selectedCameraId && videoDevices.length > 0) {
          setSelectedCameraId(videoDevices[0].deviceId);
        }
      }

      if (
        audioDevices.length > 0 &&
        (audioDevices[0].label || audioInputDevices.length === 0)
      ) {
        setAudioInputDevices(audioDevices);

        // Set default microphone if none selected
        if (!selectedDeviceId && audioDevices.length > 0) {
          setSelectedDeviceId(audioDevices[0].deviceId);
        }
      }

      console.log("Devices updated:", {
        cameras: videoDevices.length,
        microphones: audioDevices.length,
        hasLabels: videoDevices.length > 0 ? !!videoDevices[0].label : false,
      });
    } catch (error) {
      console.error("Error getting devices:", error);
    }
  }, [
    selectedCameraId,
    selectedDeviceId,
    cameras.length,
    audioInputDevices.length,
  ]);

  /**
   * Start camera preview
   */
  const handlePreviewCamera = useCallback(() => {
    setCameraStatus("connecting");
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (cameraRef.current) {
          cameraRef.current.srcObject = stream;
          cameraRef.current.play();
          setCameraStatus("connected");
          // Refresh device list after permission is granted
          getDevices();
        }
      })
      .catch((error) => {
        console.error("Error accessing camera:", error);
        setCameraStatus("disconnected");
      });
  }, [getDevices]);

  /**
   * Select specific camera
   */
  const selectCamera = useCallback((deviceId: string) => {
    setSelectedCameraId(deviceId);
    navigator.mediaDevices
      .getUserMedia({ video: { deviceId: deviceId } })
      .then((stream) => {
        console.log("Selected camera:", deviceId);
        if (cameraRef.current) {
          cameraRef.current.srcObject = stream;
          cameraRef.current.play();
          setCameraStatus("connected");
        }
      })
      .catch((error) => {
        console.error("Error selecting camera:", error);
        setCameraStatus("disconnected");
      });
  }, []);

  /**
   * Start audio visualization
   */
  const startAudioVisualization = useCallback(async () => {
    try {
      // Stop any existing stream
      stopAudioVisualization();

      const constraints = {
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 256;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.6;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average amplitude
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalizedLevel = Math.min(100, (average / 255) * 100);

        setAudioLevel(normalizedLevel);
        setIsAudioActive(normalizedLevel > 5);

        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
      setAudioStatus("connected");
      // Refresh device list after permission is granted
      getDevices();
    } catch (error) {
      console.error("Error starting audio visualization:", error);
      setAudioStatus("disconnected");
    }
  }, [selectedDeviceId, getDevices]);

  /**
   * Stop audio visualization
   */
  const stopAudioVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setAudioLevel(0);
    setIsAudioActive(false);
    setAudioStatus("disconnected");
  }, []);

  /**
   * Stop camera
   */
  const stopCamera = useCallback(() => {
    if (cameraRef.current && cameraRef.current.srcObject) {
      const stream = cameraRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      cameraRef.current.srcObject = null;
    }
    setCameraStatus("disconnected");
  }, []);

  /**
   * Select microphone
   */
  const selectMicrophone = useCallback(
    (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      // Restart audio with new device
      if (audioStatus === "connected") {
        startAudioVisualization();
      }
    },
    [audioStatus, startAudioVisualization],
  );

  /**
   * Request permissions for both camera and microphone to get proper device labels
   */
  const requestPermissions = useCallback(async () => {
    try {
      // Request both permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Stop the stream immediately as we just wanted permissions
      stream.getTracks().forEach((track) => track.stop());

      // Refresh device list now that we have permissions
      await getDevices();

      return true;
    } catch (error) {
      console.error("Error requesting permissions:", error);
      return false;
    }
  }, [getDevices]);

  // Initialize devices on mount and listen for device changes
  useEffect(() => {
    getDevices();

    // Listen for device changes (connect/disconnect)
    const handleDeviceChange = () => {
      console.log("Device change detected, refreshing device list...");
      getDevices();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange,
      );
    };
  }, [getDevices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioVisualization();
      stopCamera();
    };
  }, [stopAudioVisualization, stopCamera]);

  return {
    // Camera
    cameraStatus,
    cameras,
    selectedCameraId,
    cameraRef,
    handlePreviewCamera,
    selectCamera,
    stopCamera,

    // Audio
    audioStatus,
    audioLevel,
    audioInputDevices,
    selectedDeviceId,
    isAudioActive,
    startAudioVisualization,
    stopAudioVisualization,
    selectMicrophone,

    // General
    getDevices,
    requestPermissions,
  };
};
