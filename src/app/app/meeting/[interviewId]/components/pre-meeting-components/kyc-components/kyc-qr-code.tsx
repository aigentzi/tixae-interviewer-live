import { FC, useState, useEffect, useCallback } from "react";
import { Button } from "@root/components/ui/button";
import { Card, CardContent } from "@root/components/ui/card";
import { Badge } from "@root/components/ui/badge";
import {
  Smartphone,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Clock,
  QrCode as QrCodeIcon,
  AlertCircle,
  Monitor,
  Shield,
  ArrowRight,
} from "lucide-react";
import { KYCStepProps } from "@root/types/kyc";
import InlineNotification from "@root/app/components/InlineNotification";
import axios from "axios";
import QRCode from "qrcode";
import { useRoom } from "@root/app/app/meeting/[interviewId]/hooks/room.hook";
import { db } from "@root/server/typedFirestore";
import { onSnapshot } from "firebase/firestore";
import { getFirestore, doc } from "firebase/firestore";
import { app } from "@root/app/firebase/clientFirebaseInit";

export const KYCQRCodeStep: FC<KYCStepProps> = ({
  onNext,
  onPrev,
  state,
  updateState,
}) => {
  const { interview } = useRoom();
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [mobileUrl, setMobileUrl] = useState<string>("");
  const [sessionStatus, setSessionStatus] = useState<
    "pending" | "in_progress" | "completed" | "failed"
  >("pending");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getDocumentTypeDisplay = () => {
    switch (state.documentType) {
      case "passport":
        return "Passport";
      case "driver_license":
        return "Driver's License";
      case "id_card":
        return "National ID Card";
      default:
        return "Document";
    }
  };

  const createKYCSession = useCallback(async () => {
    try {
      const response = await axios.post("/api/kyc/session", {
        action: "create_session",
        interviewId: interview?.id,
        documentType: state.documentType,
      });

      if (response.data.success) {
        const { sessionId: newSessionId, qrCodeUrl: newQrCodeUrl } =
          response.data;
        setSessionId(newSessionId);
        setMobileUrl(newQrCodeUrl);

        // Generate QR code (client-side only)
        if (typeof window !== "undefined") {
          try {
            const qrDataUrl = await QRCode.toDataURL(newQrCodeUrl, {
              width: 256,
              margin: 2,
              color: {
                dark: "#000000",
                light: "#ffffff",
              },
              errorCorrectionLevel: "M",
              type: "image/png",
            });
            setQrCodeUrl(qrDataUrl);
          } catch (qrError) {
            console.error("Error generating QR code:", qrError);
            setNotification({
              type: "error",
              message: "Failed to generate QR code",
            });
          }
        }

        // Start listening for real-time updates
        startRealtimeListener(newSessionId);
        setIsLoading(false);
      } else {
        console.error("Failed to create KYC session:", response.data);
        setIsLoading(false);
        setNotification({
          type: "error",
          message: "Failed to create KYC session",
        });
      }
    } catch (error) {
      console.error("Error creating KYC session:", error);
      setIsLoading(false);
      setNotification({
        type: "error",
        message: "Failed to create KYC session. Please try again.",
      });
    }
  }, [state.documentType, interview?.id]);

  const startRealtimeListener = useCallback(
    (sessionId: string) => {
      if (unsubscribe) {
        unsubscribe();
      }

      try {
        const firestore = getFirestore(app);
        const sessionRef = doc(firestore, "kycSessions", sessionId);

        const unsubscribeListener = onSnapshot(
          sessionRef,
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const sessionData = docSnapshot.data();
              console.log(
                "Real-time session update:",
                sessionData.status,
                "Result:",
                !!sessionData.result
              );

              setSessionStatus(sessionData.status);

              if (sessionData.status === "completed" && sessionData.result) {
                setIsListening(false);
                updateState({
                  step: "results", // Skip processing step - verification is already complete on mobile
                  result: sessionData.result,
                });
                setNotification({
                  type: "success",
                  message: "Identity verification completed successfully!",
                });
              } else if (sessionData.status === "failed") {
                setIsListening(false);
                updateState({
                  step: "results", // Skip processing step - go directly to results with failure
                  result: sessionData.result || {
                    success: false,
                    error: "Verification failed on mobile",
                  },
                });
                setNotification({
                  type: "error",
                  message: "Identity verification failed",
                });
              }
            } else {
              console.log("Session document does not exist");
              setIsListening(false);
              setNotification({
                type: "error",
                message: "Session expired. Please refresh to try again.",
              });
            }
          },
          (error) => {
            console.error("Error listening to session updates:", error);
            setNotification({
              type: "error",
              message: "Connection lost. Please refresh to try again.",
            });
            setIsListening(false);
          }
        );

        setUnsubscribe(() => unsubscribeListener);
        setIsListening(true);
      } catch (error) {
        console.error("Error setting up real-time listener:", error);
        setNotification({
          type: "error",
          message: "Failed to setup real-time updates",
        });
      }
    },
    [unsubscribe, updateState, onNext]
  );

  // Initialize session on component mount
  useEffect(() => {
    createKYCSession();
  }, [createKYCSession]);

  // Real-time listener cleanup
  useEffect(() => {
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      setIsListening(false);
      if (sessionId) {
        // Clean up session when component unmounts
        axios
          .post("/api/kyc/session", {
            action: "delete_session",
            sessionId,
          })
          .catch(() => {}); // Ignore errors on cleanup
      }
    };
  }, [sessionId, unsubscribe]);

  const handleRefresh = () => {
    if (unsubscribe) {
      unsubscribe();
    }
    setSessionStatus("pending");
    setIsListening(false);
    createKYCSession();
  };

  const getStatusIcon = () => {
    switch (sessionStatus) {
      case "pending":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "in_progress":
        return <Smartphone className="h-5 w-5 text-yellow-500" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (sessionStatus) {
      case "pending":
        return "Scan QR code to start verification";
      case "in_progress":
        return "Complete your verification on mobile to continue";
      case "completed":
        return "Verification completed successfully";
      case "failed":
        return "Verification failed - please try again";
    }
  };

  return (
    <div className="w-full space-y-6">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">
            Verify Your {getDocumentTypeDisplay()}
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">
          For security and best results, we'll verify your identity on your
          mobile device
        </p>
      </div>

      <Card className="border-2">
        <CardContent className="p-8 text-center space-y-6">
          {/* Desktop indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Monitor className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Desktop Device Detected
            </span>
          </div>

          {/* QR Code */}
          {isLoading ? (
            <div className="space-y-4">
              <QrCodeIcon className="h-16 w-16 mx-auto text-muted-foreground animate-pulse" />
              <p className="text-sm text-muted-foreground">
                Generating QR code...
              </p>
            </div>
          ) : qrCodeUrl ? (
            <div className="space-y-4">
              <div className="mx-auto w-64 h-64 bg-white p-4 rounded-lg border-2 border-dashed border-primary/50">
                <img
                  src={qrCodeUrl}
                  alt="KYC QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
                  {getStatusIcon()}
                  <span className="text-sm font-medium">{getStatusText()}</span>
                </div>

                {sessionStatus === "in_progress" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-800 text-sm">
                      <ArrowRight className="h-4 w-4" />
                      <span className="font-medium">
                        Complete verification on your mobile device
                      </span>
                    </div>
                    <p className="text-blue-700 text-xs mt-1">
                      Follow the instructions on your phone to capture your
                      document
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <QrCodeIcon className="h-16 w-16 mx-auto text-muted-foreground animate-pulse" />
              <p className="text-sm text-muted-foreground">
                Generating QR code...
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">How to verify:</h3>
            <div className="text-left space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <span className="text-sm font-medium">Open your camera</span>
                  <p className="text-xs text-muted-foreground">
                    Use your phone's camera app or QR scanner
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <span className="text-sm font-medium">Scan the QR code</span>
                  <p className="text-xs text-muted-foreground">
                    Point your camera at the code above
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <span className="text-sm font-medium">
                    Complete verification
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Follow mobile instructions to capture your{" "}
                    {getDocumentTypeDisplay().toLowerCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium flex-shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <span className="text-sm font-medium">Return to desktop</span>
                  <p className="text-xs text-muted-foreground">
                    Your verification will sync automatically
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <Button
            variant="ghost"
            onClick={() => {
              // Switch to direct capture mode for desktop users
              updateState({ forceDesktopCapture: true });
              // This will trigger a re-render showing the capture component
            }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Monitor className="h-4 w-4" />
            Continue on Desktop Instead
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button
          variant="bordered"
          onPress={onPrev}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="text-sm text-muted-foreground flex items-center">
          Step 2 of 3
        </div>
      </div>
    </div>
  );
};
