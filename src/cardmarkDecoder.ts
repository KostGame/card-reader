export type CardMarkOrientation = 0 | 90 | 180 | 270;

export type NormalizedGrid = Array<Array<0 | 1>>;

export type DecodeMessage = {
  code: string;
  path: string;
  message: string;
};

export type DecodeWarning = DecodeMessage;
export type DecodeError = DecodeMessage;

export type DecodeResult =
  | {
      ok: true;
      markerId: number;
      orientation: CardMarkOrientation;
      confidence: number;
      warnings: DecodeWarning[];
    }
  | {
      ok: false;
      errors: DecodeError[];
      confidence: number;
    };

export type GridNormalizeResult =
  | {
      ok: true;
      grid: NormalizedGrid;
    }
  | {
      ok: false;
      errors: DecodeError[];
    };

const GRID_SIZE = 7;
const ORIENTATIONS: CardMarkOrientation[] = [0, 90, 180, 270];
const VERSION_BITS = [0, 0, 0] as const;
const ANCHOR_CELLS = [
  { row: 1, col: 1, value: 1 },
  { row: 1, col: 5, value: 1 },
  { row: 5, col: 1, value: 1 },
  { row: 5, col: 5, value: 0 }
] as const;
const PAYLOAD_CELLS = [
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 1],
  [2, 2],
  [2, 3],
  [2, 4],
  [2, 5],
  [3, 1],
  [3, 2],
  [3, 3],
  [3, 4],
  [3, 5],
  [4, 1],
  [4, 2],
  [4, 3],
  [4, 4],
  [4, 5],
  [5, 2],
  [5, 3],
  [5, 4]
] as const;

export function decodeCardMarkGrid(input: unknown): DecodeResult {
  const normalized = normalizeGridInput(input);

  if (!normalized.ok) {
    return {
      ok: false,
      errors: normalized.errors,
      confidence: 0
    };
  }

  const candidates = ORIENTATIONS.map((orientation) => {
    const canonicalGrid = rotateGrid(normalized.grid, inverseOrientation(orientation));

    return {
      orientation,
      result: validateCanonicalGrid(canonicalGrid)
    };
  }).sort((a, b) => b.result.confidence - a.result.confidence);

  const validCandidate = candidates.find((candidate) => candidate.result.errors.length === 0);

  if (validCandidate?.result.markerId !== undefined) {
    return {
      ok: true,
      markerId: validCandidate.result.markerId,
      orientation: validCandidate.orientation,
      confidence: validCandidate.result.confidence,
      warnings: []
    };
  }

  const best = candidates[0];

  return {
    ok: false,
    errors: best?.result.errors ?? [
      {
        path: "$",
        code: "decode_failed",
        message: "Сетку CardMark v0 не удалось декодировать."
      }
    ],
    confidence: best?.result.confidence ?? 0
  };
}

export function normalizeGridInput(input: unknown): GridNormalizeResult {
  if (!Array.isArray(input)) {
    return {
      ok: false,
      errors: [
        {
          path: "$",
          code: "grid_not_array",
          message: "Сетка должна быть массивом строк."
        }
      ]
    };
  }

  if (input.length !== GRID_SIZE) {
    return {
      ok: false,
      errors: [
        {
          path: "$",
          code: "invalid_grid_size",
          message: "CardMark v0 ожидает сетку 7×7."
        }
      ]
    };
  }

  const grid: NormalizedGrid = [];
  const errors: DecodeError[] = [];

  input.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      errors.push({
        path: `$.grid[${rowIndex}]`,
        code: "grid_row_not_array",
        message: "Каждая строка сетки должна быть массивом."
      });
      return;
    }

    if (row.length !== GRID_SIZE) {
      errors.push({
        path: `$.grid[${rowIndex}]`,
        code: "non_rectangular_grid",
        message: "CardMark v0 ожидает прямоугольную сетку 7×7."
      });
      return;
    }

    const normalizedRow: Array<0 | 1> = [];

    row.forEach((cell, colIndex) => {
      if (cell === 1 || cell === true) {
        normalizedRow.push(1);
        return;
      }

      if (cell === 0 || cell === false) {
        normalizedRow.push(0);
        return;
      }

      errors.push({
        path: `$.grid[${rowIndex}][${colIndex}]`,
        code: "invalid_cell_value",
        message: "Ячейка должна быть 1/0 или true/false."
      });
    });

    if (normalizedRow.length === GRID_SIZE) {
      grid.push(normalizedRow);
    }
  });

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    grid
  };
}

export function rotateGrid(grid: NormalizedGrid, orientation: CardMarkOrientation): NormalizedGrid {
  if (orientation === 0) {
    return grid.map((row) => [...row]);
  }

  if (orientation === 90) {
    return grid[0].map((_, col) => grid.map((row) => row[col]).reverse());
  }

  if (orientation === 180) {
    return grid.map((row) => [...row].reverse()).reverse();
  }

  return grid[0].map((_, col) => grid.map((row) => row[GRID_SIZE - col - 1]));
}

export function buildCardMarkGrid(markerId: number): NormalizedGrid {
  const idBits = toSevenBits(markerId);
  const checksum = crc4(idBits);
  const checksumBits = toBits(checksum, 4);
  const invertedBits = idBits.map((bit) => (bit === 1 ? 0 : 1));
  const payload = [...idBits, ...checksumBits, ...invertedBits, ...VERSION_BITS];
  let payloadIndex = 0;

  return Array.from({ length: GRID_SIZE }, (_, row) =>
    Array.from({ length: GRID_SIZE }, (_, col): 0 | 1 => {
      if (isOuterFrame(row, col)) {
        return 1;
      }

      const anchor = ANCHOR_CELLS.find((cell) => cell.row === row && cell.col === col);

      if (anchor) {
        return anchor.value;
      }

      const value = payload[payloadIndex];
      payloadIndex += 1;
      return value;
    })
  );
}

export function crc4(bits: Array<0 | 1>): number {
  let crc = 0b1010;

  for (const bit of bits) {
    const top = (crc >> 3) & 1;
    crc = ((crc << 1) & 0b1111) | bit;

    if (top === 1) {
      crc ^= 0b0011;
    }
  }

  return crc & 0b1111;
}

function validateCanonicalGrid(grid: NormalizedGrid): {
  errors: DecodeError[];
  markerId?: number;
  confidence: number;
} {
  const errors: DecodeError[] = [];
  let passedChecks = 0;
  const totalChecks = 5;

  if (validateOuterFrame(grid, errors)) {
    passedChecks += 1;
  }

  if (validateAnchors(grid, errors)) {
    passedChecks += 1;
  }

  const payload = readPayloadBits(grid);
  const idBits = payload.slice(0, 7);
  const checksumBits = payload.slice(7, 11);
  const invertedBits = payload.slice(11, 18);
  const versionBits = payload.slice(18, 21);
  const markerId = bitsToNumber(idBits);

  if (arraysEqual(invertedBits, idBits.map((bit) => (bit === 1 ? 0 : 1)))) {
    passedChecks += 1;
  } else {
    errors.push({
      path: "$.payload.invertedIdBits",
      code: "invalid_inverted_id_bits",
      message: "Инвертированные ID-биты не совпадают с markerId."
    });
  }

  if (bitsToNumber(checksumBits) === crc4(idBits)) {
    passedChecks += 1;
  } else {
    errors.push({
      path: "$.payload.crc",
      code: "invalid_crc",
      message: "CRC4 не совпадает с ID-битами."
    });
  }

  if (arraysEqual(versionBits, VERSION_BITS)) {
    passedChecks += 1;
  } else {
    errors.push({
      path: "$.payload.version",
      code: "unsupported_version_bits",
      message: "CardMark reader поддерживает только version bits 000 для v0."
    });
  }

  return {
    errors,
    markerId,
    confidence: roundConfidence(passedChecks / totalChecks)
  };
}

function validateOuterFrame(grid: NormalizedGrid, errors: DecodeError[]): boolean {
  const invalidCells: string[] = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (isOuterFrame(row, col) && grid[row][col] !== 1) {
        invalidCells.push(`(${row},${col})`);
      }
    }
  }

  if (invalidCells.length === 0) {
    return true;
  }

  errors.push({
    path: "$.frame",
    code: "invalid_outer_frame",
    message: `Внешняя рамка CardMark v0 должна быть тёмной. Ошибочные клетки: ${invalidCells.join(", ")}.`
  });
  return false;
}

function validateAnchors(grid: NormalizedGrid, errors: DecodeError[]): boolean {
  const invalidCells = ANCHOR_CELLS.filter((cell) => grid[cell.row][cell.col] !== cell.value);

  if (invalidCells.length === 0) {
    return true;
  }

  errors.push({
    path: "$.anchors",
    code: "invalid_orientation_anchors",
    message: "Orientation anchors не соответствуют CardMark v0 layout."
  });
  return false;
}

function readPayloadBits(grid: NormalizedGrid): Array<0 | 1> {
  return PAYLOAD_CELLS.map(([row, col]) => grid[row][col]);
}

function toSevenBits(markerId: number): Array<0 | 1> {
  if (!Number.isInteger(markerId) || markerId < 0 || markerId > 127) {
    throw new RangeError("CardMark v0 supports marker IDs from 0 to 127.");
  }

  return toBits(markerId, 7);
}

function toBits(value: number, length: number): Array<0 | 1> {
  return Array.from({ length }, (_, index) => ((value >> (length - index - 1)) & 1) as 0 | 1);
}

function bitsToNumber(bits: Array<0 | 1>): number {
  return bits.reduce<number>((value, bit) => (value << 1) | bit, 0);
}

function isOuterFrame(row: number, col: number): boolean {
  return row === 0 || col === 0 || row === GRID_SIZE - 1 || col === GRID_SIZE - 1;
}

function inverseOrientation(orientation: CardMarkOrientation): CardMarkOrientation {
  if (orientation === 0) {
    return 0;
  }

  return (360 - orientation) as CardMarkOrientation;
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function roundConfidence(value: number): number {
  return Math.round(value * 100) / 100;
}
