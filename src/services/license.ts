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

/* The answer is shared by every screen and forgotten when the account changes. */
let adminCheck: { userId: string | null; answer: Promise<boolean> } | null = null;
supabase.auth.onAuthStateChange(() => {
  adminCheck = null;
});

/** Cached version of isPlatformAdmin() for the signed-in account. */
export async function amIAdmin(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id ?? null;
  if (!userId) return false;
  if (!adminCheck || adminCheck.userId !== userId) {
    adminCheck = { userId, answer: isPlatformAdmin() };
  }
  return adminCheck.answer;
}

/** Forget the cached answer (after an administrator role change). */
export function forgetAdminCheck() {
  adminCheck = null;
}

/* ---------------- Team (administrators only) ---------------- */

export type TeamMember = {
  user_id: string;
  email: string | null;
  is_admin: boolean;
  licence_expires_at: string | null;
  company_ids: string[];
};

/** Every account that can use the app, with its role and the companies it can open. */
export async function listTeam(): Promise<TeamMember[]> {
  const { data, error } = await supabase.rpc("admin_team");
  if (error) throw error;
  return ((data || []) as TeamMember[]).map((member) => ({ ...member, company_ids: member.company_ids ?? [] }));
}

/** Give a colleague access to a company, or take it away. */
export async function setCompanyAccess(userId: string, companyId: string, grant: boolean) {
  const { error } = await supabase.rpc("admin_set_company_access", {
    p_user_id: userId,
    p_company_id: companyId,
    p_grant: grant,
  });
  if (error) throw error;
}

/** Name or remove an administrator (never yourself, never the last one). */
export async function setPlatformAdmin(userId: string, admin: boolean) {
  const { error } = await supabase.rpc("admin_set_platform_admin", { p_user_id: userId, p_admin: admin });
  if (error) throw error;
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
export async function decideRequest(requestId: string, approve: boolean, validDays: number | null, makeAdmin = false) {
  const { data, error } = await supabase.rpc("admin_decide_request", {
    p_request_id: requestId,
    p_approve: approve,
    p_valid_days: approve ? validDays : null,
    p_make_admin: approve && makeAdmin,
  });
  if (error) throw error;
  return data as { ok: boolean; status?: string; reason?: string };
}
