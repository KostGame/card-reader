export interface CardMarkCard {
  id: number;
  group: string;
  name: string;
  markerId: number;
}

export interface CardMarkManifest {
  format: string;
  version: string;
  deckType: string;
  markerSizeMm: number;
  cards: CardMarkCard[];
}

export interface ManifestValidationMessage {
  path: string;
  message: string;
  code: string;
}

export type ManifestValidationResult =
  | {
      ok: true;
      manifest: CardMarkManifest;
      warnings: ManifestValidationMessage[];
    }
  | {
      ok: false;
      errors: ManifestValidationMessage[];
      warnings: ManifestValidationMessage[];
    };

export type ManifestParseResult = ManifestValidationResult;

export interface ManifestTechnicalInfo {
  deckType: string;
  version: string;
  markerSizeMm: number;
  cardsCount: number;
  markerIdRange: string;
  duplicateMarkerIds: number[];
}

