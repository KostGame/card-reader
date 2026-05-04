import { describe, expect, it } from "vitest";
import { buildCardMarkGrid } from "./cardmarkDecoder";
import {
  analyzeImageForCardMarks,
  findMarkerCandidates,
  imageDataToGrayscale,
  sampleGrid7x7,
  thresholdGrayscale
} from "./imageProcessing";
import type { ImageDataLike } from "./imageProcessing";

describe("imageDataToGrayscale", () => {
  it("converts RGBA pixels to grayscale", () => {
    const imageData: ImageDataLike = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255])
    };

    expect(Array.from(imageDataToGrayscale(imageData).data)).toEqual([255, 0]);
  });
});

describe("thresholdGrayscale", () => {
  it("converts grayscale values to dark/light binary cells", () => {
    const binary = thresholdGrayscale(
      {
        width: 3,
        height: 1,
        data: new Uint8ClampedArray([30, 130, 240])
      },
      128
    );

    expect(Array.from(binary.data)).toEqual([1, 0, 0]);
  });
});

describe("sampleGrid7x7", () => {
  it("samples a synthetic marker bitmap into a normalized grid", () => {
    const image = renderGridImage(buildCardMarkGrid(42), 8, 4);
    const grayscale = imageDataToGrayscale(image);
    const grid = sampleGrid7x7(grayscale, { x: 4, y: 4, width: 56, height: 56 }, 128);

    expect(grid).toEqual(buildCardMarkGrid(42));
  });
});

describe("findMarkerCandidates", () => {
  it("finds an axis-aligned synthetic marker candidate", () => {
    const image = renderGridImage(buildCardMarkGrid(42), 8, 4);
    const grayscale = imageDataToGrayscale(image);
    const binary = thresholdGrayscale(grayscale, 128);
    const candidates = findMarkerCandidates(binary, { minSizePx: 24 });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.bounds).toMatchObject({ x: 4, y: 4, width: 56, height: 56 });
  });
});

describe("analyzeImageForCardMarks", () => {
  it("decodes a synthetic marker image", () => {
    const result = analyzeImageForCardMarks(renderGridImage(buildCardMarkGrid(42), 8, 4), {
      minSizePx: 24
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidates).toHaveLength(1);
      expect(result.decoded).toHaveLength(1);
      expect(result.decoded[0]?.decode.ok).toBe(true);
      if (result.decoded[0]?.decode.ok) {
        expect(result.decoded[0].decode.markerId).toBe(42);
      }
    }
  });

  it("does not decode a blank image", () => {
    const result = analyzeImageForCardMarks(createBlankImage(80, 80, 255));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.decoded).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    }
  });

  it("returns an error result for empty image data without throwing", () => {
    expect(
      analyzeImageForCardMarks({
        width: 0,
        height: 0,
        data: new Uint8ClampedArray()
      })
    ).toEqual({
      ok: false,
      errors: [expect.any(String)],
      warnings: []
    });
  });
});

function renderGridImage(grid: number[][], cellSize: number, margin: number): ImageDataLike {
  const markerSize = cellSize * 7;
  const width = markerSize + margin * 2;
  const height = markerSize + margin * 2;
  const data = new Uint8ClampedArray(width * height * 4);

  fillImage(data, 255);

  grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell !== 1) {
        return;
      }

      for (let y = margin + rowIndex * cellSize; y < margin + (rowIndex + 1) * cellSize; y += 1) {
        for (let x = margin + colIndex * cellSize; x < margin + (colIndex + 1) * cellSize; x += 1) {
          setPixel(data, width, x, y, 0);
        }
      }
    });
  });

  return {
    width,
    height,
    data
  };
}

function createBlankImage(width: number, height: number, value: number): ImageDataLike {
  const data = new Uint8ClampedArray(width * height * 4);
  fillImage(data, value);

  return {
    width,
    height,
    data
  };
}

function fillImage(data: Uint8ClampedArray, value: number): void {
  for (let index = 0; index < data.length; index += 4) {
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }
}

function setPixel(data: Uint8ClampedArray, width: number, x: number, y: number, value: number): void {
  const index = (y * width + x) * 4;
  data[index] = value;
  data[index + 1] = value;
  data[index + 2] = value;
  data[index + 3] = 255;
}

