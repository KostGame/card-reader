import { describe, expect, it } from "vitest";
import {
  buildCardMarkGrid,
  decodeCardMarkGrid,
  normalizeGridInput,
  rotateGrid
} from "./cardmarkDecoder";

describe("decodeCardMarkGrid", () => {
  it.each([0, 1, 42, 127])("decodes markerId %i", (markerId) => {
    const result = decodeCardMarkGrid(buildCardMarkGrid(markerId));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.markerId).toBe(markerId);
      expect(result.orientation).toBe(0);
      expect(result.confidence).toBe(1);
    }
  });

  it("rejects invalid grid size", () => {
    const result = decodeCardMarkGrid([[1]]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ code: "invalid_grid_size", path: "$" });
    }
  });

  it("rejects non-rectangular grid", () => {
    const grid = buildCardMarkGrid(1).map((row) => [...row]);
    grid[3] = [1, 0, 1];
    const result = decodeCardMarkGrid(grid);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ code: "non_rectangular_grid", path: "$.grid[3]" });
    }
  });

  it("rejects invalid cell value", () => {
    const grid: unknown[][] = buildCardMarkGrid(1).map((row) => [...row]);
    grid[2][2] = "dark";
    const result = decodeCardMarkGrid(grid);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ code: "invalid_cell_value", path: "$.grid[2][2]" });
    }
  });

  it("rejects corrupted grid", () => {
    const grid = buildCardMarkGrid(42).map((row) => [...row]);
    grid[0][0] = 0;
    const result = decodeCardMarkGrid(grid);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "invalid_outer_frame")).toBe(true);
    }
  });

  it.each([90, 180, 270] as const)("detects %i degree rotation", (orientation) => {
    const result = decodeCardMarkGrid(rotateGrid(buildCardMarkGrid(42), orientation));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.markerId).toBe(42);
      expect(result.orientation).toBe(orientation);
    }
  });

  it("has higher confidence for a valid grid than a corrupted grid", () => {
    const valid = decodeCardMarkGrid(buildCardMarkGrid(42));
    const corruptedGrid = buildCardMarkGrid(42).map((row) => [...row]);
    corruptedGrid[0][0] = 0;
    const corrupted = decodeCardMarkGrid(corruptedGrid);

    expect(valid.confidence).toBeGreaterThan(corrupted.confidence);
  });

  it("returns structured errors without throwing for user data", () => {
    const result = decodeCardMarkGrid("not a grid");

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "grid_not_array",
          path: "$",
          message: expect.any(String)
        }
      ],
      confidence: 0
    });
  });
});

describe("normalizeGridInput", () => {
  it("accepts boolean grids", () => {
    const boolGrid = buildCardMarkGrid(0).map((row) => row.map((cell) => cell === 1));
    const result = normalizeGridInput(boolGrid);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.grid).toEqual(buildCardMarkGrid(0));
    }
  });
});

