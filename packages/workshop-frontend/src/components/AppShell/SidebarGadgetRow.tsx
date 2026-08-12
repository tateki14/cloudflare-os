import { Link } from '@tanstack/react-router'
import { DotsThree, Star, ShareNetwork, Trash, Pencil } from '@phosphor-icons/react'
import { DropdownMenu } from '@cloudflare/kumo'
import { MENU_CONTENT, MENU_ITEM, MENU_ITEM_DANGER, MENU_POSITIONER_STYLE } from '../menuStyles'
import { useState, useEffect, useRef } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import type { GadgetMetadataWithTimestamps } from '@gadgets/workshop-shared/api'

function initials(title: string | undefined, untitledFallback: string): string {
  const t = (title || untitledFallback).trim()
  if (!t) return 'UG'
  const parts = t.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || t.slice(0, 2).toUpperCase()
}

// One row in the sidebar's Favorites / Recent list. Compact, with a monogram avatar, a truncated
// title, and an overflow menu (favorite, rename, share, delete). Favorite/rename/share/delete
// callbacks are passed in by the parent so this row stays a pure presentational component.
export default function SidebarGadgetRow({
  gadget,
  collapsed = false,
  onTogglePin,
  onRename,
  onShare,
  onDelete,
}: {
  gadget: GadgetMetadataWithTimestamps
  collapsed?: boolean
  onTogglePin: (g: GadgetMetadataWithTimestamps) => void
  onRename: (g: GadgetMetadataWithTimestamps, newTitle: string) => void
  onShare: (g: GadgetMetadataWithTimestamps) => void
  onDelete: (g: GadgetMetadataWithTimestamps) => void
}) {
  const { formatMessage } = useIntl()
  const untitledWorkspace = formatMessage({ id: 'sidebarGadgetRow.untitledWorkspace', defaultMessage: 'Untitled workspace' })
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(gadget.title || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) inputRef.current?.focus()
  }, [renaming])

  const commit = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== gadget.title) onRename(gadget, trimmed)
    setRenaming(false)
  }

  const startRename = () => {
    setRenameValue(gadget.title || '')
    setRenaming(true)
  }

  return (
    <Link
      to="/workspace/$id"
      params={{ id: gadget.id }}
      className="group flex h-8 items-center gap-2 rounded-lg pl-1.5 pr-1 text-[13px] leading-[18px] tracking-[-0.25px] text-kumo-default transition-colors hover:bg-kumo-tint"
      activeProps={{ className: 'flex h-8 items-center gap-2 rounded-lg pl-1.5 pr-1 text-[13px] leading-[18px] tracking-[-0.25px] bg-kumo-fill text-kumo-strong font-medium' }}
      onClick={(e) => {
        if (renaming) e.preventDefault()
      }}
      title={collapsed ? gadget.title || untitledWorkspace : undefined}
    >
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-kumo-fill text-[10px] font-medium text-kumo-subtle"
        aria-hidden="true"
      >
        {initials(gadget.title, formatMessage({ id: 'sidebarGadgetRow.untitled', defaultMessage: 'Untitled' }))}
      </div>

      {!collapsed && (
        <>
          {renaming ? (
            <input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') setRenaming(false)
              }}
              className="min-w-0 flex-1 bg-transparent text-[13px] leading-[18px] tracking-[-0.25px] outline-none border-b border-kumo-brand text-kumo-default"
              onClick={(e) => e.preventDefault()}
            />
          ) : (
            <span className="min-w-0 flex-1 truncate">{gadget.title || untitledWorkspace}</span>
          )}

          {/* Inside the row's <Link>: stopPropagation blocks the Link's SPA handler, so preventDefault
              is needed to stop the native <a> from navigating. */}
          <div onClick={(e) => { e.stopPropagation(); e.preventDefault() }}>
            <DropdownMenu>
              <DropdownMenu.Trigger
                render={
                  <button
                    type="button"
                    aria-label={formatMessage({ id: 'sidebarGadgetRow.workspaceActions', defaultMessage: 'Workspace actions' })}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-kumo-subtle opacity-0 transition-[opacity,color,background-color] group-hover:opacity-100 hover:bg-kumo-fill hover:text-kumo-default focus:opacity-100"
                  >
                    <DotsThree size={14} weight="bold" />
                  </button>
                }
              />
              <DropdownMenu.Content className={MENU_CONTENT} style={MENU_POSITIONER_STYLE}>
                <DropdownMenu.Item
                  onClick={startRename}
                  className={MENU_ITEM}
                >
                  <Pencil size={13} className="mr-2" /> <FormattedMessage id="sidebarGadgetRow.rename" defaultMessage="Rename" />
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => onTogglePin(gadget)}
                  className={MENU_ITEM}
                >
                  <Star size={13} className="mr-2" weight={gadget.pinned ? 'fill' : 'regular'} />
                  {gadget.pinned
                    ? <FormattedMessage id="sidebarGadgetRow.unfavorite" defaultMessage="Unfavorite" />
                    : <FormattedMessage id="sidebarGadgetRow.favorite" defaultMessage="Favorite" />}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => onShare(gadget)}
                  className={MENU_ITEM}
                >
                  <ShareNetwork size={13} className="mr-2" /> <FormattedMessage id="sidebarGadgetRow.share" defaultMessage="Share" />
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item
                  variant="danger"
                  onClick={() => onDelete(gadget)}
                  className={MENU_ITEM_DANGER}
                >
                  <Trash size={13} className="mr-2" />
                  {gadget.owner
                    ? <FormattedMessage id="sidebarGadgetRow.dismiss" defaultMessage="Dismiss" />
                    : <FormattedMessage id="sidebarGadgetRow.delete" defaultMessage="Delete" />}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>
        </>
      )}

      {/* Collapsed rows show only the monogram (aria-hidden), so name the link for screen readers. */}
      {collapsed && <span className="sr-only">{gadget.title || untitledWorkspace}</span>}
    </Link>
  )
}
