import { usePlatform } from "@/platform/PlatformProvider";
import { cn } from "@/utils/cn";

export default function TitleBar() {
  const { platform, setPlatform } = usePlatform();

  return (
    <div
      className={cn(
        "w-full flex items-center justify-between px-4 h-12 border-b border-[var(--border)] text-[var(--text)]",
        platform === "mac" ? "bg-[var(--surface)] rounded-t-[var(--radius)] backdrop-blur-lg" : "bg-transparent"
      )}
      style={{ WebkitAppRegion: "drag" }}
    >
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" }}>
        {platform === "mac" && (
          <div className="flex gap-2">
            <span className="h-3.5 w-3.5 rounded-full bg-[#ff5f57] border border-black/10"></span>
            <span className="h-3.5 w-3.5 rounded-full bg-[#febc2e] border border-black/10"></span>
            <span className="h-3.5 w-3.5 rounded-full bg-[#28c840] border border-black/10"></span>
          </div>
        )}
        <span className="ml-2 font-semibold opacity-80">Crew Management Software</span>
      </div>

      <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" }}>
        <button
          onClick={() => setPlatform("mac")}
          className={cn(
            "px-3 py-1 text-sm rounded-md transition border border-transparent",
            platform === "mac"
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--accent-ghost)] text-[var(--text)] hover:border-[var(--accent)]/40"
          )}
        >
          macOS
        </button>
        <button
          onClick={() => setPlatform("win")}
          className={cn(
            "px-3 py-1 text-sm rounded-md transition border",
            platform === "win"
              ? "bg-[var(--accent)] text-white border-transparent"
              : "bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--accent)]/40"
          )}
        >
          Windows
        </button>
      </div>
    </div>
  );
}
