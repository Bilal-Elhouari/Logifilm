import { contextBridge } from "electron";

// Expose isElectron flag to detect Electron environment in React
contextBridge.exposeInMainWorld("isElectron", true);

// Expose electron API (for future use)
contextBridge.exposeInMainWorld("electron", {});
