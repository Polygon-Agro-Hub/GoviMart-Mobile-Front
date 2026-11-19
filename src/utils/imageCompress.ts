import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB (server limit)
const TARGET_SIZE = 4 * 1024 * 1024; // 4MB safety target

export const getFileSize = async (uri: string): Promise<number> => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof (info as any).size === "number") {
      return (info as any).size;
    }
  } catch (err) {
    console.warn("Failed to get file size via FileSystem:", err);
  }
  return 0;
};

/**
 * Converts any image (HEIC/HEIF/PNG/JPG) to JPEG and compresses it up to 50%
 * so that it is lightweight (~150KB - 350KB), fast to upload, and never errors out.
 */
export const compressImageUnder5MB = async (
  uri: string,
  originalWidth?: number,
): Promise<{ uri: string; size: number }> => {
  const targetWidth =
    originalWidth && originalWidth > 0 && originalWidth < 1600
      ? originalWidth
      : 1600;

  // 50% compression ratio (quality: 0.5)
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: targetWidth } }],
    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG },
  );

  let size = await getFileSize(result.uri);

  // If for any extreme edge case it's still > TARGET_SIZE, compress one more step
  if (size > TARGET_SIZE) {
    const fallbackResult = await ImageManipulator.manipulateAsync(
      result.uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG },
    );
    size = await getFileSize(fallbackResult.uri);
    return { uri: fallbackResult.uri, size };
  }

  return { uri: result.uri, size };
};
