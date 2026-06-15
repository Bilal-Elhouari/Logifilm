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
