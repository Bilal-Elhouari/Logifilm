import { usePlatform } from "@/platform/PlatformProvider";
import TitleBar from "./TitleBar";
import { cn } from "@/utils/cn";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { platform } = usePlatform();

  return (
    <div className="h-screen w-screen bg-[var(--bg)] text-[var(--text)]">
      <div
        className={cn(
          "max-w-[1200px] mx-auto h-screen flex flex-col",
          platform === "mac" ? "p-6" : "p-8"
        )}
      >
        <div
          className={cn(
            "flex-1 flex flex-col border border-[var(--border)] shadow-[var(--shadow)]",
            platform === "mac"
              ? "bg-[var(--surface)] rounded-[var(--radius)] backdrop-blur-lg"
              : "bg-[var(--surface)] rounded-[var(--radius)]"
          )}
        >
          <TitleBar />
          <main className={cn("flex-1 overflow-y-auto", platform === "mac" ? "p-6" : "p-8")}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
