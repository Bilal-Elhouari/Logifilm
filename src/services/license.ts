import { supabase } from "../supabaseClient";

export type LicenseStatus = {
  valid: boolean;
  reason?: string;
  label?: string;
  expires_at?: string | null;
  max_devices?: number;
};

export type DeviceInfo = {
  id: string;
  name: string;
  platform: string;
};

function browserDeviceInfo(): DeviceInfo {
  const storageKey = "logifilm-development-device-id";
  let id = localStorage.getItem(storageKey);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(storageKey, id);
  }

  return {
    id,
    name: "Development browser",
    platform: navigator.platform,
  };
}

export async function getDeviceInfo() {
  return window.electron?.getDeviceInfo() ?? browserDeviceInfo();
}

export async function checkLicense(deviceId: string): Promise<LicenseStatus> {
  const { data, error } = await supabase.rpc("check_license", {
    p_device_id: deviceId,
  });
  if (error) throw error;
  return data as LicenseStatus;
}

export async function activateLicense(key: string, device: DeviceInfo): Promise<LicenseStatus> {
  const { data, error } = await supabase.rpc("activate_license", {
    p_key: key.trim().toUpperCase(),
    p_device_id: device.id,
    p_device_name: `${device.name} (${device.platform})`,
  });
  if (error) throw error;
  return data as LicenseStatus;
}
