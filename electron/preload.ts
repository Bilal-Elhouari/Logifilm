import { contextBridge, ipcRenderer } from "electron";

// Expose isElectron flag to detect Electron environment in React
contextBridge.exposeInMainWorld("isElectron", true);

// Get production status from main process
const isProd = ipcRenderer.sendSync('app-is-packaged');
const appVersion = ipcRenderer.sendSync('get-app-version');

// Expose platform info
contextBridge.exposeInMainWorld("platform", {
    os: process.platform,
    isProd: isProd,
    isElectron: true,
    version: appVersion
});

contextBridge.exposeInMainWorld("electron", {
    checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
    downloadUpdate: () => ipcRenderer.invoke("download-update"),
    installUpdate: () => ipcRenderer.invoke("install-update"),
    openReleases: () => ipcRenderer.invoke("open-releases"),
    onUpdateStatus: (callback: (status: unknown) => void) => {
        const listener = (_event: Electron.IpcRendererEvent, status: unknown) => callback(status);
        ipcRenderer.on("update-status", listener);
        return () => ipcRenderer.removeListener("update-status", listener);
    },
});
