export function cn(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}
