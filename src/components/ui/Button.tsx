import { ButtonHTMLAttributes } from "react";
import { usePlatform } from "@/platform/PlatformProvider";
import { cn } from "@/utils/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

export default function Button({ className, variant = "primary", ...rest }: Props) {
  const { platform } = usePlatform();

  const base = "px-4 py-2 text-sm transition border";
  const mac =
    variant === "primary"
      ? "rounded-xl bg-[var(--accent)] text-white border-transparent hover:opacity-95 shadow-[var(--shadow)]"
      : "rounded-xl bg-[var(--accent-ghost)] text-[var(--text)] border-transparent hover:border-[var(--accent)]/40";
  const win =
    variant === "primary"
      ? "rounded-md bg-transparent text-white border-[var(--accent)] hover:bg-[var(--accent)]/15"
      : "rounded-md bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--accent)]/40";

  return <button className={cn(base, platform === "mac" ? mac : win, className)} {...rest} />;
}
