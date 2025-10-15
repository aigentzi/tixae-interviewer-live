"use client";

import { useState, useEffect, Suspense } from "react";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithCustomToken,
} from "firebase/auth";
import { app } from "@root/app/firebase/clientFirebaseInit";
import { useRouter, useSearchParams } from "next/navigation";
import { useGAuth } from "@root/app/hooks/guath.hook";
import { api } from "@root/trpc/create-client";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@root/lib/utils";
import { UnifiedLoadingScreen } from "../components/UnifiedLoadingScreen";
import { InputOtp } from "@heroui/react";

// Email validation schema
const emailSchema = z.string().email("Please enter a valid email address");

// Define the expected response type for the verify OTP mutation
interface VerifyOtpResponse {
  success: boolean;
  customToken: string;
  userId: string;
  isNewUser: boolean;
}

// Animation variants
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

function LoginPage() {
  // Email OTP states
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect functionality
  // Handles complete URLs including search parameters and fragments
  // Example: /app/settings?tab=branding#section
  const searchParams = useSearchParams();
  const redirectParam = searchParams?.get("redirect");

  const getSafeRedirectUrl = (url: string | null): string => {
    if (!url) return "/";

    try {
      // Decode the URL
      const decodedUrl = decodeURIComponent(url);

      // Ensure it's a relative URL (starts with /) and doesn't contain protocol
      if (decodedUrl.startsWith("/") && !decodedUrl.includes("://")) {
        return decodedUrl;
      }

      // If it's not a safe URL, redirect to home
      return "/";
    } catch (error) {
      console.warn("Invalid redirect URL:", url);
      return "/";
    }
  };

  const redirectTo = getSafeRedirectUrl(redirectParam || null);

  // tRPC mutations
  const requestOtpMutation = api.auth.requestEmailOTP.useMutation({
    onSuccess: () => {
      setOtpSent(true);
      setEmailLoading(false);
    },
    onError: (error: any) => {
      setEmailError(error.message);
      setEmailLoading(false);
    },
  });

  const verifyOtpMutation = api.auth.verifyEmailOTP.useMutation({
    onSuccess: async (data: VerifyOtpResponse) => {
      // Sign in with the custom token
      try {
        const auth = getAuth(app);
        await signInWithCustomToken(auth, data.customToken);
        // Keep loading state until redirect happens
        // The redirect happens automatically via the auth context
      } catch (error) {
        console.error("Error signing in with custom token:", error);
        setOtpError("Failed to authenticate. Please try again.");
        setVerifyingOtp(false);
      }
    },
    onError: (error: any) => {
      setOtpError(error.message);
      setVerifyingOtp(false);
    },
  });

  const addUserToFirebaseUsersCollectionMutation =
    api.auth.addUserToFirebaseUsersCollection.useMutation({
      onSuccess: () => {
        console.log("User added to Firebase users collection");
      },
      onError: (error: any) => {
        console.error("Error adding user to Firebase users collection:", error);
      },
    });

  const router = useRouter();
  const { gauthUser, gauthLoading } = useGAuth();

  useEffect(() => {
    // Redirect if already logged in
    if (gauthUser && !gauthLoading) {
      console.log("User authenticated, redirecting to:", redirectTo);
      router.push(redirectTo);
    }
  }, [gauthUser, gauthLoading, router, redirectTo]);

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);

      // Add user to firebase users collection
      const user = userCredential.user;
      if (user) {
        addUserToFirebaseUsersCollectionMutation.mutate({
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          role: "USER",
          workspaceIds: [],
        });
      }

      // Keep loading state until redirect happens
      // The redirect happens automatically via the auth context
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setGoogleLoading(false);
    }
  };

  // Handle email OTP request
  const handleRequestOtp = async () => {
    // Reset errors
    setEmailError("");

    // Validate email
    try {
      emailSchema.parse(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0]?.message || "Invalid email");
      }
      return;
    }

    // Request OTP
    setEmailLoading(true);
    requestOtpMutation.mutate({ email });
  };

  // Handle OTP verification
  const handleVerifyOtp = async () => {
    // Reset errors
    setOtpError("");

    // Validate OTP length
    if (otp.length !== 6) {
      setOtpError("Please enter all 6 digits");
      return;
    }

    // Verify OTP
    setVerifyingOtp(true);
    verifyOtpMutation.mutate({ email, otp });
  };

  if (gauthLoading) {
    return <UnifiedLoadingScreen stage="authenticating" />;
  }

  if (gauthUser) {
    return (
      <UnifiedLoadingScreen
        stage="authenticating"
        message="Redirecting to your dashboard..."
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#3a0a68] to-[#2b0a4a]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: 0.5,
          type: "spring",
          stiffness: 100,
        }}
        className="w-full max-w-md p-8 space-y-8 bg-content1 rounded-lg shadow-md border border-default-400"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-foreground-700">
            Sign in or sign up
          </h1>
          <p className="mt-2 text-foreground-500">
            Use your email or Google to continue
          </p>
        </motion.div>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            {!otpSent ? (
              <motion.div
                key="email-form"
                variants={slideUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-foreground-700"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <motion.input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError("");
                      }}
                      placeholder="you@example.com"
                      className={cn(
                        "w-full pr-10 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring",
                        "border-default-400 bg-content1 text-foreground-700 focus-visible:ring-0 focus-visible:border-primary focus-visible:border-2 focus-visible:ring-offset-0"
                      )}
                      disabled={emailLoading}
                      whileFocus={{
                        boxShadow: "0 0 0 2px rgba(93, 92, 242, 0.25)",
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Paste email from clipboard"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          setEmail(text.trim());
                          setEmailError("");
                        } catch (err) {
                          // Clipboard API may be unavailable or denied
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-content2 text-foreground-600"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                        ></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </div>
                  <AnimatePresence>
                    {emailError && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-destructive text-sm"
                      >
                        {emailError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <motion.button
                  onClick={handleRequestOtp}
                  disabled={emailLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                  whileHover={{
                    scale: 1.01,
                    boxShadow: "0 4px 20px rgba(93, 92, 242, 0.25)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {emailLoading ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-foreground-700 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                      <span>Sending Code...</span>
                    </>
                  ) : (
                    "Continue with Email"
                  )}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="otp-form"
                variants={slideUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-foreground-700">
                      Verification Code
                    </label>
                    <motion.button
                      className="text-xs text-primary-700 hover:underline"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                        setOtpError("");
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Use a different email
                    </motion.button>
                  </div>

                  <div className="my-6">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-center text-foreground-500 mb-4"
                    >
                      Enter the 6-digit code sent to{" "}
                      <span className="font-medium text-foreground-700">
                        {email}
                      </span>
                    </motion.p>

                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        delay: 0.1,
                        type: "spring",
                        stiffness: 300,
                      }}
                      className="flex justify-center text-foreground-700"
                    >
                      <InputOtp
                        length={6}
                        value={otp}
                        variant="bordered"
                        size="lg"
                        onValueChange={setOtp}
                        onComplete={handleVerifyOtp}
                        isDisabled={verifyingOtp}
                      />
                    </motion.div>

                    <AnimatePresence>
                      {otpError && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-destructive text-sm text-center mt-2"
                        >
                          {otpError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.button
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || otp.length !== 6}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                    whileHover={
                      otp.length === 6 && !verifyingOtp
                        ? {
                            scale: 1.01,
                            boxShadow: "0 4px 20px rgba(93, 92, 242, 0.25)",
                          }
                        : {}
                    }
                    whileTap={
                      otp.length === 6 && !verifyingOtp ? { scale: 0.98 } : {}
                    }
                  >
                    {verifyingOtp ? (
                      <>
                        <motion.div
                          className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </motion.button>

                  <div className="text-center mt-4">
                    <motion.button
                      className="text-sm text-primary hover:underline"
                      onClick={() => {
                        setOtp("");
                        handleRequestOtp();
                      }}
                      disabled={emailLoading || verifyingOtp}
                      whileHover={
                        !emailLoading && !verifyingOtp ? { scale: 1.05 } : {}
                      }
                      whileTap={
                        !emailLoading && !verifyingOtp ? { scale: 0.95 } : {}
                      }
                    >
                      Resend Code
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!otpSent && (
          <>
            <motion.button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-default-400 rounded-md shadow-sm bg-background hover:bg-content2 transition-colors text-foreground"
              whileHover={{
                scale: 1.01,
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              }}
              whileTap={{ scale: 0.98 }}
            >
              {googleLoading ? (
                <motion.div
                  className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#4285F4"
                      d="M21.9 12.2c0-.7-.1-1.3-.2-1.9H12v3.8h5.5c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 22c2.7 0 5-1 6.7-2.6l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H3v2.5C4.7 19.5 8.1 22 12 22Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.3 13.7C6.1 13.1 6 12.6 6 12c0-.6.1-1.1.3-1.7V7.9H3c-.7 1.3-1 2.7-1 4.1s.3 2.9 1 4.1l3.3-2.4Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 6.6c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3.6 14.7 2.5 12 2.5c-3.9 0-7.3 2.5-8.9 6l3.3 2.4c.8-2.4 3-4.3 5.6-4.3Z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </motion.button>
          </>
        )}
      </motion.div>
    </div>
  );
}

// Wrapper component to satisfy Next.js requirement that useSearchParams is inside a Suspense boundary
const LoginPageWrapper = () => (
  <Suspense fallback={<UnifiedLoadingScreen stage="authenticating" />}>
    <LoginPage />
  </Suspense>
);

export default LoginPageWrapper;
