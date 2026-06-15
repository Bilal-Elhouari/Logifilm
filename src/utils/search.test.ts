import { describe, expect, it } from "vitest";
import { normalizeSearchTerm, uniqueCrewMembers } from "./search";

describe("normalizeSearchTerm", () => {
  it("normalizes accents, whitespace and query punctuation", () => {
    expect(normalizeSearchTerm("  Bil\u00e1l,   Elhouari%  ")).toBe("bilal elhouari");
  });
});

describe("uniqueCrewMembers", () => {
  it("deduplicates people by normalized ID card", () => {
    const result = uniqueCrewMembers([
      { id_card_number: "AB 123", first_name: "One" },
      { id_card_number: "ab 123", first_name: "Two" },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].first_name).toBe("One");
  });
});
