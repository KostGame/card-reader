import type {
  CardMarkCard,
  CardMarkManifest,
  ManifestParseResult,
  ManifestTechnicalInfo,
  ManifestValidationMessage,
  ManifestValidationResult
} from "./types";

const MARKER_ID_MIN = 0;
const MARKER_ID_MAX = 127;

export class ManifestValidationError extends Error {
  readonly errors: ManifestValidationMessage[];

  constructor(errors: ManifestValidationMessage[]) {
    super("Manifest validation failed");
    this.name = "ManifestValidationError";
    this.errors = errors;
  }
}

export function parseManifestJson(input: string): ManifestParseResult {
  try {
    return validateManifest(JSON.parse(input));
  } catch {
    return {
      ok: false,
      errors: [
        {
          path: "$",
          code: "invalid_json",
          message: "JSON не удалось прочитать. Проверьте синтаксис файла."
        }
      ],
      warnings: []
    };
  }
}

export function validateManifest(value: unknown): ManifestValidationResult {
  const errors: ManifestValidationMessage[] = [];
  const warnings: ManifestValidationMessage[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      errors: [
        {
          path: "$",
          code: "root_not_object",
          message: "Корневое значение manifest должно быть объектом."
        }
      ],
      warnings
    };
  }

  const format = readRequiredString(value, "format", "$.format", errors);
  const version = readRequiredVersion(value, errors);
  const deckType = readRequiredString(value, "deckType", "$.deckType", errors);
  const markerSizeMm = readRequiredPositiveNumber(value, "markerSizeMm", "$.markerSizeMm", errors);
  const cards = readCards(value, errors);

  const duplicateMarkerIds = findDuplicateMarkerIds(cards);
  for (const markerId of duplicateMarkerIds) {
    errors.push({
      path: "$.cards",
      code: "duplicate_marker_id",
      message: `markerId ${markerId} повторяется. В CardMark v0 markerId должен быть уникальным внутри manifest.`
    });
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings
    };
  }

  return {
    ok: true,
    manifest: {
      format: format as string,
      version: version as string,
      deckType: deckType as string,
      markerSizeMm: markerSizeMm as number,
      cards
    },
    warnings
  };
}

export function normalizeManifest(value: unknown): CardMarkManifest {
  const result = validateManifest(value);

  if (!result.ok) {
    throw new ManifestValidationError(result.errors);
  }

  return result.manifest;
}

export function getManifestTechnicalInfo(manifest: CardMarkManifest): ManifestTechnicalInfo {
  const markerIds = manifest.cards.map((card) => card.markerId);
  const min = Math.min(...markerIds);
  const max = Math.max(...markerIds);

  return {
    deckType: manifest.deckType,
    version: manifest.version,
    markerSizeMm: manifest.markerSizeMm,
    cardsCount: manifest.cards.length,
    markerIdRange: `${min}..${max}`,
    duplicateMarkerIds: findDuplicateMarkerIds(manifest.cards)
  };
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ManifestValidationMessage[]
): string | undefined {
  const value = record[key];

  if (typeof value !== "string") {
    errors.push({
      path,
      code: "required_string",
      message: `${path} обязателен и должен быть строкой.`
    });
    return undefined;
  }

  return value;
}

function readRequiredVersion(
  record: Record<string, unknown>,
  errors: ManifestValidationMessage[]
): string | undefined {
  const value = record.version;

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  errors.push({
    path: "$.version",
    code: "required_version",
    message: "$.version обязателен и должен быть строкой или числом."
  });
  return undefined;
}

function readRequiredPositiveNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ManifestValidationMessage[]
): number | undefined {
  const value = record[key];

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    errors.push({
      path,
      code: "required_positive_number",
      message: `${path} обязателен и должен быть положительным числом.`
    });
    return undefined;
  }

  return value;
}

function readCards(record: Record<string, unknown>, errors: ManifestValidationMessage[]): CardMarkCard[] {
  const value = record.cards;

  if (!Array.isArray(value)) {
    errors.push({
      path: "$.cards",
      code: "required_array",
      message: "$.cards обязателен и должен быть массивом."
    });
    return [];
  }

  if (value.length === 0) {
    errors.push({
      path: "$.cards",
      code: "empty_cards",
      message: "$.cards не должен быть пустым."
    });
  }

  const cards: CardMarkCard[] = [];

  value.forEach((cardValue, index) => {
    const path = `$.cards[${index}]`;

    if (!isRecord(cardValue)) {
      errors.push({
        path,
        code: "card_not_object",
        message: `${path} должен быть объектом.`
      });
      return;
    }

    const id = readRequiredInteger(cardValue, "id", `${path}.id`, errors, {
      min: 0,
      minMessage: `${path}.id должен быть целым числом >= 0.`
    });
    const group = readRequiredString(cardValue, "group", `${path}.group`, errors);
    const name = readRequiredString(cardValue, "name", `${path}.name`, errors);
    const markerId = readRequiredInteger(cardValue, "markerId", `${path}.markerId`, errors, {
      min: MARKER_ID_MIN,
      max: MARKER_ID_MAX,
      minMessage: `${path}.markerId должен быть целым числом в диапазоне 0..127.`,
      maxMessage: `${path}.markerId должен быть целым числом в диапазоне 0..127.`
    });

    if (id === undefined || group === undefined || name === undefined || markerId === undefined) {
      return;
    }

    cards.push({
      id,
      group,
      name,
      markerId
    });
  });

  return cards;
}

function readRequiredInteger(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ManifestValidationMessage[],
  constraints: {
    min?: number;
    max?: number;
    minMessage?: string;
    maxMessage?: string;
  } = {}
): number | undefined {
  const value = record[key];

  if (typeof value !== "number" || !Number.isInteger(value)) {
    errors.push({
      path,
      code: "required_integer",
      message: `${path} обязателен и должен быть целым числом.`
    });
    return undefined;
  }

  if (constraints.min !== undefined && value < constraints.min) {
    errors.push({
      path,
      code: "integer_too_small",
      message: constraints.minMessage ?? `${path} должен быть >= ${constraints.min}.`
    });
    return undefined;
  }

  if (constraints.max !== undefined && value > constraints.max) {
    errors.push({
      path,
      code: "integer_too_large",
      message: constraints.maxMessage ?? `${path} должен быть <= ${constraints.max}.`
    });
    return undefined;
  }

  return value;
}

function findDuplicateMarkerIds(cards: CardMarkCard[]): number[] {
  const seen = new Set<number>();
  const duplicates = new Set<number>();

  for (const card of cards) {
    if (seen.has(card.markerId)) {
      duplicates.add(card.markerId);
    }

    seen.add(card.markerId);
  }

  return Array.from(duplicates).sort((a, b) => a - b);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

