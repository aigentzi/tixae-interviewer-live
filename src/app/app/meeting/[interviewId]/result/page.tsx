"use client";

import { FC, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { api } from "@root/trpc/react";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Chip,
  CircularProgress,
  Progress,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
} from "@heroui/react";
import {
  Home,
  Download,
  Copy,
  CheckCircle,
  XCircle,
  User,
  Bot,
  Clock,
  Calendar,
  FileText,
  ArrowLeft,
  Video,
  AlertCircle,
  Star,
  BarChart3,
  Activity,
  Share2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Interview, RoomMessage } from "@root/shared/zod-schemas";
import {
  MAX_FEATURE_SCORE,
  SEE_CATEGORY_DESCRIPTIONS,
  SEE_FEATURE_BY_ID,
  SEE_FEATURES,
} from "@root/app/see/see.constants";

interface InterviewResultsPropsWithParams {
  params: Promise<{
    interviewId: string;
  }>;
}

const InterviewResults: FC<InterviewResultsPropsWithParams> = ({ params }) => {
  const { interviewId } = use(params);
  const router = useRouter();
  const roomName = interviewId;
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedVideoLink, setCopiedVideoLink] = useState(false);
  const [interviewData, setInterviewData] = useState<Interview | null>(null);
  const [interviewMessages, setInterviewMessages] = useState<RoomMessage[]>([]);
  const [seeAnalysis, setSeeAnalysis] = useState<any>(null);
  const [isAnalyzingSee, setIsAnalyzingSee] = useState(false);
  const [seeError, setSeeError] = useState<string | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const interviewRef = useRef<Interview | null>(null);
  const isReallyMountedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Fetch interview data
  const {
    data: interview,
    isLoading: isLoadingInterview,
    error: interviewError,
  } = api.interviews.getById.useQuery(
    {
      interviewId: roomName || "",
    },
    {
      refetchOnMount: "always",
    },
  );

  const refreshRecordingLinkMutation =
    api.interviews.getRecordingAccessLink.useMutation({
      onSuccess: (data) => {
        setInterviewData((prev) =>
          prev
            ? {
                ...prev,
                recordingUrl: data.recordingUrl,
                recordingExpiresAt: data.recordingExpiresAt as unknown as Date,
              }
            : prev,
        );
      },
      onError: (err) => {
        console.error(err);
      },
    });
  const { mutate: refreshRecordingLink, isPending: isRefreshingLink } =
    refreshRecordingLinkMutation;

  const { data: workspaceSettingsData } =
    api.workspace.getWorkspaceSettingsById.useQuery(
      {
        workspaceId: interview?.workspaceId || "",
      },
      {
        enabled: !!interview?.workspaceId,
      },
    );

  const deleteInterviewMutation = api.interviews.delete.useMutation();

  const reanalyzeMutation = api.interviews.reanalyze.useMutation({
    onSuccess: (data) => {
      setInterviewData((prev) =>
        prev ? { ...prev, score: data.score, feedback: data.feedback } : prev,
      );
      setIsReanalyzing(false);
    },
    onError: (error) => {
      console.error("Failed to reanalyze interview:", error);
      setIsReanalyzing(false);
    },
  });

  useEffect(() => {
    if (interview) {
      setInterviewData(interview);
      const messages = JSON.parse(interview.content || "[]") as RoomMessage[];
      setInterviewMessages(messages);
      interviewRef.current = interview;

      // Auto-trigger SEE analysis if there are sufficient candidate responses
      const candidateMessages = messages.filter((msg) => msg.role === "user");
      const candidateContent = candidateMessages
        .map((msg) => msg.content)
        .join(" ");

      if (
        candidateMessages.length >= 3 &&
        candidateContent.length > 200 &&
        !seeAnalysis &&
        !isAnalyzingSee
      ) {
        // Small delay to ensure component is fully mounted
        setTimeout(() => {
          analyzeSeeScoring();
        }, 1000);
      }
    }
  }, [interview, seeAnalysis, isAnalyzingSee]);

  useEffect(() => {
    console.log("Effect mounted - setting up cleanup");

    // Mark as really mounted after a delay to avoid React Strict Mode issues
    timeoutRef.current = setTimeout(() => {
      isReallyMountedRef.current = true;
      console.log("Component is now considered really mounted");
    }, 1000);

    return () => {
      console.log("Cleanup running - checking if should delete:", {
        hasInterview: !!interviewRef.current,
        isDemo: interviewRef.current?.isDemo,
        interviewId: interviewRef.current?.id,
        isReallyMounted: isReallyMountedRef.current,
      });

      // Clean up video element to prevent play() errors
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.src = "";
          videoRef.current.load();
        } catch (e) {
          console.warn("Video cleanup error:", e);
        }
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Only delete if component was really mounted (not just React Strict Mode)
      if (isReallyMountedRef.current && interviewRef.current?.isDemo) {
        console.log("Deleting demo interview:", interviewRef.current.id);
        deleteInterviewMutation.mutate({
          interviewId: interviewRef.current.id,
          workspaceId: interviewRef.current.workspaceId || "",
        });
      } else {
        console.log(
          "Not deleting - component was not really mounted or not demo",
        );
      }
    };
  }, []);

  const getScoreColor = (score: number): "success" | "warning" | "danger" => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "danger";
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Needs Improvement";
  };

  const analyzeSeeScoring = async () => {
    if (!interviewMessages.length) return;

    setIsAnalyzingSee(true);
    setSeeError(null);

    try {
      const transcript = interviewMessages
        .filter((msg) => msg.role === "user") // Only candidate responses
        .map((msg) => msg.content)
        .join("\n\n");

      if (transcript.length < 50) {
        setSeeError("Transcript too short for SEE analysis");
        return;
      }

      const response = await fetch("/see/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription: transcript }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to analyze");

      setSeeAnalysis(data);
    } catch (error: any) {
      setSeeError(error.message || "Unexpected error during SEE analysis");
    } finally {
      setIsAnalyzingSee(false);
    }
  };

  const handleCopyFeedback = () => {
    navigator.clipboard.writeText(interview?.feedback || "");
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  const handleReanalyze = () => {
    setIsReanalyzing(true);
    reanalyzeMutation.mutate({ interviewId: roomName });
  };

  const handleCopyTranscript = () => {
    const transcript = interviewMessages
      .map(
        (msg) =>
          `${msg.role === "user" ? "Candidate" : "AI Interviewer"}: ${
            msg.content
          }`,
      )
      .join("\n\n");
    navigator.clipboard.writeText(transcript);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleDownloadTranscript = () => {
    const transcript = interviewMessages
      .map(
        (msg) =>
          `${msg.role === "user" ? "Candidate" : "AI Interviewer"}: ${
            msg.content
          }`,
      )
      .join("\n\n");
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-transcript-${roomName}-${format(
      interviewData?.createdAt || new Date(),
      "yyyy-MM-dd",
    )}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = () => {
    const report = `
INTERVIEW RESULTS REPORT
========================

Interview ID: ${roomName}
Date: ${format(interviewData?.createdAt || new Date(), "PPP")}
Duration: ${interviewData?.duration}
Status: ${interviewData?.feedback ? "Completed" : "Pending"}.toUpperCase()}

SCORE: ${interviewData?.score}/100

FEEDBACK:
${interviewData?.feedback}

TRANSCRIPT:
${interviewMessages
  .map(
    (msg) =>
      `${msg.role === "user" ? "Candidate" : "AI Interviewer"}: ${msg.content}`,
  )
  .join("\n\n")}
    `;

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-results-${roomName}-${format(
      interviewData?.createdAt || new Date(),
      "yyyy-MM-dd",
    )}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);

  const validateRecordingUrl = async (url: string): Promise<boolean> => {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (!res.ok) return false;
      const contentType = res.headers.get("content-type") || "";
      return (
        contentType.includes("video") || contentType.includes("octet-stream")
      );
    } catch {
      // Treat as invalid to force refresh when validation fails (e.g., CORS)
      return false;
    }
  };

  const downloadFromUrl = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-video-${roomName}-${format(
      interviewData?.createdAt || new Date(),
      "yyyy-MM-dd",
    )}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownloadVideo = async () => {
    setIsDownloadingVideo(true);
    try {
      let url = interviewData?.recordingUrl || "";
      const needsRefresh = !url || !(await validateRecordingUrl(url));
      if (needsRefresh) {
        const result = await refreshRecordingLinkMutation.mutateAsync({
          interviewId: roomName,
        });
        url = result.recordingUrl;
      }
      if (url) downloadFromUrl(url);
    } catch (e) {
      console.error("Failed to download video:", e);
    } finally {
      setIsDownloadingVideo(false);
    }
  };

  const handleShareVideo = async () => {
    if (!interviewData?.recordingUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Interview Recording",
          text: "Watch the interview recording",
          url: interviewData.recordingUrl,
        });
      } else {
        await navigator.clipboard.writeText(interviewData.recordingUrl);
        setCopiedVideoLink(true);
        setTimeout(() => setCopiedVideoLink(false), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(interviewData.recordingUrl);
      setCopiedVideoLink(true);
      setTimeout(() => setCopiedVideoLink(false), 2000);
    }
  };

  if (isLoadingInterview) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Card className="p-8">
          <CardBody className="text-center">
            <CircularProgress
              size="lg"
              color="primary"
              className="mb-4"
              aria-label="Loading..."
            />
            <h2 className="text-xl font-semibold text-foreground">
              Loading interview results...
            </h2>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (interviewError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardBody>
            <div className="flex flex-col gap-4 items-center text-center">
              <div className="p-3 bg-danger/10 rounded-full">
                <AlertCircle className="w-8 h-8 text-danger" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Error Loading Interview
                </h3>
                <p className="text-default-600">{interviewError.message}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Brand Header */}
      {workspaceSettingsData?.workspaceSettings?.brandingConfig && (
        <div className="bg-content1 border-b border-divider py-4">
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-center gap-4">
            {workspaceSettingsData.workspaceSettings.brandingConfig.logo && (
              <img
                src={
                  workspaceSettingsData.workspaceSettings.brandingConfig.logo
                }
                alt="logo"
                className="h-10"
              />
            )}
            <h1 className="text-2xl font-bold text-foreground">
              {workspaceSettingsData.workspaceSettings.brandingConfig.name ||
                ""}
            </h1>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <header className="bg-content1 border-b border-divider sticky top-0 z-10">
        <div className="max-w-6xl mx-auto p-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              isIconOnly
              variant="light"
              onPress={() => router.back()}
              className="text-default-600 hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                Interview Results
              </h1>
              {/* <p className="text-default-600">Interview ID: {roomName}</p> */}
            </div>
          </div>
          <Button
            as={Link}
            href="/app"
            color="primary"
            startContent={<Home className="w-4 h-4" />}
            className="font-medium"
          >
            Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Demo Notice */}
        {interview?.isDemo && (
          <Card className="border-warning bg-warning/10">
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="p-2 bg-warning/20 rounded-full">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-warning-700 font-medium">
                    <strong>Demo Interview:</strong> This interview will be
                    automatically deleted after leaving this page.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
        {/* Interview Overview */}
        <Card className="p-2">
          <CardHeader className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Interview Overview
              </h2>
            </div>
            <Chip
              color={interviewData?.feedback ? "primary" : "danger"}
              variant="flat"
              startContent={
                interviewData?.feedback ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )
              }
              className="font-medium"
            >
              {interviewData?.feedback ? "Completed" : "Pending"}
            </Chip>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="p-3 bg-secondary/10 rounded-full w-fit mx-auto">
                  <Calendar className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-default-600">Completed</p>
                  <p className="font-semibold text-foreground">
                    {format(interviewData?.createdAt || new Date(), "PPp")}
                  </p>
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-default-600">Duration</p>
                  <p className="font-semibold text-foreground">
                    {interviewData?.duration || "N/A"}
                  </p>
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="p-3 bg-secondary/10 rounded-full w-fit mx-auto">
                  <FileText className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-default-600">Messages</p>
                  <p className="font-semibold text-foreground">
                    {interviewMessages.length}
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Score Display */}
        <Card className="p-6">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-full">
                <Star className="w-5 h-5 text-warning" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Interview Score
              </h2>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative flex items-center justify-center">
                <CircularProgress
                  size="lg"
                  value={interviewData?.score || 0}
                  color={getScoreColor(interviewData?.score || 0)}
                  showValueLabel={false}
                  classNames={{
                    svg: "w-48 h-48",
                    track: "stroke-default-200",
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div
                    className={`text-4xl font-bold ${
                      getScoreColor(interviewData?.score || 0) === "success"
                        ? "text-success"
                        : getScoreColor(interviewData?.score || 0) === "warning"
                          ? "text-warning"
                          : "text-danger"
                    }`}
                  >
                    {interviewData?.score || 0}
                  </div>
                  <div className="text-lg text-default-600">out of 100</div>
                </div>
              </div>

              <div className="text-center">
                <Chip
                  color={getScoreColor(interviewData?.score || 0)}
                  variant="flat"
                  size="lg"
                  className="font-semibold"
                >
                  {getScoreStatus(interviewData?.score || 0)}
                </Chip>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* SEE Scoring Section */}
        <Card className="p-2">
          <CardHeader className="flex justify-between items-center pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-full">
                <Activity className="w-5 h-5 text-secondary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                SEE Language Analysis
              </h2>
            </div>
            {!seeAnalysis && (
              <Button
                color="secondary"
                variant="flat"
                onPress={analyzeSeeScoring}
                isLoading={isAnalyzingSee}
                startContent={
                  !isAnalyzingSee ? <Activity className="w-4 h-4" /> : undefined
                }
                className="font-medium"
              >
                {isAnalyzingSee ? "Analyzing..." : "Analyze Speaking Skills"}
              </Button>
            )}
          </CardHeader>
          <CardBody className="pt-0">
            {seeError && (
              <div className="mb-4 p-3 bg-danger/10 rounded-lg border border-danger/20">
                <p className="text-sm text-danger-700">{seeError}</p>
              </div>
            )}

            {!seeAnalysis && !isAnalyzingSee && !seeError && (
              <div className="text-center py-8">
                <div className="p-4 bg-secondary/10 rounded-full w-fit mx-auto mb-4">
                  <Activity className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Detailed Language Analysis Available
                </h3>
                <p className="text-default-600 mb-4">
                  Get comprehensive SEE (Structured English Evaluation) scoring
                  based on the interview transcript. This analysis evaluates
                  speaking skills across 5 categories with detailed feedback.
                </p>
                <Button
                  color="secondary"
                  onPress={analyzeSeeScoring}
                  startContent={<Activity className="w-4 h-4" />}
                  className="font-medium"
                >
                  Start SEE Analysis
                </Button>
              </div>
            )}

            {seeAnalysis && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="flex justify-center items-center gap-8">
                    {/* Percentage Score Circle */}
                    <div className="flex flex-col items-center">
                      <div className="relative inline-flex">
                        <CircularProgress
                          size="lg"
                          value={seeAnalysis.seeScorePercent}
                          color={getScoreColor(seeAnalysis.seeScorePercent)}
                          showValueLabel={false}
                          classNames={{
                            svg: "w-32 h-32",
                            track: "stroke-default-200",
                          }}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div
                            className={`text-2xl font-bold ${
                              getScoreColor(seeAnalysis.seeScorePercent) ===
                              "success"
                                ? "text-success"
                                : getScoreColor(seeAnalysis.seeScorePercent) ===
                                    "warning"
                                  ? "text-warning"
                                  : "text-danger"
                            }`}
                          >
                            {seeAnalysis.seeScorePercent}%
                          </div>
                          <div className="text-xs text-default-600">
                            Percentage
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Score out of 6 Circle */}
                    <div className="flex flex-col items-center">
                      <div className="relative inline-flex">
                        <CircularProgress
                          size="lg"
                          value={(seeAnalysis.seeScorePercent / 100) * 100}
                          color={getScoreColor(seeAnalysis.seeScorePercent)}
                          showValueLabel={false}
                          classNames={{
                            svg: "w-32 h-32",
                            track: "stroke-default-200",
                          }}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div
                            className={`text-2xl font-bold ${
                              getScoreColor(seeAnalysis.seeScorePercent) ===
                              "success"
                                ? "text-success"
                                : getScoreColor(seeAnalysis.seeScorePercent) ===
                                    "warning"
                                  ? "text-warning"
                                  : "text-danger"
                            }`}
                          >
                            {((seeAnalysis.seeScorePercent / 100) * 6).toFixed(
                              1,
                            )}
                          </div>
                          <div className="text-xs text-default-600">
                            Out of 6
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Chip
                      color={getScoreColor(seeAnalysis.seeScorePercent)}
                      variant="flat"
                      className="font-semibold"
                    >
                      {getScoreStatus(seeAnalysis.seeScorePercent)}
                    </Chip>
                  </div>
                </div>

                <div className="bg-content2 rounded-lg p-4 border border-divider">
                  <h4 className="font-semibold text-foreground mb-2">
                    Overall Summary
                  </h4>
                  <p className="text-sm text-default-700 leading-relaxed">
                    {seeAnalysis.overallSummary}
                  </p>
                </div>

                <Tabs fullWidth>
                  <Tab key="detailed" title="Detailed Scores">
                    <div className="pt-4">
                      <Table aria-label="SEE Analysis Results" removeWrapper>
                        <TableHeader>
                          <TableColumn>Category</TableColumn>
                          <TableColumn>Feature</TableColumn>
                          <TableColumn>Score</TableColumn>
                          <TableColumn>Weight %</TableColumn>
                          <TableColumn>Comment</TableColumn>
                        </TableHeader>
                        <TableBody>
                          {seeAnalysis.features.map((feature: any) => {
                            const def = SEE_FEATURE_BY_ID[feature.id];
                            const weighted =
                              Math.round(
                                (def?.percentage || 0) *
                                  (feature.score / MAX_FEATURE_SCORE) *
                                  10,
                              ) / 10;
                            return (
                              <TableRow key={feature.id}>
                                <TableCell>
                                  <Chip
                                    size="sm"
                                    variant="flat"
                                    color="default"
                                  >
                                    {def?.category || "-"}
                                  </Chip>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {def?.label || "-"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm">
                                      {feature.score}/{MAX_FEATURE_SCORE}
                                    </span>
                                    <Progress
                                      value={
                                        (feature.score / MAX_FEATURE_SCORE) *
                                        100
                                      }
                                      size="sm"
                                      color={getScoreColor(
                                        (feature.score / MAX_FEATURE_SCORE) *
                                          100,
                                      )}
                                      className="w-16"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm font-mono">
                                  {weighted}%
                                </TableCell>
                                <TableCell className="max-w-xs text-sm">
                                  {feature.comment}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </Tab>
                  <Tab key="categories" title="Categories Overview">
                    <div className="pt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {Object.entries(SEE_CATEGORY_DESCRIPTIONS).map(
                        ([category, description]) => {
                          const featuresInCategory =
                            seeAnalysis.features.filter(
                              (f: any) =>
                                SEE_FEATURE_BY_ID[f.id]?.category === category,
                            );
                          const avgScore =
                            featuresInCategory.length > 0
                              ? featuresInCategory.reduce(
                                  (sum: number, f: any) => sum + f.score,
                                  0,
                                ) / featuresInCategory.length
                              : 0;

                          return (
                            <Card key={category} className="p-3">
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between w-full">
                                  <h4 className="font-semibold text-foreground">
                                    {category}
                                  </h4>
                                  <Chip
                                    size="sm"
                                    color={getScoreColor(
                                      (avgScore / MAX_FEATURE_SCORE) * 100,
                                    )}
                                    variant="flat"
                                  >
                                    {avgScore.toFixed(1)}/{MAX_FEATURE_SCORE}
                                  </Chip>
                                </div>
                              </CardHeader>
                              <CardBody className="pt-0">
                                <p className="text-xs text-default-600 mb-2">
                                  {description}
                                </p>
                                <Progress
                                  value={(avgScore / MAX_FEATURE_SCORE) * 100}
                                  size="sm"
                                  color={getScoreColor(
                                    (avgScore / MAX_FEATURE_SCORE) * 100,
                                  )}
                                  className="mt-2"
                                />
                              </CardBody>
                            </Card>
                          );
                        },
                      )}
                    </div>
                  </Tab>
                </Tabs>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Feedback Section */}
        <Card className="p-2">
          <CardHeader className="flex justify-between items-center pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-full">
                <Bot className="w-5 h-5 text-secondary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">AI Feedback</h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant="flat"
                color="secondary"
                startContent={
                  isReanalyzing ? undefined : <RefreshCw className="w-4 h-4" />
                }
                onPress={handleReanalyze}
                isLoading={isReanalyzing}
                isDisabled={isReanalyzing}
                className="font-medium"
              >
                {isReanalyzing ? "Reanalyzing..." : "Reanalyze"}
              </Button>
              <Button
                variant="flat"
                color={copiedFeedback ? "success" : "default"}
                startContent={
                  copiedFeedback ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )
                }
                onPress={handleCopyFeedback}
                className="font-medium"
              >
                {copiedFeedback ? "Copied!" : "Copy"}
              </Button>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="bg-content2 rounded-lg p-6 border border-divider">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {interviewData?.feedback || "No feedback available yet."}
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Recording Section */}
        {interviewData?.recordingUrl && (
          <Card className="p-2">
            <CardHeader className="flex justify-between items-center pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-danger/10 rounded-full">
                  <Video className="w-5 h-5 text-danger" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Interview Recording
                </h2>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="flat"
                  color="primary"
                  startContent={
                    isRefreshingLink ? (
                      <CircularProgress size="sm" aria-label="Loading..." />
                    ) : (
                      <Download className="w-4 h-4" />
                    )
                  }
                  onPress={() =>
                    refreshRecordingLink({ interviewId: roomName })
                  }
                  isDisabled={isRefreshingLink}
                  className="font-medium"
                >
                  {isRefreshingLink ? "Refreshing..." : "Refresh Link"}
                </Button>
                <Button
                  color="primary"
                  startContent={
                    isDownloadingVideo ? (
                      <CircularProgress size="sm" aria-label="Loading..." />
                    ) : (
                      <Download className="w-4 h-4" />
                    )
                  }
                  onPress={handleDownloadVideo}
                  isDisabled={isDownloadingVideo}
                  className="font-medium"
                >
                  {isDownloadingVideo ? "Preparing..." : "Download Video"}
                </Button>
                <Button
                  variant="flat"
                  color={copiedVideoLink ? "success" : "default"}
                  startContent={<Share2 className="w-4 h-4" />}
                  onPress={handleShareVideo}
                  className="font-medium"
                >
                  {copiedVideoLink ? "Link Copied!" : "Share Link"}
                </Button>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <video
                ref={videoRef}
                src={interviewData.recordingUrl || ""}
                controls
                preload="none"
                onError={(e) => {
                  console.warn("Video load error:", e);
                }}
                onLoadStart={(e) => {
                  // Ensure video is still in DOM before continuing
                  const video = e.currentTarget;
                  if (!video || !document.contains(video)) {
                    return;
                  }
                }}
                className="w-full aspect-video rounded-lg bg-content1 border border-divider"
              />

              {interviewData?.recordingExpiresAt && (
                <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <p className="text-sm text-warning-700">
                    <strong>Note:</strong> This recording link expires on{" "}
                    <span className="font-semibold">
                      {format(
                        new Date(interviewData.recordingExpiresAt),
                        "PPP p",
                      )}
                    </span>
                    . If the link has expired, click "Refresh Link" above to
                    obtain a new access link.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Message History */}
        <Card className="p-2">
          <CardHeader className="flex justify-between items-center pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Interview Transcript
              </h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant="flat"
                color={copiedTranscript ? "success" : "default"}
                size="sm"
                startContent={
                  copiedTranscript ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )
                }
                onPress={handleCopyTranscript}
              >
                {copiedTranscript ? "Copied!" : "Copy"}
              </Button>
              <Button
                variant="flat"
                color="primary"
                size="sm"
                startContent={<Download className="w-4 h-4" />}
                onPress={handleDownloadTranscript}
              >
                Download
              </Button>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin">
              {interviewMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-3xl rounded-lg p-4 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-content2 text-foreground border border-divider"
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      {message.role === "user" ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                      <span className="font-semibold text-sm">
                        {message.role === "user"
                          ? "Candidate"
                          : "AI Interviewer"}
                      </span>
                      {message.ts && (
                        <span className="text-xs opacity-60">
                          {format(message.ts, "HH:mm")}
                        </span>
                      )}
                    </div>
                    <p className="leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Export Actions */}
        <Card className="p-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Export Options
              </h2>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="flex flex-wrap gap-4">
              <Button
                color="primary"
                size="lg"
                startContent={<Download className="w-4 h-4" />}
                onPress={handleDownloadReport}
                className="font-medium"
              >
                Download Full Report
              </Button>
              <Button
                color="primary"
                variant="flat"
                size="lg"
                startContent={<Download className="w-4 h-4" />}
                onPress={handleDownloadTranscript}
                className="font-medium"
              >
                Download Transcript
              </Button>
            </div>
          </CardBody>
        </Card>
      </main>
    </div>
  );
};

export default InterviewResults;
