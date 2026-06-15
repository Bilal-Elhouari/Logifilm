import { app, BrowserWindow, ipcMain, net, session, shell } from "electron";
import { autoUpdater } from "electron-updater";
import path from "path";

// Check if we're running from dist (production) or dev
// app.isPackaged is true when running from built executable, false in dev
const isClientMode = process.env.LOGIFILM_CLIENT_MODE === "1";
const isDev = !app.isPackaged && !isClientMode;
let mainWindow: BrowserWindow | null = null;

type UpdateStatus = {
  state: "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "manual-download" | "error" | "disabled";
  version?: string;
  percent?: number;
  message?: string;
};

type GitHubRelease = {
  tag_name: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
};

let macDmgUrl: string | null = null;
let macUpdateVersion: string | null = null;

function sendUpdateStatus(status: UpdateStatus) {
  mainWindow?.webContents.send("update-status", status);
}

function compareVersions(left: string, right: string) {
  const normalize = (value: string) =>
    value.replace(/^v/, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const a = normalize(left);
  const b = normalize(right);
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

async function checkForMacManualUpdate() {
  sendUpdateStatus({ state: "checking" });

  const response = await net.fetch(
    "https://api.github.com/repos/Bilal-Elhouari/Logifilm/releases/latest",
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": `Logifilm/${app.getVersion()}`,
      },
    },
  );

  if (response.status === 404) {
    sendUpdateStatus({
      state: "not-available",
      message: "Aucune mise a jour publiee pour le moment.",
    });
    return;
  }
  if (!response.ok) throw new Error(`GitHub release request failed: ${response.status}`);

  const release = await response.json() as GitHubRelease;
  const version = release.tag_name.replace(/^v/, "");

  if (compareVersions(version, app.getVersion()) <= 0) {
    sendUpdateStatus({ state: "not-available", version: app.getVersion() });
    return;
  }

  const architecture = process.arch === "arm64" ? "arm64" : "x64";
  const dmg = release.assets.find((asset) =>
    asset.name.endsWith(".dmg") && asset.name.includes(architecture),
  );

  if (!dmg) {
    sendUpdateStatus({
      state: "error",
      message: `La version ${version} ne contient pas de fichier compatible avec ce Mac (${architecture}).`,
    });
    return;
  }

  macDmgUrl = dmg.browser_download_url;
  macUpdateVersion = version;
  sendUpdateStatus({
    state: "available",
    version,
    message: "Une nouvelle version macOS est disponible. Son installation sera manuelle.",
  });
}

function sendFriendlyUpdateError(error: unknown) {
  const technicalMessage = error instanceof Error ? error.message : String(error);
  const noPublishedRelease =
    technicalMessage.includes("Unable to find latest version") ||
    technicalMessage.includes("Cannot parse releases feed") ||
    technicalMessage.includes("latest.yml") ||
    technicalMessage.includes("404");

  if (noPublishedRelease) {
    sendUpdateStatus({
      state: "not-available",
      message: "Aucune mise a jour publiee pour le moment.",
    });
    return;
  }

  sendUpdateStatus({
    state: "error",
    message: "Verification impossible. Controlez votre connexion puis reessayez.",
  });
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on("checking-for-update", () => {
    sendUpdateStatus({ state: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    sendUpdateStatus({ state: "available", version: info.version });
  });

  autoUpdater.on("update-not-available", (info) => {
    sendUpdateStatus({ state: "not-available", version: info.version });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendUpdateStatus({
      state: "downloading",
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    sendUpdateStatus({ state: "downloaded", version: info.version });
  });

  autoUpdater.on("error", (error) => {
    sendFriendlyUpdateError(error);
  });
}

// Disable GPU cache in development to avoid permission errors
if (isDev) {
  app.commandLine.appendSwitch('disable-http-cache');
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,

    transparent: false,
    titleBarStyle: "default",
    autoHideMenuBar: true,
    backgroundColor: "#1a1a1a",
    icon: (() => {
      const isMac = process.platform === "darwin";
      const name = isMac ? "logoFenetreMac.icns" : "logoBureau.ico";
      return isDev
        ? path.join(__dirname, `../public/${name}`)
        : path.join(__dirname, `../dist/${name}`);
    })(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: false, // Disable DevTools completely to prevent auto-open
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  mainWindow = win;

  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  // Prevent DevTools from opening automatically
  win.webContents.on('devtools-opened', () => {
    win.webContents.closeDevTools();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });

  // Always try localhost first in dev mode
  if (isDev) {
    console.log("🔧 Development mode: Loading from http://localhost:5173");
    win.loadURL("http://localhost:5173");

    // Open DevTools in dev mode (commented out to prevent auto-open)
    // win.webContents.openDevTools();
  } else {
    console.log("📦 Production mode: Loading from dist/index.html");
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  if (app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived(
      { urls: ["file://*/*"] },
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [
              "default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
            ],
          },
        });
      },
    );
  }

  // IPC Handler for checking if app is packaged
  ipcMain.on('app-is-packaged', (event) => {
    event.returnValue = app.isPackaged || isClientMode;
  });

  // IPC Handler for app version
  ipcMain.on('get-app-version', (event) => {
    event.returnValue = app.getVersion();
  });

  ipcMain.handle("check-for-updates", async () => {
    if (!app.isPackaged) {
      sendUpdateStatus({ state: "disabled", message: "La verification est disponible dans l'application installee." });
      return { ok: false };
    }
    try {
      if (process.platform === "darwin") {
        await checkForMacManualUpdate();
        return { ok: true };
      }
      await autoUpdater.checkForUpdates();
      return { ok: true };
    } catch (error) {
      sendFriendlyUpdateError(error);
      return { ok: false };
    }
  });

  ipcMain.handle("download-update", async () => {
    if (!app.isPackaged) return { ok: false };
    try {
      if (process.platform === "darwin") {
        if (!macDmgUrl) await checkForMacManualUpdate();
        if (!macDmgUrl) return { ok: false };

        await shell.openExternal(macDmgUrl);
        sendUpdateStatus({
          state: "manual-download",
          version: macUpdateVersion ?? undefined,
          message: "Le DMG est en cours de telechargement. Ouvrez-le, puis remplacez Logifilm dans Applications.",
        });
        return { ok: true };
      }
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch {
      sendUpdateStatus({
        state: "error",
        message: "Telechargement impossible. Controlez votre connexion puis reessayez.",
      });
      return { ok: false };
    }
  });

  ipcMain.handle("install-update", () => {
    if (!app.isPackaged || process.platform === "darwin") return { ok: false };
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  });

  ipcMain.handle("open-downloads", async () => {
    const result = await shell.openPath(app.getPath("downloads"));
    return { ok: result === "", message: result || undefined };
  });

  ipcMain.handle("open-releases", async () => {
    await shell.openExternal("https://github.com/Bilal-Elhouari/Logifilm/releases");
  });

  configureAutoUpdater();
  createWindow();

  if (app.isPackaged) {
    setTimeout(() => {
      if (process.platform === "darwin") {
        checkForMacManualUpdate().catch(sendFriendlyUpdateError);
      } else {
        autoUpdater.checkForUpdates().catch(sendFriendlyUpdateError);
      }
    }, 5000);
  }
});

