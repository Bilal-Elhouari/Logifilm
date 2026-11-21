import { supabase } from "../supabaseClient";

export type LicenseStatus = {
  valid: boolean;
  reason?: string;
  label?: string;
  expires_at?: string | null;
  max_accounts?: number;
};

export async function checkLicense(): Promise<LicenseStatus> {
  const { data, error } = await supabase.rpc("check_license");
  if (error) throw error;
  return data as LicenseStatus;
}

export async function activateLicense(key: string): Promise<LicenseStatus> {
  const { data, error } = await supabase.rpc("activate_license", {
    p_key: key.trim().toUpperCase(),
  });
  if (error) throw error;
  return data as LicenseStatus;
}

/* ---------------- Access requests (account approval) ---------------- */

export type AccessRequestStatus = "pending" | "approved" | "rejected" | "none";

/** Where the signed-in account's access request stands. */
export async function myAccessRequest(): Promise<AccessRequestStatus> {
  const { data, error } = await supabase.rpc("my_license_request");
  if (error) throw error;
  return ((data as { status?: AccessRequestStatus } | null)?.status ?? "none");
}

/** True when the signed-in account is a platform administrator. */
export async function isPlatformAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) return false;
  return data === true;
}

export type PendingRequest = { id: string; email: string | null; created_at: string };

/** Administrators only: accounts waiting for approval, oldest first. */
export async function listPendingRequests(): Promise<PendingRequest[]> {
  const { data, error } = await supabase.rpc("admin_pending_requests");
  if (error) throw error;
  return (data || []) as PendingRequest[];
}

/**
 * Administrators only: approve (activates a licence on the account right away,
 * `validDays` null = no expiry) or decline a request.
 */
export async function decideRequest(requestId: string, approve: boolean, validDays: number | null) {
  const { data, error } = await supabase.rpc("admin_decide_request", {
    p_request_id: requestId,
    p_approve: approve,
    p_valid_days: approve ? validDays : null,
  });
  if (error) throw error;
  return data as { ok: boolean; status?: string; reason?: string };
}
