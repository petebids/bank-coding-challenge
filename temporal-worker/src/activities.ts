import { ApplicationFailure } from "@temporalio/activity";
import type { CommissionQuoteRequest, CommissionQuoteResult } from "@commission-quote/shared";
import { MOCK_OUTCOME_HEADER } from "@commission-quote/shared";

export interface CallVendorApiInput {
  request: CommissionQuoteRequest;
  /** Test-only override forwarded to the mock vendor to force success/error. */
  forcedOutcome?: "success" | "error";
}

export async function callVendorApi(
  input: CallVendorApiInput,
): Promise<CommissionQuoteResult> {
  const baseUrl = process.env.VENDOR_API_URL ?? "http://localhost:4000";
  const apiKey = process.env.VENDOR_API_KEY;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["api-key"] = apiKey;
  if (input.forcedOutcome) headers[MOCK_OUTCOME_HEADER] = input.forcedOutcome;

  const response = await fetch(`${baseUrl}/commission-quotes`, {
    method: "POST",
    headers,
    body: JSON.stringify(input.request),
  });

  if (response.status === 401) {
    // Bad credentials will never succeed on retry — fail the workflow immediately.
    const body = await response.text();
    throw ApplicationFailure.nonRetryable(
      `Vendor rejected the api-key: ${body}`,
      "VendorAuthError",
    );
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vendor Commission Quote API returned ${response.status}: ${body}`);
  }

  return (await response.json()) as CommissionQuoteResult;
}
