import * as ImageManipulator from "expo-image-manipulator";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB (server limit)
const TARGET_SIZE = 4.8 * 1024 * 1024; // safety margin

const getFileSize = async (uri: string): Promise<number> => {
  const res = await fetch(uri);
  const blob = await res.blob();
  return blob.size;
};

/**
 * Converts any image (HEIC included) to JPEG and shrinks it under 5MB.
 * Always re-encodes from the ORIGINAL uri so quality doesn't degrade.
 */
export const compressImageUnder5MB = async (
  uri: string,
  originalWidth?: number,
): Promise<{ uri: string; size: number }> => {
  const steps = [
    { maxWidth: 2000, quality: 0.8 },
    { maxWidth: 1600, quality: 0.7 },
    { maxWidth: 1280, quality: 0.6 },
    { maxWidth: 1024, quality: 0.5 },
    { maxWidth: 800, quality: 0.4 },
  ];

  let lastUri = uri;
  let lastSize = 0;

  for (const step of steps) {
    const width =
      originalWidth && originalWidth < step.maxWidth
        ? originalWidth
        : step.maxWidth;

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width } }],
      { compress: step.quality, format: ImageManipulator.SaveFormat.JPEG },
    );

    const size = await getFileSize(result.uri);
    lastUri = result.uri;
    lastSize = size;

    if (size <= TARGET_SIZE) return { uri: result.uri, size };
  }

  if (lastSize > MAX_IMAGE_SIZE) {
    throw new Error("Unable to compress image below 5MB.");
  }
  return { uri: lastUri, size: lastSize };
};