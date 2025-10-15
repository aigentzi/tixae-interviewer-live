import { FC } from "react";
import { Button } from "@root/components/ui/button";
import { Card, CardContent } from "@root/components/ui/card";
import { Badge } from "@root/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Shield,
  User,
  FileText,
  Calendar,
  MapPin,
  Hash,
  Flag,
  RotateCcw,
  Info,
} from "lucide-react";
import { KYCStepProps } from "@root/types/kyc";
import { format } from "date-fns";

export const KYCResultsStep: FC<KYCStepProps> = ({
  onNext,
  onPrev,
  state,
  updateState,
}) => {
  const result = state.result;
  const isSuccess = result?.success;
  const data = result?.data;

  const handleRetry = () => {
    // Reset all KYC state to start fresh
    updateState({
      step: "document_type",
      documentImage: undefined,
      documentImageBack: undefined,
      currentSide: "front",
      captureMode: undefined,
      result: undefined,
      error: undefined,
      isProcessing: false,
    });
  };

  const getOverallStatus = () => {
    if (!result?.success) return "failed";

    // Check the raw API decision first - if it's reject, always fail
    if (data?.raw?.decision === "reject") {
      return "failed";
    }

    const docAuth = data?.documentAuthenticity?.overall;
    const amlMatch = data?.aml?.match;

    // If document authenticity failed or AML match found, return failed (not warning)
    if (docAuth === "fail" || amlMatch === true) {
      return "failed";
    }

    // If there are warnings but decision was accept, show warning
    if (
      docAuth === "warning" ||
      (data?.documentAuthenticity?.details &&
        data.documentAuthenticity.details.length > 0)
    ) {
      return "warning";
    }

    return "success";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-primary";
      case "warning":
        return "text-secondary";
      case "failed":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "success":
        return "default";
      case "warning":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const renderSuccessResults = () => {
    const overallStatus = getOverallStatus();

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div
            className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              overallStatus === "success"
                ? "bg-primary/10 text-primary"
                : overallStatus === "warning"
                  ? "bg-secondary/10 text-secondary"
                  : "bg-secondary text-secondary-foreground"
            }`}
          >
            {overallStatus === "success" && <CheckCircle className="h-8 w-8" />}
            {overallStatus === "warning" && (
              <AlertTriangle className="h-8 w-8" />
            )}
            {overallStatus === "failed" && <XCircle className="h-8 w-8" />}
          </div>

          <h2 className="text-xl font-semibold mb-2">
            {overallStatus === "success" && "Identity Verified Successfully"}
            {overallStatus === "warning" && "Identity Verified with Warnings"}
            {overallStatus === "failed" && "Identity Verification Failed"}
          </h2>

          <p className="text-muted-foreground text-sm">
            {overallStatus === "success" &&
              "Your identity has been successfully verified and all security checks passed"}
            {overallStatus === "warning" &&
              "Your identity was verified but some checks raised warnings that need attention"}
            {overallStatus === "failed" &&
              (data?.raw?.decision === "reject"
                ? "Your document was rejected due to security concerns. Please try again with a higher quality document."
                : "We couldn't verify your identity with the provided documents. Please try again.")}
          </p>
        </div>

        {/* Personal Information */}
        {data && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Full Name
                    </label>
                    <p className="font-medium">
                      {data.fullName ||
                        `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
                        "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">
                      Date of Birth
                    </label>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(data.dateOfBirth)}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">
                      Gender
                    </label>
                    <p className="font-medium">{data.gender || "N/A"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Nationality
                    </label>
                    <p className="font-medium flex items-center gap-2">
                      <Flag className="h-4 w-4" />
                      {data.nationality || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">
                      Document Number
                    </label>
                    <p className="font-medium flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      {data.documentNumber || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Age</label>
                    <p className="font-medium">{data.age || "N/A"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Results */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Verification Results
            </h3>

            <div className="space-y-4">
              {/* Document Authenticity */}
              <div className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">
                        Document Authenticity
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Security features and document validation
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={getStatusBadgeVariant(
                      data?.raw?.decision === "reject"
                        ? "failed"
                        : data?.documentAuthenticity?.overall || "failed",
                    )}
                    className="capitalize"
                  >
                    {data?.raw?.decision === "reject"
                      ? "Rejected"
                      : data?.documentAuthenticity?.overall || "Failed"}
                  </Badge>
                </div>

                {/* Show rejection reason or warnings */}
                {data?.raw?.decision === "reject" && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Rejection Reason:
                    </p>
                    <div className="text-xs text-muted-foreground bg-secondary/20 p-2 rounded">
                      Document rejected due to security concerns. Review Score:{" "}
                      {data?.raw?.reviewScore || 0}/10
                      {data?.raw?.rejectScore &&
                        ` (Reject Score: ${data.raw.rejectScore})`}
                    </div>
                    {data.documentAuthenticity?.details &&
                      data.documentAuthenticity.details.length > 0 && (
                        <div className="space-y-1 mt-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Security Issues:
                          </p>
                          <div className="space-y-1">
                            {data.documentAuthenticity.details
                              .slice(0, 3)
                              .map((detail, index) => (
                                <p
                                  key={index}
                                  className="text-xs text-muted-foreground bg-secondary/20 p-2 rounded"
                                >
                                  {detail}
                                </p>
                              ))}
                            {data.documentAuthenticity.details.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{data.documentAuthenticity.details.length - 3}{" "}
                                more issues
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Show warnings for accepted/review decisions */}
                {data?.raw?.decision !== "reject" &&
                  data?.documentAuthenticity?.details &&
                  data.documentAuthenticity.details.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Warnings:
                      </p>
                      <div className="space-y-1">
                        {data.documentAuthenticity.details
                          .slice(0, 3)
                          .map((detail, index) => (
                            <p
                              key={index}
                              className="text-xs text-secondary bg-secondary/10 p-2 rounded"
                            >
                              {detail}
                            </p>
                          ))}
                        {data.documentAuthenticity.details.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{data.documentAuthenticity.details.length - 3} more
                            warnings
                          </p>
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* AML Check */}
              {data?.aml && (
                <div className="p-3 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">AML Screening</p>
                        <p className="text-xs text-muted-foreground">
                          Global watchlist and sanctions check
                        </p>
                      </div>
                    </div>
                    <Badge variant={data.aml.match ? "destructive" : "default"}>
                      {data.aml.match ? "Match Found" : "Clear"}
                    </Badge>
                  </div>

                  {/* Show AML records if any */}
                  {data.aml.match &&
                    data.aml.records &&
                    data.aml.records.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-red-600">
                          Sanction Records:
                        </p>
                        <div className="space-y-2">
                          {data.aml.records.slice(0, 2).map((record, index) => (
                            <div
                              key={index}
                              className="text-xs bg-red-50 p-2 rounded border border-red-200"
                            >
                              <p className="font-medium text-red-700">
                                {record.name}
                              </p>
                              <p className="text-red-600">
                                Source: {record.source}
                              </p>
                              {record.country && (
                                <p className="text-red-600">
                                  Country: {record.country}
                                </p>
                              )}
                            </div>
                          ))}
                          {data.aml.records.length > 2 && (
                            <p className="text-xs text-red-600">
                              +{data.aml.records.length - 2} more records
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex justify-between pt-4">
          <Button
            variant="bordered"
            onPress={handleRetry}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Verify Again
          </Button>

          {overallStatus === "success" && (
            <Button onPress={onNext} className="flex items-center gap-2">
              Continue to Interview
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderFailureResults = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>

        <h2 className="text-xl font-semibold mb-2">Verification Failed</h2>
        <p className="text-muted-foreground text-sm">
          We couldn't verify your identity with the provided information
        </p>
      </div>

      <Card className="border-red-200">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-red-600">
            <Info className="h-5 w-5" />
            Error Details
          </h3>

          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-700">
              {result?.error || "Unknown error occurred during verification"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-medium text-sm mb-2">Common Issues</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Document image is blurry or unclear</li>
          <li>• Document is expired or invalid</li>
          <li>• Document type not supported</li>
          <li>• Poor lighting conditions</li>
          <li>• Document security features not detected</li>
        </ul>
      </div>

      <div className="flex justify-between pt-4">
        <Button
          variant="bordered"
          onPress={onPrev}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Button onPress={handleRetry} className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {isSuccess ? renderSuccessResults() : renderFailureResults()}
    </div>
  );
};
