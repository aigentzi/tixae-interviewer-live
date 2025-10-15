export interface KYCDocumentData {
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
}

export interface KYCDocumentAuthenticity {
  overall?: "pass" | "fail" | "warning";
  score?: number;
  details?: string[];
}

export interface KYCAMLRecord {
  name?: string;
  type?: string;
  country?: string;
  source?: string;
}

export interface KYCAML {
  match?: boolean;
  records?: KYCAMLRecord[];
}

export interface KYCVerificationResult {
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
    documentAuthenticity?: KYCDocumentAuthenticity;
    aml?: KYCAML;

    // Raw response from ID Analyzer
    raw?: any;
  };
  error?: string;
  message?: string;
}

export interface KYCRequest {
  document: string; // base64 encoded image (front side)
  documentBack?: string; // base64 encoded image (back side for ID cards)
  documentType?: "passport" | "driver_license" | "id_card";
  profile?: string; // KYC profile ID
}

export type KYCDocumentType = "passport" | "driver_license" | "id_card";

export type KYCCaptureMode = "upload" | "camera";

export interface KYCState {
  step: "document_type" | "capture" | "processing" | "results";
  documentType?: KYCDocumentType;
  captureMode?: KYCCaptureMode;
  documentImage?: string;
  documentImageBack?: string; // For ID cards back side
  currentSide?: "front" | "back"; // Track which side we're capturing
  forceDesktopCapture?: boolean; // Force desktop capture instead of QR code
  isProcessing: boolean;
  result?: KYCVerificationResult;
  error?: string;
}

export interface KYCStepProps {
  onNext: () => void;
  onPrev: () => void;
  state: KYCState;
  updateState: (updates: Partial<KYCState>) => void;
}
