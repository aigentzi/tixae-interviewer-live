import { useState, useCallback, useRef, useEffect } from "react";

export function useVoicePreview() {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  const playVoice = useCallback(
    async (
      voiceId: string,
      provider: string,
      sampleText: string = "Hi, how are you today?",
    ) => {
      if (!voiceId) {
        return;
      }

      // If already playing this voice, pause it
      if (currentlyPlaying === voiceId && audioElementsRef.current[voiceId]) {
        audioElementsRef.current[voiceId].pause();
        setCurrentlyPlaying(null);
        return;
      }

      // Stop any currently playing audio
      if (currentlyPlaying && audioElementsRef.current[currentlyPlaying]) {
        audioElementsRef.current[currentlyPlaying].pause();
      }

      setIsLoading(voiceId);

      try {
        // If we already have this audio element, just play it
        if (audioElementsRef.current[voiceId]) {
          audioElementsRef.current[voiceId].play();
          setCurrentlyPlaying(voiceId);
          setIsLoading(null);
          return;
        }

        // Generate the audio URL using our voice preview API
        const audioUrl = `/api/voice-preview?provider=${encodeURIComponent(provider)}&voiceId=${encodeURIComponent(voiceId)}&sampleText=${encodeURIComponent(sampleText)}`;

        const audio = new Audio(audioUrl);

        // Add event listeners
        audio.addEventListener("canplay", () => {
          audioElementsRef.current[voiceId] = audio;
          setCurrentlyPlaying(voiceId);
          setIsLoading(null);
          audio.play();
        });

        audio.addEventListener("ended", () => {
          setCurrentlyPlaying(null);
        });

        audio.addEventListener("error", (e) => {
          console.error("Audio playback error:", e);
          setIsLoading(null);
        });

        // Load the audio
        audio.load();
      } catch (error) {
        console.error("Voice preview error:", error);
        setIsLoading(null);
      }
    },
    [currentlyPlaying],
  );

  const stopAll = useCallback(() => {
    Object.values(audioElementsRef.current).forEach((audio) => {
      audio.pause();
    });
    setCurrentlyPlaying(null);
  }, []);

  const cleanup = useCallback(() => {
    Object.values(audioElementsRef.current).forEach((audio) => {
      audio.pause();
      audio.src = "";
    });
    audioElementsRef.current = {};
    setCurrentlyPlaying(null);
    setIsLoading(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    playVoice,
    stopAll,
    cleanup,
    currentlyPlaying,
    isLoading,
    isPlaying: useCallback(
      (voiceId: string) => currentlyPlaying === voiceId,
      [currentlyPlaying],
    ),
    isLoadingVoice: useCallback(
      (voiceId: string) => isLoading === voiceId,
      [isLoading],
    ),
  };
}
