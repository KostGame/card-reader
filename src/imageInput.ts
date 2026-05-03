export type ImageFileInfo = {
  name: string;
  type: string;
  sizeBytes: number;
  width: number;
  height: number;
  objectUrl: string;
};

export type ImageLoadResult =
  | {
      ok: true;
      image: ImageFileInfo;
    }
  | {
      ok: false;
      error: string;
    };

export type ObjectUrlApi = {
  createObjectURL(file: File): string;
  revokeObjectURL(url: string): void;
};

export type ImageDimensionReader = (objectUrl: string) => Promise<{
  width: number;
  height: number;
}>;

export type LoadImageInputOptions = {
  objectUrlApi?: ObjectUrlApi;
  readDimensions?: ImageDimensionReader;
};

const IMAGE_EXTENSIONS = new Set([".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

export async function loadImageFile(file: File, options: LoadImageInputOptions = {}): Promise<ImageLoadResult> {
  if (!isSupportedImageFile(file)) {
    return {
      ok: false,
      error: "Файл должен быть изображением: выберите файл с MIME type image/* или известным расширением изображения."
    };
  }

  const objectUrlApi = options.objectUrlApi ?? URL;
  const readDimensions = options.readDimensions ?? readImageDimensions;
  let objectUrl = "";

  try {
    objectUrl = objectUrlApi.createObjectURL(file);
    const dimensions = await readDimensions(objectUrl);

    return {
      ok: true,
      image: {
        name: file.name,
        type: file.type || "не указан",
        sizeBytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
        objectUrl
      }
    };
  } catch {
    if (objectUrl) {
      objectUrlApi.revokeObjectURL(objectUrl);
    }

    return {
      ok: false,
      error: "Изображение не удалось прочитать. Попробуйте другой файл."
    };
  }
}

export function isSupportedImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) {
    return true;
  }

  if (file.type !== "") {
    return false;
  }

  return IMAGE_EXTENSIONS.has(getFileExtension(file.name));
}

export function formatFileSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return "0 Б";
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} Б`;
  }

  const units = ["КБ", "МБ", "ГБ"];
  let value = sizeBytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${trimFraction(value)} ${units[unitIndex]}`;
}

export function revokeImageFileInfo(image: ImageFileInfo | null, objectUrlApi: Pick<ObjectUrlApi, "revokeObjectURL"> = URL): void {
  if (image) {
    objectUrlApi.revokeObjectURL(image.objectUrl);
  }
}

function readImageDimensions(objectUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight
      });
    };
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = objectUrl;
  });
}

function getFileExtension(name: string): string {
  const dotIndex = name.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return name.slice(dotIndex).toLowerCase();
}

function trimFraction(value: number): string {
  return value.toFixed(value >= 10 ? 1 : 2).replace(/\.?0+$/, "");
}

