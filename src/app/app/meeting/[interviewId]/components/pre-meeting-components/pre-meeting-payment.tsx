import { Button } from "@root/components/ui/button";
import { FC, useEffect, useState } from "react";
import { useRoom } from "../../hooks/room.hook";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { api } from "@root/trpc/react";
import { VerificationDisplay } from "@root/components/VerificationDisplay";

export const PreMeetingPayment: FC<{
  next: () => void;
  prev: () => void;
}> = ({ next, prev }) => {
  const {
    interview,
    error,
    setError,
    stripeVerificationSessionId,
    setStripeVerificationSessionId,
  } = useRoom();
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const { mutateAsync: verifyStripe } =
    api.interviews.verifyStripe.useMutation();

  // Initialize Stripe SDK for client side only on mount
  useEffect(() => {
    const initializeStripe = async () => {
      setStripe(
        await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""),
      );
    };
    initializeStripe();
  }, []);

  const handleStripe = async () => {
    if (!stripe) {
      setError("Stripe not initialized");
      return;
    }

    const verificationResult = await verifyStripe({
      interviewId: interview?.id || "",
    });

    const session = verificationResult?.clientSecret;

    console.log("Stripe response", verificationResult);

    if (!session) {
      setError("Stripe session not found");
      return;
    }

    const { error } = await stripe.verifyIdentity(session);
    if (error) {
      console.error(error);
      setError(
        error.message ||
          "An unknown error occurred while verifying your identity",
      );
    } else {
      setStripeVerificationSessionId(verificationResult?.stripeSessionId || "");
      console.log("Verification submitted");
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full flex-wrap mt-10">
      <p className="text-muted-foreground">
        Please Choose a method to pay for the interview and authenticate your
        account
      </p>
      <div className="flex flex-col gap-2">
        <div className="cursor-pointer">
          <div
            className="flex flex-row gap-5 py-5 px-5 items-center border-2 border-border rounded-lg p-2"
            onClick={handleStripe}
          >
            <div className="w-10 h-10 rounded-full">stripe</div>
            <div className="flex flex-col">
              <p className="text-lg font-bold">Stripe</p>
              <p className="text-muted-foreground">
                Please click here to authenticate your account with Stripe
              </p>
            </div>
          </div>
        </div>
      </div>
      {stripeVerificationSessionId && (
        <VerificationDisplay verificationId={stripeVerificationSessionId} />
      )}
      <div className="flex flex-row items-center justify-between gap-2 w-full">
        <Button variant="bordered" size="lg" onPress={prev}>
          Back
        </Button>
        <Button
          disabled={error !== null || stripeVerificationSessionId === ""}
          variant="solid"
          size="lg"
          onPress={next}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
