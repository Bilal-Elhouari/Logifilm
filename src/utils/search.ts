export function normalizeSearchTerm(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function uniqueCrewMembers<T extends {
  id_card_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  mobile?: string | null;
}>(members: T[]) {
  const byPerson = new Map<string, T>();

  members.forEach((member) => {
    const idCard = normalizeSearchTerm(member.id_card_number || "").replace(/\s+/g, "");
    const fallbackKey = [
      member.first_name,
      member.last_name,
      member.date_of_birth,
      member.phone,
      member.mobile,
    ]
      .map((value) => normalizeSearchTerm(value || ""))
      .join("|");
    const key = idCard || fallbackKey;

    if (key && key !== "||||" && !byPerson.has(key)) {
      byPerson.set(key, member);
    }
  });

  return Array.from(byPerson.values());
}
