import { createFileRoute } from '@tanstack/react-router'
import { BookOpen, Sparkle, type Icon as PhosphorIcon } from '@phosphor-icons/react'
import { FormattedMessage, useIntl, type IntlShape } from 'react-intl'
import { useDocumentTitle } from '../useDocumentTitle'
import ComingSoonPreview from '../components/ComingSoonPreview'
import { useSiteName } from '../ServerConfigContext'

// Context & Skills. The knowledge/skills surface isn't built into the rail yet — agents read
// curated collections of documents (context) and reusable skills. Until then this page shows a
// frosted design mock so the nav entry has a stable, on-language target.
export const Route = createFileRoute('/context')({
  component: ContextPage,
})

type Kind = 'collection' | 'skill'

interface ContextItem {
  id: string
  nameId: string
  nameDefault: string
  kind: Kind
  detailId: string
  detailDefault: string
  updatedId: string
  updatedDefault: string
}

const TYPE_META: Record<Kind, { id: string; defaultMessage: string; Icon: PhosphorIcon }> = {
  collection: { id: 'contextPage.typeCollection', defaultMessage: 'Collection', Icon: BookOpen },
  skill: { id: 'contextPage.typeSkill', defaultMessage: 'Skill', Icon: Sparkle },
}

const MOCK_ITEMS: ContextItem[] = [
  { id: '1', nameId: 'contextPage.mockItem1Name', nameDefault: 'Company Handbook', kind: 'collection', detailId: 'contextPage.mockItem1Detail', detailDefault: '12 documents', updatedId: 'contextPage.mockItem1Updated', updatedDefault: '2d ago' },
  { id: '2', nameId: 'contextPage.mockItem2Name', nameDefault: 'Brand Voice & Style', kind: 'collection', detailId: 'contextPage.mockItem2Detail', detailDefault: '5 documents', updatedId: 'contextPage.mockItem2Updated', updatedDefault: '1w ago' },
  { id: '3', nameId: 'contextPage.mockItem3Name', nameDefault: 'API Reference', kind: 'collection', detailId: 'contextPage.mockItem3Detail', detailDefault: '28 documents', updatedId: 'contextPage.mockItem3Updated', updatedDefault: '1w ago' },
  { id: '4', nameId: 'contextPage.mockItem4Name', nameDefault: 'Summarize meeting notes', kind: 'skill', detailId: 'contextPage.mockItemSkillDetail', detailDefault: 'Reusable skill', updatedId: 'contextPage.mockItem4Updated', updatedDefault: '3d ago' },
  { id: '5', nameId: 'contextPage.mockItem5Name', nameDefault: 'Sales Playbook', kind: 'collection', detailId: 'contextPage.mockItem5Detail', detailDefault: '9 documents', updatedId: 'contextPage.mockItem5Updated', updatedDefault: '2w ago' },
  { id: '6', nameId: 'contextPage.mockItem6Name', nameDefault: 'Draft a customer email', kind: 'skill', detailId: 'contextPage.mockItemSkillDetail', detailDefault: 'Reusable skill', updatedId: 'contextPage.mockItem6Updated', updatedDefault: '2w ago' },
]

function ContextRow({ item, formatMessage }: { item: ContextItem; formatMessage: IntlShape['formatMessage'] }) {
  const { Icon } = TYPE_META[item.kind]
  const label = formatMessage(TYPE_META[item.kind])
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kumo-fill text-kumo-subtle">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium tracking-[-0.25px] text-kumo-default">
          {formatMessage({ id: item.nameId, defaultMessage: item.nameDefault })}
        </p>
        <p className="mt-0.5 truncate text-[12px] leading-4 tracking-[-0.2px] text-kumo-subtle">
          {label} · {formatMessage({ id: item.detailId, defaultMessage: item.detailDefault })}
        </p>
      </div>
      <span className="hidden shrink-0 text-xs tracking-[-0.1px] text-kumo-inactive lg:block">
        {formatMessage({ id: item.updatedId, defaultMessage: item.updatedDefault })}
      </span>
    </div>
  )
}

function ContextPage() {
  const { formatMessage } = useIntl()
  useDocumentTitle(formatMessage({ id: 'contextPage.documentTitle', defaultMessage: 'Context & Skills' }))
  const siteName = useSiteName()
  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-6 sm:px-10">
      <header className="px-3 pb-4 pt-10">
        <h1 className="text-2xl font-semibold tracking-tight text-kumo-default">
          <FormattedMessage id="contextPage.heading" defaultMessage="Context & Skills" />
        </h1>
        <p className="mt-1 text-[13px] leading-[18px] tracking-[-0.25px] text-kumo-subtle">
          <FormattedMessage
            id="contextPage.description"
            defaultMessage="Curated collections of knowledge your agents read, plus reusable skills they can apply."
          />
        </p>
      </header>

      <ComingSoonPreview
        icon={BookOpen}
        title={formatMessage(
          { id: 'contextPage.comingSoonTitle', defaultMessage: 'Context & Skills are coming soon to {siteName}' },
          { siteName },
        )}
        description={formatMessage({
          id: 'contextPage.comingSoonDescription',
          defaultMessage: "A preview of how you'll author knowledge collections and skills for your agents to draw on.",
        })}
      >
        <div className="chat-panel min-h-0 flex-1 overflow-y-auto pb-8 pt-1">
          <div className="flex flex-col gap-0.5">
            {MOCK_ITEMS.map((item) => (
              <ContextRow key={item.id} item={item} formatMessage={formatMessage} />
            ))}
          </div>
        </div>
      </ComingSoonPreview>
    </div>
  )
}
