import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";
import { api } from "@root/trpc/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@root/components/ui/button";
import { IoFilter } from "react-icons/io5";
import { RiPauseFill, RiPlayFill } from "react-icons/ri";
import { MdRefresh } from "react-icons/md";
import InlineNotification from "@root/app/components/InlineNotification";
import { CustomInputWithLabel } from "@root/app/components/custom-input-with-label";
import { ScrollArea } from "@root/components/ui/scroll-area";
import { Badge } from "@root/components/ui/badge";
import { languageMap } from "@root/shared/defaults";

// Reusable flag component
export const FlagImage = ({ countryCode }: { countryCode: string }) => (
  <img
    src={`https://flagcdn.com/16x12/${countryCode}.png`}
    srcSet={`https://flagcdn.com/32x24/${countryCode}.png 2x, https://flagcdn.com/48x36/${countryCode}.png 3x`}
    width="16"
    height="12"
    alt={countryCode}
    className="inline-block mr-1"
  />
);

export function VoicesSelection({
  onUpdateSettings,
  selectedVoice,
}: {
  onUpdateSettings: (key: string, value: string) => void;
  selectedVoice: string;
}) {
  // States and refs
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sampleText, setSampleText] = useState("Hello, how are you?");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<{
    accent?: string;
    useCase?: string;
    gender?: string;
    language?: string;
  }>({});
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{
    [key: string]: HTMLAudioElement;
  }>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadedVoices, setLoadedVoices] = useState<Set<string>>(new Set());
  const [preparingVoices, setPreparingVoices] = useState<Set<string>>(
    new Set()
  );
  const [availableFilters, setAvailableFilters] = useState<{
    [key: string]: string[];
  }>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    mutate: getAudioLibrary,
    data: voices,
    isPending: isLoading,
  } = api.tixae.getAudioLibrary.useMutation({
    onSuccess: (data) => {
      if (data && data.length > 0) {
        const newFilters = data.reduce((acc, voice) => {
          Object.entries(voice.filters).forEach(([key, value]) => {
            if (value && !acc[key]?.includes(value as string)) {
              acc[key] = [...(acc[key] || []), value as string];
            }
          });
          return acc;
        }, {} as { [key: string]: string[] });

        setAvailableFilters(newFilters);
      }
      setIsRefreshing(false);
    },
    onError: (error) => {
      console.error(error);
      setIsRefreshing(false);
    },
  });

  const handleVoiceSelect = (voice: string) => {
    onUpdateSettings("selectedVoice", voice);
  };

  const fetchVoices = () => {
    // Stop any currently playing audio when refreshing samples
    if (currentlyPlaying && audioElements[currentlyPlaying]) {
      audioElements[currentlyPlaying].pause();
      setCurrentlyPlaying(null);
    }

    // Set refreshing flag to distinguish between initial load and refresh
    setIsRefreshing(true);

    // Reset loaded voices since we're changing the sample text
    setLoadedVoices(new Set());
    setAudioElements({});

    getAudioLibrary({
      sampleText,
    });
  };

  const loadAndPlayVoice = (voiceId: string, previewUrl: string) => {
    // If already loaded with current text, just play it
    if (loadedVoices.has(voiceId) && audioElements[voiceId]) {
      if (currentlyPlaying === voiceId) {
        // If already playing, pause it
        audioElements[voiceId].pause();
        setCurrentlyPlaying(null);
      } else {
        // Stop any currently playing audio
        if (currentlyPlaying && audioElements[currentlyPlaying]) {
          audioElements[currentlyPlaying].pause();
        }

        // Play this voice
        audioElements[voiceId].play();
        setCurrentlyPlaying(voiceId);
      }
      return;
    }

    // If voice is currently being prepared, do nothing
    if (preparingVoices.has(voiceId)) {
      return;
    }

    // Add to preparing set
    setPreparingVoices((prev) => {
      const newSet = new Set(prev);
      newSet.add(voiceId);
      return newSet;
    });

    // Stop any currently playing audio
    if (currentlyPlaying && audioElements[currentlyPlaying]) {
      audioElements[currentlyPlaying].pause();
      setCurrentlyPlaying(null);
    }

    // Create new audio element for this voice
    const audioElement = new Audio(previewUrl);

    // Add event listeners
    audioElement.addEventListener("canplaythrough", () => {
      // Ready to play - update states
      setLoadedVoices((prev) => {
        const newSet = new Set(prev);
        newSet.add(voiceId);
        return newSet;
      });

      setPreparingVoices((prev) => {
        const newSet = new Set(prev);
        newSet.delete(voiceId);
        return newSet;
      });

      // Start playing
      audioElement.play();
      setCurrentlyPlaying(voiceId);
    });

    audioElement.addEventListener("ended", () => {
      setCurrentlyPlaying(null);
    });

    audioElement.addEventListener("error", () => {
      setPreparingVoices((prev) => {
        const newSet = new Set(prev);
        newSet.delete(voiceId);
        return newSet;
      });

      console.error("Error loading audio for voice:", voiceId);
    });

    // Store the audio element
    setAudioElements((prev) => ({ ...prev, [voiceId]: audioElement }));

    // Start loading the audio
    audioElement.load();
  };

  const handleSampleTextChange = (text: string) => {
    setSampleText(text);
    setIsTyping(true);

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer for 1000ms
    debounceTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      if (text.trim()) {
        // Reset loaded voices since sample text changed
        setLoadedVoices(new Set());
        setPreparingVoices(new Set());
        setAudioElements({});
        if (currentlyPlaying) {
          setCurrentlyPlaying(null);
        }
        fetchVoices();
      }
    }, 1000);
  };

  useEffect(() => {
    fetchVoices();

    // Clean up debounce timer on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Clean up any playing audio
      Object.values(audioElements).forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
    };
  }, []);

  useEffect(() => {
    if (voices && voices.length > 0 && !selectedVoice) {
      onUpdateSettings("selectedVoice", voices[0].voiceId);
    }
  }, [voices]);

  const filteredVoices = useMemo(() => {
    return voices?.filter((voice) => {
      const matchesSearch =
        voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voice.voiceId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilters = Object.entries(selectedFilters).every(
        ([key, value]) =>
          !value || voice.filters[key as keyof typeof voice.filters] === value
      );

      return matchesSearch && matchesFilters;
    });
  }, [voices, searchQuery, selectedFilters]);

  // Use the stored filters instead of recalculating during loading
  const filtersToDisplay = useMemo(() => {
    return Object.keys(availableFilters).length > 0
      ? availableFilters
      : voices?.reduce((acc, voice) => {
          Object.entries(voice.filters).forEach(([key, value]) => {
            if (value && !acc[key]?.includes(value as string)) {
              acc[key] = [...(acc[key] || []), value as string];
            }
          });
          return acc;
        }, {} as { [key: string]: string[] });
  }, [voices, availableFilters]);

  const currentSelectedVoice = useMemo(
    () => voices?.find((v) => v.voiceId === selectedVoice),
    [voices, selectedVoice]
  );
  const isVoicesLoading = useMemo(
    () => isLoading || isRefreshing,
    [isLoading, isRefreshing]
  );

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen} placement="bottom-start">
      <PopoverTrigger>
        <Button
          variant="bordered"
          className="w-full flex flex-row justify-between min-h-[30px] bg-content1 dark:bg-content3 "
          isDisabled={isLoading}
        >
          <span className="truncate max-w-[400px] block">
            {isLoading
              ? "Loading voices..."
              : currentSelectedVoice
              ? currentSelectedVoice.name
              : "Select a voice"}
          </span>
          {isLoading ? (
            <Spinner size="sm" />
          ) : (
            <IoFilter className="text-default-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] bg-content1 dark:bg-content3 text-foreground-700 hover:border-default-400 sm:max-w-[600px] max-w-[95vw]">
        {isLoading && !isRefreshing ? (
          <div className="flex flex-col items-center justify-center p-8 gap-4">
            <Spinner size="lg" />
            <p className="text-default-500">Loading available voices...</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-default-100 bg-default-50 w-full">
              <CustomInputWithLabel
                label="Sample Text"
                placeholder="Custom sample text..."
                value={sampleText}
                onChange={(value) => setSampleText(value)}
                className="w-full mb-3"
              />
              <CustomInputWithLabel
                label="Search"
                placeholder="Search voices..."
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                className="w-full mb-3"
              />
              <div className="flex flex-row gap-2 mt-3">
                {Object.entries(filtersToDisplay || {}).map(
                  ([filterType, values]) => (
                    <Select
                      key={filterType}
                      selectedKeys={
                        selectedFilters[
                          filterType as keyof typeof selectedFilters
                        ]
                          ? new Set([
                              selectedFilters[
                                filterType as keyof typeof selectedFilters
                              ]!,
                            ])
                          : new Set()
                      }
                      onSelectionChange={(keys) => {
                        const selectedKey = Array.from(keys)[0] as string;
                        setSelectedFilters((prev) => ({
                          ...prev,
                          [filterType]: selectedKey || undefined,
                        }));
                      }}
                      placeholder={
                        filterType.charAt(0).toUpperCase() + filterType.slice(1)
                      }
                      className="w-full"
                    >
                      {values.map((value) => {
                        return (
                          <SelectItem key={value}>
                            {filterType === "language" && languageMap[value] ? (
                              <div className="flex items-center">
                                <FlagImage
                                  countryCode={languageMap[value].countryCode}
                                />
                                <span>{languageMap[value].name}</span>
                              </div>
                            ) : (
                              value
                            )}
                          </SelectItem>
                        );
                      })}
                    </Select>
                  )
                )}
              </div>
            </div>
            <ScrollArea className="h-[340px] w-full">
              <div className="p-2 w-full">
                {isVoicesLoading ? (
                  <div className="flex flex-col items-center justify-center p-8 gap-4">
                    <Spinner size="lg" />
                    <p className="text-default-500">Loading voices...</p>
                  </div>
                ) : filteredVoices?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-default-500">
                    <p>No voices found matching your criteria</p>
                  </div>
                ) : (
                  filteredVoices?.map((voice) => (
                    <div
                      key={voice.voiceId}
                      className={`flex items-center justify-between p-3 rounded-lg hover:bg-default-100 w-full ${
                        selectedVoice === voice.voiceId ? "bg-primary/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Button
                          variant="ghost"
                          className={
                            currentlyPlaying === voice.voiceId
                              ? "bg-primary/20 flex-shrink-0"
                              : "flex-shrink-0"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            loadAndPlayVoice(
                              voice.voiceId,
                              voice.previewUrl || ""
                            );
                          }}
                          isDisabled={
                            isTyping || preparingVoices.has(voice.voiceId)
                          }
                        >
                          {preparingVoices.has(voice.voiceId) ? (
                            <Spinner size="sm" />
                          ) : loadedVoices.has(voice.voiceId) ? (
                            currentlyPlaying === voice.voiceId ? (
                              <RiPauseFill className="text-xl" />
                            ) : (
                              <RiPlayFill className="text-xl" />
                            )
                          ) : (
                            <MdRefresh className="text-lg" />
                          )}
                        </Button>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate max-w-[280px]">
                            {voice.name}
                          </div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {Object.entries(voice.filters)
                              .filter(([_, value]) => value)
                              .map(([key, value]) => {
                                const isLanguage =
                                  key === "language" &&
                                  typeof value === "string" &&
                                  languageMap[value];
                                return (
                                  <Badge
                                    key={`${key}-${value}`}
                                    variant="default"
                                    className="bg-default-100 text-default-600"
                                  >
                                    {isLanguage ? (
                                      <div className="flex items-center">
                                        <FlagImage
                                          countryCode={
                                            languageMap[value as string]
                                              .countryCode
                                          }
                                        />
                                        <span>
                                          {languageMap[value as string].name}
                                        </span>
                                      </div>
                                    ) : (
                                      value
                                    )}
                                  </Badge>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant={
                          selectedVoice === voice.voiceId ? "solid" : "bordered"
                        }
                        onPress={() => handleVoiceSelect(voice.voiceId)}
                        className="ml-2 flex-shrink-0"
                      >
                        {selectedVoice === voice.voiceId
                          ? "Selected"
                          : "Use Voice"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
