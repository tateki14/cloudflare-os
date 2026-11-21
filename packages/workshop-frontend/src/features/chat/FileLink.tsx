import { type ReactNode, useEffect, useRef, useState } from 'react'
import { saveAttachment } from './attachments/saveAttachment'
import { readSnapshotFile, type FileSnapshots } from './inlineFiles'
import { FormattedMessage, useIntl } from 'react-intl'

/** Downloads any pinned file on demand; downloaded HTML/SVG never opens in the Workshop origin. */
export const FileLink = ({ source, files, children, title }: {
  source: string
  files?: FileSnapshots
  children: ReactNode
  title?: string
}) => {
  const { formatMessage } = useIntl()
  const pending = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  useEffect(() => () => pending.current?.abort(), [])

  const download = async () => {
    if (!files || pending.current) return
    const controller = new AbortController()
    pending.current = controller
    setBusy(true)
    setError(undefined)
    try {
      const file = await readSnapshotFile(files, source)
      if (controller.signal.aborted) { await file.stream.cancel(); return }
      const blob = await new Response(file.stream.pipeThrough(
        new TransformStream(), { signal: controller.signal },
      )).blob()
      if (!controller.signal.aborted) {
        saveAttachment(blob, decodeURIComponent(source).split('/').at(-1), 'application/octet-stream')
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : String(error))
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setBusy(false) }
    }
  }

  if (!files || !Object.hasOwn(files.oids, source) || !files.oids[source]) {
    return <span title={formatMessage({ id: 'fileLink.fileUnavailable', defaultMessage: 'File unavailable' })}><FormattedMessage id="fileLink.unavailable" defaultMessage="{children} (unavailable)" values={{ children: children }} /></span>
  }
  return <>
    <button type="button" role="link" title={title} aria-disabled={busy} aria-busy={busy}
      onClick={() => void download()} className="cursor-pointer text-kumo-brand hover:underline aria-disabled:cursor-wait">
      {children}
    </button>
    {error && <span role="alert" className="text-kumo-danger"> <FormattedMessage id="fileLink.downloadFailed" defaultMessage="Download failed: {error}" values={{ error: error }} /></span>}
  </>
}
