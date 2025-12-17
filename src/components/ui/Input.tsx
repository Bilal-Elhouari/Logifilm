import { InputHTMLAttributes } from "react";
import { usePlatform } from "@/platform/PlatformProvider";
import { cn } from "@/utils/cn";

type Props = InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className, ...rest }: Props) {
  const { platform } = usePlatform();

  const base = "w-full px-3 py-2 text-sm outline-none transition bg-transparent";
  const mac = "rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[var(--accent)]/60";
  const win = "rounded-md border border-[var(--border)] bg-[var(--surface)] focus:border-[var(--accent)]/60";

  return <input className={cn(base, platform === "mac" ? mac : win, className)} {...rest} />;
}
