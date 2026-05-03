import { describe, expect, it } from "vitest";
import { normalizeManifest, parseManifestJson } from "./manifest";

const validManifest = {
  format: "cardmark-manifest",
  version: "0",
  deckType: "tarot-78",
  markerSizeMm: 12,
  cards: [
    {
      id: 0,
      group: "Старшие арканы",
      name: "Шут",
      markerId: 0
    }
  ]
};

describe("parseManifestJson", () => {
  it("accepts a valid minimal manifest", () => {
    const result = parseManifestJson(JSON.stringify(validManifest));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.cards).toHaveLength(1);
      expect(result.manifest.cards[0]?.name).toBe("Шут");
    }
  });

  it("returns a validation error for invalid JSON", () => {
    const result = parseManifestJson("{ invalid");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("invalid_json");
    }
  });

  it("rejects a manifest without cards", () => {
    const { cards: _cards, ...withoutCards } = validManifest;
    const result = parseManifestJson(JSON.stringify(withoutCards));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "required_array")).toBe(true);
    }
  });

  it("rejects an empty cards array", () => {
    const result = parseManifestJson(JSON.stringify({ ...validManifest, cards: [] }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "empty_cards")).toBe(true);
    }
  });

  it("rejects markerId outside the 0..127 range", () => {
    const result = parseManifestJson(
      JSON.stringify({
        ...validManifest,
        cards: [{ ...validManifest.cards[0], markerId: 128 }]
      })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "integer_too_large")).toBe(true);
    }
  });

  it("rejects non-integer markerId", () => {
    const result = parseManifestJson(
      JSON.stringify({
        ...validManifest,
        cards: [{ ...validManifest.cards[0], markerId: 1.5 }]
      })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "required_integer")).toBe(true);
    }
  });

  it("rejects duplicate markerId values", () => {
    const result = parseManifestJson(
      JSON.stringify({
        ...validManifest,
        cards: [
          validManifest.cards[0],
          { id: 1, group: "Старшие арканы", name: "Маг", markerId: 0 }
        ]
      })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "duplicate_marker_id")).toBe(true);
    }
  });

  it("rejects cards without name", () => {
    const { name: _name, ...cardWithoutName } = validManifest.cards[0];
    const result = parseManifestJson(
      JSON.stringify({
        ...validManifest,
        cards: [cardWithoutName]
      })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.path === "$.cards[0].name")).toBe(true);
    }
  });

  it("normalizes numeric version to string", () => {
    const result = parseManifestJson(JSON.stringify({ ...validManifest, version: 0 }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.version).toBe("0");
    }
  });

  it("rejects markerSizeMm less than or equal to zero", () => {
    const result = parseManifestJson(JSON.stringify({ ...validManifest, markerSizeMm: 0 }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "required_positive_number")).toBe(true);
    }
  });

  it("ignores unknown fields", () => {
    const result = parseManifestJson(
      JSON.stringify({
        ...validManifest,
        unknownRootField: true,
        cards: [{ ...validManifest.cards[0], unknownCardField: "ok" }]
      })
    );

    expect(result.ok).toBe(true);
  });
});

describe("normalizeManifest", () => {
  it("returns normalized manifest for valid data", () => {
    expect(normalizeManifest({ ...validManifest, version: 0 }).version).toBe("0");
  });

  it("throws a validation error for invalid data", () => {
    expect(() => normalizeManifest({ ...validManifest, cards: [] })).toThrow("Manifest validation failed");
  });
});

