import type { IntlShape } from "react-intl";
import { formatAttachmentSize } from "../../attachmentFormatting";

/** Per-file attachment size limit; mirrors the backend's (chat-attachment-validation.ts). */
export const MAX_CHAT_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const MAX_CHAT_ATTACHMENT_TOTAL_BYTES = 5 * 1024 * 1024;

// Fallback for callers without an intl context (e.g. tests exercising this module directly).
// Production call sites thread the real `formatMessage` from `useIntl()` through instead.
const fallbackFormatMessage = ((
  descriptor: { id: string; defaultMessage: string },
  values?: Record<string, string | number>,
) => descriptor.defaultMessage.replace(
  /\{(\w+)\}/g, (match, key) => values?.[key]?.toString() ?? match,
)) as IntlShape["formatMessage"];

export const prepareChatAttachment = async (
  file: File,
  formatMessage: IntlShape["formatMessage"] = fallbackFormatMessage,
): Promise<{ blob: Blob; mimeType: string }> => {
  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    throw new Error(formatMessage(
      { id: "chatInterface.errorAttachmentsMustBeSizeOrSmaller", defaultMessage: "Attachments must be {size} or smaller." },
      { size: formatAttachmentSize(MAX_CHAT_ATTACHMENT_BYTES) },
    ));
  }
  // The workspace receives the original file, not a resized/re-encoded model input.
  return { blob: file, mimeType: file.type || "application/octet-stream" };
};
