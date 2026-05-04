import { describe, expect, it, vi } from "vitest";
import { formatFileSize, isSupportedImageFile, loadImageFile, revokeImageFileInfo } from "./imageInput";

const objectUrlApi = {
  createObjectURL: vi.fn((file: File) => `blob:test/${file.name}`),
  revokeObjectURL: vi.fn()
};

describe("isSupportedImageFile", () => {
  it("rejects a non-image file", () => {
    const file = new File(["text"], "notes.txt", { type: "text/plain" });

    expect(isSupportedImageFile(file)).toBe(false);
  });

  it("accepts an image MIME type", () => {
    const file = new File(["png"], "marker.bin", { type: "image/png" });

    expect(isSupportedImageFile(file)).toBe(true);
  });

  it("accepts an empty MIME type when the extension is a known image extension", () => {
    const file = new File(["svg"], "synthetic-placeholder.svg", { type: "" });

    expect(isSupportedImageFile(file)).toBe(true);
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(42)).toBe("42 Б");
  });

  it("formats kilobytes and megabytes", () => {
    expect(formatFileSize(1536)).toBe("1.5 КБ");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2 МБ");
  });
});

describe("loadImageFile", () => {
  it("returns an error result for user file errors without throwing", async () => {
    const file = new File(["text"], "notes.txt", { type: "text/plain" });

    await expect(loadImageFile(file, { objectUrlApi })).resolves.toEqual({
      ok: false,
      error: expect.stringContaining("Файл должен быть изображением")
    });
  });

  it("loads image metadata through a mockable dimension reader", async () => {
    const file = new File(["png"], "cardmark.png", { type: "image/png" });
    const result = await loadImageFile(file, {
      objectUrlApi,
      readDimensions: async () => ({ width: 640, height: 480 })
    });

    expect(result).toEqual({
      ok: true,
      image: {
        name: "cardmark.png",
        type: "image/png",
        sizeBytes: 3,
        width: 640,
        height: 480,
        objectUrl: "blob:test/cardmark.png"
      }
    });
  });

  it("revokes the object URL when dimension reading fails", async () => {
    objectUrlApi.revokeObjectURL.mockClear();
    const file = new File(["png"], "broken.png", { type: "image/png" });
    const result = await loadImageFile(file, {
      objectUrlApi,
      readDimensions: async () => {
        throw new Error("boom");
      }
    });

    expect(result.ok).toBe(false);
    expect(objectUrlApi.revokeObjectURL).toHaveBeenCalledWith("blob:test/broken.png");
  });

  it("revokes an existing image state explicitly", () => {
    objectUrlApi.revokeObjectURL.mockClear();

    revokeImageFileInfo(
      {
        name: "old.png",
        type: "image/png",
        sizeBytes: 12,
        width: 1,
        height: 1,
        objectUrl: "blob:test/old.png"
      },
      objectUrlApi
    );

    expect(objectUrlApi.revokeObjectURL).toHaveBeenCalledWith("blob:test/old.png");
  });
});

