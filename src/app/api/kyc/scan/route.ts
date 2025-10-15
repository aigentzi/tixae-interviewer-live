import { NextRequest, NextResponse } from "next/server";

// ID Analyzer API endpoint
const ID_ANALYZER_API_URL = "https://api2.idanalyzer.com/scan";

export interface KYCRequest {
  document: string; // base64 encoded image (front side)
  documentBack?: string; // base64 encoded image (back side for ID cards)
  documentType?: "passport" | "driver_license" | "id_card";
  profile?: string; // KYC profile ID
}

export interface KYCResponse {
  success: boolean;
  data?: {
    // Document data
    firstName?: string;
    lastName?: string;
    fullName?: string;
    dateOfBirth?: string;
    age?: number;
    gender?: string;
    nationality?: string;
    documentNumber?: string;
    documentType?: string;
    issueDate?: string;
    expiryDate?: string;
    issuingCountry?: string;
    address?: string;

    // Verification results
    documentAuthenticity?: {
      overall?: string; // "pass" | "fail" | "warning"
      score?: number;
      details?: string[];
    };

    faceVerification?: {
      match?: boolean;
      confidence?: number;
      liveness?: boolean;
    };

    // AML check results
    aml?: {
      match?: boolean;
      records?: Array<{
        name?: string;
        type?: string;
        country?: string;
        source?: string;
      }>;
    };

    // Raw response from ID Analyzer
    raw?: any;
  };
  error?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ID_ANALYZER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "ID Analyzer API key not configured" },
        { status: 500 },
      );
    }

    const body: KYCRequest = await request.json();

    if (!body.document) {
      return NextResponse.json(
        { success: false, error: "Document image is required" },
        { status: 400 },
      );
    }

    // Prepare the request payload for ID Analyzer
    const payload: any = {
      document: body.document,
      documenttype: "auto", // Auto-detect document type
      authenticate: true, // Enable document authenticity check
      aml: true, // Enable AML check
      profile: process.env.ID_ANALYZER_PROFILE_ID,
    };

    // Add back side image for ID cards
    if (body.documentBack) {
      payload.documentBack = body.documentBack;
    }

    // Make request to ID Analyzer API
    const response = await fetch(ID_ANALYZER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            result.error?.message || result.error || "ID verification failed",
          message: result.error?.code || "API_ERROR",
        },
        { status: response.status },
      );
    }

    // Check if the API response indicates failure
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "ID verification failed",
          message: result.error?.code || "VERIFICATION_FAILED",
        },
        { status: 400 },
      );
    }

    // Helper function to extract first value from array
    const getFirstValue = (field: any) => {
      if (Array.isArray(field) && field.length > 0) {
        return field[0].value;
      }
      return field?.value || field;
    };

    // Process and normalize the response
    const normalizedResponse: KYCResponse = {
      success: true,
      data: {
        // Extract personal information
        firstName: getFirstValue(result.data?.firstName),
        lastName: getFirstValue(result.data?.lastName),
        fullName: getFirstValue(result.data?.fullName),
        dateOfBirth: getFirstValue(result.data?.dob),
        age: parseInt(getFirstValue(result.data?.age)) || undefined,
        gender: getFirstValue(result.data?.sex),
        nationality: getFirstValue(result.data?.nationalityFull),
        documentNumber: getFirstValue(result.data?.documentNumber),
        documentType: getFirstValue(result.data?.documentType),
        issueDate: getFirstValue(result.data?.issued),
        expiryDate: getFirstValue(result.data?.expiry),
        issuingCountry: getFirstValue(result.data?.countryFull),
        address:
          `${getFirstValue(result.data?.address1) || ""} ${getFirstValue(result.data?.address2) || ""}`.trim(),

        // Document authenticity based on decision and warnings
        documentAuthenticity: {
          overall:
            result.decision === "accept"
              ? "pass"
              : result.decision === "review"
                ? "warning"
                : "fail",
          score: result.reviewScore || 0,
          details:
            result.warning?.map(
              (w: any) => `${w.description} (${w.severity})`,
            ) || [],
        },

        // AML check results
        aml: {
          match:
            result.warning?.some((w: any) => w.code === "AML_SANCTION") ||
            false,
          records:
            result.warning
              ?.filter((w: any) => w.code === "AML_SANCTION")
              .map((w: any) => ({
                name: w.data?.fullname?.[0],
                type: w.data?.entity,
                country: w.data?.nationality?.[0],
                source: w.data?.database,
              })) || [],
        },

        // Store raw response for debugging
        raw: result,
      },
    };

    console.log(JSON.stringify(normalizedResponse, null, 2));

    return NextResponse.json(normalizedResponse);
  } catch (error) {
    console.error("KYC API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
