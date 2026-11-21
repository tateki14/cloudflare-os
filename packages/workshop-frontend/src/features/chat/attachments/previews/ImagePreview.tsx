import { useState } from "react";
import { AttachmentPreviewError, type AttachmentPreviewProps } from "../attachmentPreviewers";
import { useObjectUrl } from "../useObjectUrl";
import { useIntl } from "react-intl";

/** An image, scaled down to fit. An `<img>` never runs an SVG's scripts. */
export const ImagePreview = ({ bytes, name, mimeType }: AttachmentPreviewProps) => {
  const { formatMessage } = useIntl();
  const url = useObjectUrl(bytes, mimeType);
  const [failed, setFailed] = useState(false);
  if (failed) throw new AttachmentPreviewError(formatMessage({ id: "imagePreview.thisImageCouldntBeShownIt", defaultMessage: "This image couldn’t be shown. It may be damaged." }));
  return (
    <div className="grid h-full place-items-center p-4">
      {url && (
        <img
          src={url}
          alt={name}
          onError={() => setFailed(true)}
          className="max-h-full max-w-full rounded-lg object-contain"
        />
      )}
    </div>
  );
};
