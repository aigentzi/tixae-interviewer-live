import axios, { AxiosResponse } from "axios";
import { Email, StripeCustomPlanModel } from "./zod-schemas";
import imageCompression, { Options as ImageCompressionOptions } from "browser-image-compression";

/**
 * Get the price id for an addon from a custom plan model
 *
 * @param plan
 *     The plan to get the price id for
 *
 * @param addonKey
 *     The key of the addon to get the price id for
 *
 * @returns
 *     The price id for the addon
 */
export const getPriceIdForAddon = (plan: StripeCustomPlanModel, addonKey: string) => {
  return plan?.addonsPrices
    ?.find((addon) => addon.key === addonKey)
    ?.stripePrices?.find(
      (price) => price.billingCycle === plan.billingCycle
    )?.priceId || "";
}

/**
 * Format a number with commas (1000 -> 1,000)
 *
 * @param number
 *     The number to format
 *
 * @returns
 *     The formatted number
 */
export const formatNumCommas = (number: number) => {
  // Convert the number to a string
  let numStr = number?.toString();

  // Use regular expressions to add commas based on the number's magnitude
  numStr = numStr.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");

  return numStr;
}

/**
 * Get the price from a custom plan
 *
 * @param plan
 *     The plan to get the price from
 *
 * @returns
 *     The price from the plan
 */
export const getPriceFromCustomPlan = (
  plan: StripeCustomPlanModel,
): {
  priceUsd: number;
  noDiscountPrice: number;
  discountValue: number;
} => {
  if (!plan) {
    return {
      priceUsd: 0,
      noDiscountPrice: 0,
      discountValue: 0,
    };
  }

  let priceUsd = 0;
  const numberOfFeatures = plan.features?.length || 0;

  // replace the price if its new v4 stripe pricing..
  if (plan?.stripePrices && plan?.stripePrices?.length > 0) {
    const price = plan?.stripePrices?.find(
      (price) => price.billingCycle === plan?.billingCycle
    );
    if (price) {
      priceUsd = price.usdAmount;
    }
  }

  plan?.features?.forEach((feature) => {
    if (feature?.freeTier?.enabled !== "always") {
      if (feature?.key === "custom-branding") {
        priceUsd +=
          plan?.addonsPrices
            ?.find((addon) => addon.key === "custom-branding")
            ?.stripePrices?.find(
              (price) => price.billingCycle === plan.billingCycle
            )?.usdAmount || 0;
      }
    }
  });

  if (plan?.features?.find((feature) => feature?.key === "mini-whitelabel")) {
    priceUsd += ((plan
      ?.addonsPrices
      ?.find((addon) => addon.key === "mini-whitelabel")
      ?.stripePrices
      ?.find(price => price.billingCycle === plan.billingCycle)
      ?.usdAmount) || 0);
  }

  const hasWhiteLabelAddon = plan?.features?.find(
    (feature) => feature?.key === "mini-whitelabel"
  );

  if (!hasWhiteLabelAddon) {
    // console.log(`DOESNT HAVE WHITE LABEL ADDON`)

    // if(customPlan?.limits?.maxAgents && customPlan?.limits?.maxAgents > (customPlan?.metadata?.includedAgents || 0)){
    //   priceUSD +=
    //     (customPlan.limits.maxAgents - (customPlan?.metadata?.includedAgents || 0)) *
    //     (customPlan?.addonsPrices?.find(addon => addon.key === 'agent-seat')?.stripePrices?.find(price => price.billingCycle === customPlan.billingCycle)?.usdAmount || 0);
    // }

    const addTeamMemberPrice =
      plan?.addonsPrices
        ?.find((addon) => addon.key === "add-team-member")
        ?.stripePrices?.find(
          (price) => price.billingCycle === plan.billingCycle
        )?.usdAmount || 0;
    priceUsd +=
      ((plan?.limits?.maxTeamMembers === "infinity" ? 50 : plan?.limits?.maxTeamMembers || 0) -
        (plan?.metadata?.includedTeamMembers === "infinity" ? 50 : plan?.metadata?.includedTeamMembers || 0)) *
      addTeamMemberPrice;

    if (
      plan?.limits?.maxAnalyticsReports &&
      plan.limits.maxAnalyticsReports >
      (plan?.metadata?.includedAnalyticsReports || 0) &&
      !hasWhiteLabelAddon
    ) {
      priceUsd +=
        Math.ceil(
          (plan?.limits?.maxAnalyticsReports === "infinity" ? 50 : plan?.limits?.maxAnalyticsReports || 0) -
          (plan?.metadata?.includedAnalyticsReports === "infinity" ? 50 : plan?.metadata?.includedAnalyticsReports || 0)
        ) *
        (plan?.addonsPrices
          ?.find((addon) => addon.key === "analytics-reporting")
          ?.stripePrices?.find(
            (price) => price.billingCycle === plan.billingCycle
          )?.usdAmount || 0);
    }

    if (plan?.limits?.maxHumanFollowUps && !hasWhiteLabelAddon) {
      priceUsd +=
        (plan?.limits?.maxHumanFollowUps === "infinity" ? 50 : plan?.limits?.maxHumanFollowUps || 0) -
        (plan?.metadata?.includedHumanFollowUps === "infinity" ? 50 : plan?.metadata?.includedHumanFollowUps || 0) *
        (plan?.addonsPrices
          ?.find((addon) => addon.key === "human-follow-up")
          ?.stripePrices?.find(
            (price) => price.billingCycle === plan.billingCycle
          )?.usdAmount || 0);
    }

    if (plan?.limits?.maxHrWorkflowAutomations && !hasWhiteLabelAddon) {
      priceUsd +=
        (plan?.limits?.maxHrWorkflowAutomations === "infinity" ? 50 : plan?.limits?.maxHrWorkflowAutomations || 0) -
        (plan?.metadata?.includedHrWorkflowAutomations === "infinity" ? 50 : plan?.metadata?.includedHrWorkflowAutomations || 0) *
        (plan?.addonsPrices
          ?.find((addon) => addon.key === "hr-workflow-automation")
          ?.stripePrices?.find(
            (price) => price.billingCycle === plan.billingCycle
          )?.usdAmount || 0);
    }
  }

  const discountValue =
    Math.round((plan?.features?.length || 0) / (numberOfFeatures || 0)) ||
    1;
  const finalPriceUsd = Math.round(
    priceUsd *
    (plan?.billingCycle === "yearly" &&
      !plan?.stripePrices?.length
      ? 10
      : 1)
  );

  return {
    priceUsd: finalPriceUsd,
    noDiscountPrice: priceUsd,
    discountValue,
  }
};

/**
 * This function returns the app url either from the client or server
 * depending on the Node.js environment variable NEXT_PUBLIC_NODE_ENV on the client
 * and the Node.js environment variable NODE_ENV on the server.
 *
 * @returns
 *     The app url either from the client or server
 *
 * @example
 *     getAppUrl() // "https://interviewer.tixae.ai/app"
 */
export const getAppUrl = () => {
  const isClient = typeof window !== "undefined";

  if (isClient) {
    return process.env.NEXT_PUBLIC_NODE_ENV === "production"
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/app`
      : "http://localhost:3000/app"
  }

  return process.env.NODE_ENV === "production"
    ? `${process.env.BASE_URL}/app`
    : "http://localhost:3000/app"
}

/**
 * This function returns the api url either from the client or server
 * depending on the Node.js environment variable NEXT_PUBLIC_NODE_ENV on the client
 * and the Node.js environment variable NODE_ENV on the server.
 *
 * @returns
 *     The api url either from the client or server
 *
 * @example
 *     getAPIUrl() // "https://interviewer.tixae.ai/api"
 */
export const getAPIUrl = () => {
  const isClient = typeof window !== "undefined";

  if (isClient) {
    return process.env.NEXT_PUBLIC_NODE_ENV === "production"
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/api`
      : "http://localhost:3000/api"
  }

  return process.env.NODE_ENV === "production"
    ? `${process.env.BASE_URL}/api`
    : "http://localhost:3000/api"
}

/**
 * Parse a CSV file in the browser and convert each row to a typed object.
 *
 * This helper works entirely on the client-side by utilising the `FileReader` API.
 * The provided `parser` callback is executed for every non-empty row (after the
 * optional header row) and must return the desired representation of that row
 * (e.g. a POJO that satisfies a specific interface). When parsing succeeds, the
 * resulting array of converted rows is forwarded to `onSuccess`. If an error is
 * encountered at any point, `onError` is invoked with the thrown error.
 *
 * Validation rules:
 * 1. If the CSV contains fewer than two lines (header + at least one data row)
 *    an error is raised.
 * 2. `requiredHeaders` must all be present in either the detected or explicitly
 *    provided `headers` array, otherwise an error detailing the missing
 *    headers is raised.
 *
 * @param file
 *     The CSV file to read and parse.
 *
 * @param parser
 *     A function that receives the raw row string and
 *     returns a typed representation of that row.
 *
 * @param onSuccess
 *     Callback executed with the fully-parsed data set when
 *     the operation completes successfully.
 *
 * @param onError
 *     Callback executed when any error is thrown during
 *     validation or parsing.
 *
 * @param requiredHeaders
 *     A list of column headers that must be present in the CSV. Validation is
 *     case-sensitive.
 *
 * @param headers
 *     Optional array of headers to use instead of reading the first line of the
 *     CSV. Useful for header-less files.
 *
 * @returns
 *     void – The function is asynchronous but does not return a Promise; results
 *     are communicated solely through the callbacks.
 */
export const parseCsvFile = ({
  file,
  parser,
  onSuccess,
  onError,
  requiredHeaders,
  headers
}: {
  file: File;
  parser: (row: string) => any;
  onSuccess: (data: any) => void;
  onError: (error: any) => void;
  requiredHeaders: string[];
  headers?: string[];
}) => {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      const rows = text.split("\n");
      if (rows.length < 2) {
        throw new Error("CSV file is invalid or empty");
      }

      const CSVHeaders = headers || rows[0].split(",").map((header) => header.trim());

      const missingHeaders = requiredHeaders.filter(
        (header) => !CSVHeaders.includes(header)
      );

      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(", ")}`);
      }

      const data = rows.slice(1).filter((row) => row.trim()).map(parser);
      onSuccess(data);
    } catch (error) {
      onError(error);
    }
  };

  reader.onerror = (e) => {
    onError(e);
  };

  reader.readAsText(file);
};

/**
 * Convenience wrapper around `parseCsvFile` that extracts a list of `Email`
 * objects from a CSV file.
 *
 * The function assumes the CSV describes an arbitrary set of columns but must
 * at minimum contain an `email` column. The mapping between CSV columns and
 * the `Email` model fields is driven by the `headers` array: the value at
 * position *n* in `headers` is assigned to the property with the same name on
 * the resulting `Email` instance for the *n*-th cell of each row.
 *
 * Example:
 * ```csv
 * email,firstName,lastName
 * jane.doe@example.com,Jane,Doe
 * ```
 *
 * ```ts
 * extractEmailsFromCsv({
 *   file,
 *   headers: ["email", "firstName", "lastName"],
 *   onSuccess: (emails) => console.log(emails),
 *   onError: console.error,
 * })
 * ```
 *
 * @param file
 *     The CSV file to process.
 *
 * @param headers
 *     Ordered list of headers that correspond to the CSV columns. Must include
 *     the string literal "email".
 *
 * @param onSuccess
 *     Invoked with the parsed list of `Email` objects.
 *
 * @param onError
 *     Invoked when the underlying call to `parseCsvFile` fails.
 *
 * @returns
 *     void – Delegates to `parseCsvFile`, which communicates exclusively via the
 *     provided callbacks.
 */
export const extractEmailsFromCsv = ({
  file,
  headers,
  onSuccess,
  onError,
}: {
  file: File;
  headers: string[];
  onSuccess: (data: Email[]) => void;
  onError: (error: any) => void;
}) => {
  return parseCsvFile({
    file,
    parser: (row) => {
      const values = row.split(",").map((cell) => cell.trim());
      const email: Email = {} as Email;
      headers.forEach((header, index) => {
        email[header as keyof Email] = values[index] || "";
      });
      return email;
    },
    onSuccess,
    onError,
    requiredHeaders: ["email"],
    headers
  });
};

/**
 * Upload a file to BunnyCDN and return the url of the uploaded file
 *
 * The file is compressed using the `imageCompression` library before being uploaded
 * to reduce the file size. The compression options are passed to the `imageCompression`
 * library.
 *
 * The file is uploaded to the `/api/upload` endpoint.
 *
 * @param file
 *     The file to upload
 *
 * @param params
 *     The parameters to pass to the upload endpoint
 *
 * @param compressionOptions
 *     The compression options to use
 *
 * @returns
 *     The url of the uploaded file
 */
export const uploadImageToBunny = async (input: {
  file: File;
  params: { [key: string]: string };
  compressionOptions: ImageCompressionOptions;
  onProgress?: (percent: number) => void;
}) => {
  try {
    const compressedFile = await imageCompression(input.file, input.compressionOptions);
    console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
    console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`); // smaller than maxSizeMB

    const formData = new FormData();
    formData.append("file", compressedFile, compressedFile.name);
    Object.entries(input.params).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const result = await axios.post(getAPIUrl() + "/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (e) => {
        if (e.total) {
          const percent = Math.round((e.loaded * 100) / e.total);
          input.onProgress?.(percent);
        }
      },
    }) as AxiosResponse<{
      success: boolean;
      error?: string;
      url?: string;
    }>;

    if (result.data.success) {
      return result.data.url;
    }

    throw new Error(result.data.error || "Upload failed");
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Upload failed");
  }
}

/**
 * This function gets a presigned url from the `/api/upload-large` endpoint.
 * The presigned url is used to upload the file to BunnyCDN.
 *
 * The presigned url is returned as an object with the following properties:
 * - `uploadUrl`: The presigned url to upload the file to
 * - `viewUrl`: The url to view the file
 *
 * @param file
 *     The PDF file to upload. The file name and content type are used to generate
 *     the presigned url.
 *
 * @returns
 *     The presigned url as an object with the following properties:
 *     - `uploadUrl`: The presigned url to upload the file to
 *     - `viewUrl`: The url to view the file
 */
export const getBunnyUploadUrl = async (file: File, folder: string) => {
  try {
    const result = await axios.post(getAPIUrl() + "/upload-large", {
      fileName: file.name,
      contentType: file.type,
      folder,
    }, {
      headers: {
        "Content-Type": "application/json",
      },
    }) as AxiosResponse<{
      success: boolean;
      error?: string;
      uploadUrl?: string;
      viewUrl?: string;
    }>;

    if (result.data.success) {
      return {
        uploadUrl: result.data.uploadUrl,
        viewUrl: result.data.viewUrl,
      };
    }

    throw new Error(result.data.error || "Upload failed");
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Upload failed");
  }
}
