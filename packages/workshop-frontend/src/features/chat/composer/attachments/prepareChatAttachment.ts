import type { IntlShape } from "react-intl";
import { formatAttachmentSize } from "../../attachmentFormatting";

export const MAX_CHAT_ATTACHMENT_BYTES = 1024 * 1024;
export const MAX_CHAT_ATTACHMENT_TOTAL_BYTES = 5 * 1024 * 1024;
const MAX_CHAT_ATTACHMENT_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;
const CHAT_ATTACHMENT_IMAGE_MAX_EDGE = 1568;

// Fallback for callers that don't have an intl context (e.g. tests exercising this module
// directly). Production call sites always thread the real `formatMessage` from `useIntl()`
// through instead. Not ICU-aware (no plurals) -- just substitutes `{key}` placeholders, which is
// all this module's messages use.
const fallbackFormatMessage = ((
  descriptor: { id: string; defaultMessage: string },
  values?: Record<string, string | number>,
) => descriptor.defaultMessage.replace(
  /\{(\w+)\}/g, (match, key) => values?.[key]?.toString() ?? match,
)) as IntlShape["formatMessage"];

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
  formatMessage: IntlShape["formatMessage"] = fallbackFormatMessage,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob
        ? resolve(blob)
        : reject(new Error(formatMessage({ id: "chatInterface.errorEncodeImage", defaultMessage: "Failed to encode image." }))),
      type,
      quality,
    );
  });

export const prepareChatAttachment = async (
  file: File,
  formatMessage: IntlShape["formatMessage"] = fallbackFormatMessage,
): Promise<{ blob: Blob; mimeType: string }> => {
  if (!file.type.startsWith("image/")) {
    if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
      throw new Error(formatMessage(
        { id: "chatInterface.errorAttachmentsMustBeSizeOrSmaller", defaultMessage: "Attachments must be {size} or smaller." },
        { size: formatAttachmentSize(MAX_CHAT_ATTACHMENT_BYTES) },
      ));
    }
    return { blob: file, mimeType: file.type || "application/octet-stream" };
  }
  if (file.size > MAX_CHAT_ATTACHMENT_SOURCE_IMAGE_BYTES) {
    throw new Error(formatMessage(
      { id: "chatInterface.errorImagesMustBeSizeOrSmallerBeforeResizing", defaultMessage: "Images must be {size} or smaller before resizing." },
      { size: formatAttachmentSize(MAX_CHAT_ATTACHMENT_SOURCE_IMAGE_BYTES) },
    ));
  }

  const bitmap = await createImageBitmap(file);
  try {
    const supportedOriginalType = file.type === "image/jpeg" || file.type === "image/png" ||
      file.type === "image/webp";
    if (supportedOriginalType && file.size <= MAX_CHAT_ATTACHMENT_BYTES &&
        Math.max(bitmap.width, bitmap.height) <= CHAT_ATTACHMENT_IMAGE_MAX_EDGE) {
      return { blob: file, mimeType: file.type };
    }

    const scale = Math.min(1, CHAT_ATTACHMENT_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error(formatMessage({ id: "chatInterface.errorCanvasContext", defaultMessage: "Failed to get 2D canvas context." }));
    context.drawImage(bitmap, 0, 0, width, height);

    // Retaining PNG/WebP avoids losing transparency and keeps the MIME type consistent with the
    // original filename extension.
    const outputMimeType = supportedOriginalType ? file.type : "image/jpeg";
    const quality = outputMimeType === "image/png" ? undefined : 0.85;
    const blob = await canvasToBlob(canvas, outputMimeType, quality, formatMessage);
    if (blob.size > MAX_CHAT_ATTACHMENT_BYTES) {
      throw new Error(formatMessage(
        { id: "chatInterface.errorAttachmentsMustBeSizeOrSmaller", defaultMessage: "Attachments must be {size} or smaller." },
        { size: formatAttachmentSize(MAX_CHAT_ATTACHMENT_BYTES) },
      ));
    }
    return { blob, mimeType: outputMimeType };
  } finally {
    bitmap.close();
  }
};
