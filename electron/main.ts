import { app, BrowserWindow } from "electron";
import path from "path";

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    transparent: false, // ❌ Désactivé pour le debug
    titleBarStyle: "default", // Remis par défaut
    // vibrancy: "sidebar", 
    backgroundColor: "#1a1a1a", // Fond noir/gris
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: true, // Force DevTools functionality
    },
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);
