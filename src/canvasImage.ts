import { analyzeImageForCardMarks } from "./imageProcessing";
import type { ImageAnalysisResult } from "./imageProcessing";

export type CanvasImageDataResult =
  | {
      ok: true;
      imageData: ImageData;
      originalWidth: number;
      originalHeight: number;
      scale: number;
    }
  | {
      ok: false;
      errors: string[];
      warnings: string[];
    };

export async function imageObjectUrlToImageData(objectUrl: string, maxSide = 1200): Promise<CanvasImageDataResult> {
  try {
    const image = await loadHtmlImage(objectUrl);
    const originalWidth = image.naturalWidth;
    const originalHeight = image.naturalHeight;

    if (originalWidth <= 0 || originalHeight <= 0) {
      return {
        ok: false,
        errors: ["Изображение имеет некорректный размер."],
        warnings: []
      };
    }

    const scale = Math.min(1, maxSide / Math.max(originalWidth, originalHeight));
    const width = Math.max(1, Math.round(originalWidth * scale));
    const height = Math.max(1, Math.round(originalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return {
        ok: false,
        errors: ["CanvasRenderingContext2D недоступен в браузере."],
        warnings: []
      };
    }

    context.drawImage(image, 0, 0, width, height);

    return {
      ok: true,
      imageData: context.getImageData(0, 0, width, height),
      originalWidth,
      originalHeight,
      scale
    };
  } catch {
    return {
      ok: false,
      errors: ["Изображение не удалось загрузить в canvas для анализа."],
      warnings: []
    };
  }
}

export async function analyzeImageObjectUrl(objectUrl: string): Promise<ImageAnalysisResult> {
  const imageDataResult = await imageObjectUrlToImageData(objectUrl);

  if (!imageDataResult.ok) {
    return imageDataResult;
  }

  return analyzeImageForCardMarks(imageDataResult.imageData);
}

function loadHtmlImage(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = objectUrl;
  });
}

