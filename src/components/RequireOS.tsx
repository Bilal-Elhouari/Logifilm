import React from "react";
import { Navigate } from "react-router-dom";

type OSType = "darwin" | "win32";

interface RequireOSProps {
    children: React.ReactNode;
    os: OSType;
}

/**
 * RequireOS
 * 
 * A guard component that enforces OS-specific access strictness in PRODUCTION.
 * 
 * Behavior:
 * - DEV / Web: Always renders children (allows access).
 * - PROD (Electron): 
 *   - If current OS matches required OS -> Renders children.
 *   - If mismatch -> Redirects to the correct OS root.
 */
export default function RequireOS({ children, os }: RequireOSProps) {
    // If not in Electron or not defined, assume accessible (or handle differently)
    const platformInfo = window.platform;

    // 1. DEVELOPMENT / WEB: Allow everything
    // We use the same loose check as App.tsx to determine if we are strictly in Prod Electron
    const isProdElectron = platformInfo?.isProd === true;

    if (!isProdElectron) {
        return <>{children}</>;
    }

    // 2. PRODUCTION: Strict Check
    const currentOS = platformInfo?.os;

    // If we require 'darwin' (Mac) but are on 'win32' (Windows)
    if (os === "darwin" && currentOS === "win32") {
        // Redirect to Windows home/start
        return <Navigate to="/windows" replace />;
    }

    // If we require 'win32' (Windows) but are on 'darwin' (Mac)
    if (os === "win32" && currentOS === "darwin") {
        // Redirect to Mac home/start
        return <Navigate to="/mac" replace />;
    }

    // Match or unknown OS (shouldn't happen in strict prod if configured right) -> Render
    return <>{children}</>;
}
