export { };

export type UpdateStatus = {
    state: "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "manual-download" | "error" | "disabled";
    version?: string;
    percent?: number;
    message?: string;
};

declare global {
    interface Window {
        isElectron?: boolean;
        platform?: {
            os: string;
            isProd: boolean;
            isElectron: boolean;
            version: string;
        };
        electron?: {
            getDeviceInfo: () => Promise<{ id: string; name: string; platform: string }>;
            checkForUpdates: () => Promise<{ ok: boolean; message?: string }>;
            downloadUpdate: () => Promise<{ ok: boolean; message?: string }>;
            installUpdate: () => Promise<{ ok: boolean }>;
            openDownloads: () => Promise<{ ok: boolean; message?: string }>;
            openReleases: () => Promise<void>;
            onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
        };
    }
}
