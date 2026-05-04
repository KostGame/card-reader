import { decodeCardMarkGrid } from "./cardmarkDecoder";
import type { DecodeResult, NormalizedGrid } from "./cardmarkDecoder";

export type ImageDataLike = {
  width: number;
  height: number;
  data: ArrayLike<number>;
};

export type GrayscaleImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export type BinaryImage = {
  width: number;
  height: number;
  data: Uint8Array;
  threshold: number;
};

export type MarkerCandidate = {
  id: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  score: number;
  reason?: string;
};

export type ImageDecodeCandidateResult = {
  candidate: MarkerCandidate;
  grid: NormalizedGrid;
  decode: DecodeResult;
};

export type ImageAnalysisResult =
  | {
      ok: true;
      imageWidth: number;
      imageHeight: number;
      candidates: MarkerCandidate[];
      decoded: ImageDecodeCandidateResult[];
      warnings: string[];
    }
  | {
      ok: false;
      errors: string[];
      warnings: string[];
    };

export type CandidateDetectionOptions = {
  maxCandidates?: number;
  minSizePx?: number;
  maxCandidatesBeforeSort?: number;
};

export type AnalyzeImageOptions = CandidateDetectionOptions & {
  threshold?: number;
};

const DEFAULT_MAX_CANDIDATES = 20;
const DEFAULT_MAX_COMPONENTS = 200;

export function imageDataToGrayscale(imageData: ImageDataLike): GrayscaleImage {
  const data = new Uint8ClampedArray(imageData.width * imageData.height);

  for (let index = 0; index < data.length; index += 1) {
    const rgbaIndex = index * 4;
    const red = imageData.data[rgbaIndex] ?? 0;
    const green = imageData.data[rgbaIndex + 1] ?? 0;
    const blue = imageData.data[rgbaIndex + 2] ?? 0;
    data[index] = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
  }

  return {
    width: imageData.width,
    height: imageData.height,
    data
  };
}

export function thresholdGrayscale(grayscale: GrayscaleImage, threshold = estimateThreshold(grayscale)): BinaryImage {
  const data = new Uint8Array(grayscale.data.length);

  for (let index = 0; index < grayscale.data.length; index += 1) {
    data[index] = grayscale.data[index] <= threshold ? 1 : 0;
  }

  return {
    width: grayscale.width,
    height: grayscale.height,
    data,
    threshold
  };
}

export function findMarkerCandidates(
  binary: BinaryImage,
  options: CandidateDetectionOptions = {}
): MarkerCandidate[] {
  if (binary.width <= 0 || binary.height <= 0) {
    return [];
  }

  const visited = new Uint8Array(binary.data.length);
  const minSizePx = options.minSizePx ?? Math.max(14, Math.floor(Math.min(binary.width, binary.height) * 0.04));
  const maxComponents = options.maxCandidatesBeforeSort ?? DEFAULT_MAX_COMPONENTS;
  const candidates: MarkerCandidate[] = [];
  let componentId = 0;

  for (let y = 0; y < binary.height; y += 1) {
    for (let x = 0; x < binary.width; x += 1) {
      const index = y * binary.width + x;

      if (visited[index] === 1 || binary.data[index] !== 1) {
        continue;
      }

      const component = floodFillComponent(binary, visited, x, y);
      componentId += 1;

      if (componentId > maxComponents) {
        return rankCandidates(candidates, options.maxCandidates ?? DEFAULT_MAX_CANDIDATES);
      }

      const width = component.maxX - component.minX + 1;
      const height = component.maxY - component.minY + 1;
      const area = width * height;
      const fillRatio = component.pixelCount / area;
      const aspectRatio = width / height;
      const squareScore = 1 - Math.min(1, Math.abs(1 - aspectRatio));

      if (width < minSizePx || height < minSizePx) {
        continue;
      }

      if (aspectRatio < 0.72 || aspectRatio > 1.38) {
        continue;
      }

      if (fillRatio < 0.12 || fillRatio > 0.92) {
        continue;
      }

      candidates.push({
        id: `candidate-${componentId}`,
        bounds: {
          x: component.minX,
          y: component.minY,
          width,
          height
        },
        score: roundScore(squareScore * 0.65 + fillRatio * 0.35),
        reason: "axis-aligned dark component"
      });
    }
  }

  return rankCandidates(candidates, options.maxCandidates ?? DEFAULT_MAX_CANDIDATES);
}

function rankCandidates(candidates: MarkerCandidate[], maxCandidates: number): MarkerCandidate[] {
  return candidates
    .sort((left, right) => right.score - left.score || right.bounds.width * right.bounds.height - left.bounds.width * left.bounds.height)
    .slice(0, maxCandidates);
}

export function extractCandidateGrid(
  grayscale: GrayscaleImage,
  candidate: MarkerCandidate,
  threshold?: number
): NormalizedGrid {
  return sampleGrid7x7(grayscale, candidate.bounds, threshold);
}

export function sampleGrid7x7(
  grayscale: GrayscaleImage,
  bounds: MarkerCandidate["bounds"],
  threshold = estimateThreshold(grayscale)
): NormalizedGrid {
  const grid: NormalizedGrid = [];
  const samples = [0.3, 0.5, 0.7];

  for (let row = 0; row < 7; row += 1) {
    const gridRow: Array<0 | 1> = [];

    for (let col = 0; col < 7; col += 1) {
      let brightness = 0;
      let count = 0;

      for (const sampleY of samples) {
        for (const sampleX of samples) {
          const x = clamp(
            Math.round(bounds.x + ((col + sampleX) / 7) * bounds.width),
            0,
            grayscale.width - 1
          );
          const y = clamp(
            Math.round(bounds.y + ((row + sampleY) / 7) * bounds.height),
            0,
            grayscale.height - 1
          );

          brightness += grayscale.data[y * grayscale.width + x];
          count += 1;
        }
      }

      gridRow.push(brightness / count <= threshold ? 1 : 0);
    }

    grid.push(gridRow);
  }

  return grid;
}

export function analyzeImageForCardMarks(
  imageData: ImageDataLike,
  options: AnalyzeImageOptions = {}
): ImageAnalysisResult {
  try {
    if (imageData.width <= 0 || imageData.height <= 0 || imageData.data.length < imageData.width * imageData.height * 4) {
      return {
        ok: false,
        errors: ["ImageData пустой или повреждён."],
        warnings: []
      };
    }

    const grayscale = imageDataToGrayscale(imageData);
    const binary = thresholdGrayscale(grayscale, options.threshold);
    const candidates = findMarkerCandidates(binary, options);
    const decoded: ImageDecodeCandidateResult[] = [];
    const warnings: string[] = [];

    for (const candidate of candidates) {
      const grid = extractCandidateGrid(grayscale, candidate, binary.threshold);
      const decode = decodeCardMarkGrid(grid);

      if (decode.ok) {
        decoded.push({
          candidate,
          grid,
          decode
        });
      }
    }

    if (candidates.length === 0) {
      warnings.push("Кандидаты CardMark не найдены. PR-003 лучше работает на контрастных synthetic или почти ровных изображениях.");
    } else if (decoded.length === 0) {
      warnings.push("Кандидаты найдены, но decoder не подтвердил CardMark v0.");
    }

    return {
      ok: true,
      imageWidth: imageData.width,
      imageHeight: imageData.height,
      candidates,
      decoded,
      warnings
    };
  } catch {
    return {
      ok: false,
      errors: ["Изображение не удалось проанализировать."],
      warnings: []
    };
  }
}

function estimateThreshold(grayscale: GrayscaleImage): number {
  let min = 255;
  let max = 0;

  for (const value of grayscale.data) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  if (max - min < 12) {
    return 128;
  }

  return Math.round((min + max) / 2);
}

function floodFillComponent(binary: BinaryImage, visited: Uint8Array, startX: number, startY: number): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  pixelCount: number;
} {
  const queueX = [startX];
  const queueY = [startY];
  let cursor = 0;
  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;
  let pixelCount = 0;
  visited[startY * binary.width + startX] = 1;

  while (cursor < queueX.length) {
    const x = queueX[cursor];
    const y = queueY[cursor];
    cursor += 1;
    pixelCount += 1;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    visitNeighbor(binary, visited, queueX, queueY, x + 1, y);
    visitNeighbor(binary, visited, queueX, queueY, x - 1, y);
    visitNeighbor(binary, visited, queueX, queueY, x, y + 1);
    visitNeighbor(binary, visited, queueX, queueY, x, y - 1);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    pixelCount
  };
}

function visitNeighbor(
  binary: BinaryImage,
  visited: Uint8Array,
  queueX: number[],
  queueY: number[],
  x: number,
  y: number
): void {
  if (x < 0 || y < 0 || x >= binary.width || y >= binary.height) {
    return;
  }

  const index = y * binary.width + x;

  if (visited[index] === 1 || binary.data[index] !== 1) {
    return;
  }

  visited[index] = 1;
  queueX.push(x);
  queueY.push(y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}
