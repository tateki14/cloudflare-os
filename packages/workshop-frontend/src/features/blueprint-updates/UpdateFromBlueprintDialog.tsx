import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Banner, Dialog, Loader, Radio, Select } from '@cloudflare/kumo'
import { X } from '@phosphor-icons/react'
import type { RpcStub } from 'capnweb'
import type {
  AiChatAuthorInfo,
  AuthenticatedApi,
  BlueprintPublicInfo,
  GadgetClient,
  GadgetUpstream,
  Overseer,
  PublicApi,
} from '@gadgets/workshop-shared/api'
import { WorkshopButton, WorkshopIconButton, WorkshopInput } from '../../components/WorkshopControls'
import {
  fromModelSelectValue,
  getStoredSelectedModel,
  NO_AGENT_OPTION_VALUE,
  persistSelectedModel,
  toModelSelectValue,
} from '../../modelSelection'
import { useDialogSelectPortalContainer } from '../../useDialogSelectPortalContainer'
import { logRpcFailure } from '../../rpcErrors'
import { toBlueprintChoice, type BlueprintChoice } from './blueprintChoices'
import { parseBlueprintReference } from './blueprintReference'
import { hasNewerRelease } from './useBlueprintUpdateAvailable'
import { FormattedMessage, useIntl } from 'react-intl'

type UpdateFromBlueprintDialogProps = {
  /** The gadget to update. `upstream` is the blueprint it follows, which the dialog offers first. */
  gadget: { title: string; upstream?: GadgetUpstream; client: RpcStub<GadgetClient> }
  overseer: RpcStub<Overseer>
  publicApi: RpcStub<PublicApi>
  /** Saves a reviewer pick as the user's preferred model. */
  authenticatedApi: RpcStub<AuthenticatedApi>
  /** The signed-in user, whose remembered model the reviewer starts on; undefined until known. */
  userId: string | undefined
  onClose: () => void
  /** Called with the new chat that holds the proposal, once there is one. */
  onProposed: (chatId: number) => void
}

type Load =
  | { status: 'loading' }
  | { status: 'failed' }
  | {
    status: 'loaded'
    models: AiChatAuthorInfo[]
    followed: BlueprintPublicInfo | null
  }

/** Whether to update from the followed blueprint, or switch to one the user names. */
type Source = 'followed' | 'switch'

type ReferenceLookup =
  | { status: 'empty' | 'invalid' | 'loading' | 'notFound' | 'failed' }
  | { status: 'found'; blueprint: BlueprintPublicInfo }

/** How the last attempt to apply a blueprint ended, unless it ended in a proposal. */
type Outcome =
  | { kind: 'upToDate' | 'baseUnavailable' | 'unrelated'; blueprint: BlueprintChoice }
  | { kind: 'failed'; blueprint: BlueprintChoice; allowUnrelated: boolean; message: string }

const REFERENCE_MESSAGES: Partial<Record<ReferenceLookup['status'], string>> = {
  invalid: 'That is not a blueprint ID or link.',
  loading: 'Looking up that blueprint…',
  notFound: 'No blueprint was found with that ID.',
  failed: 'That blueprint could not be looked up.',
}

const DIALOG_CLASS =
  'responsive-dialog !z-[1000] !top-[clamp(24px,10vh,80px)] !flex !max-h-[calc(100vh-clamp(24px,10vh,80px)-24px)] !w-[min(520px,calc(100vw-32px))] !-translate-y-0 flex-col overflow-hidden bg-kumo-base p-0'

const BODY_TEXT = 'm-0 text-[13px] leading-[18px] tracking-[-0.25px] text-kumo-subtle'

// The merge is recorded as a minimal diff, which is slow to find between files that share little.
const APPLYING_NOTE =
  'Working out the update. This can take a few minutes for a blueprint that has little in ' +
  'common with the gadget.'

// A merge is only as good as the base it is worked out from, which is the newest version the
// gadget and the blueprint have in common. With none, the confirm step's warning applies.
const SWITCH_NOTE =
  'The new blueprint must be derived from the same base as this gadget, such as a remix of the ' +
  'blueprint the gadget was made from. If the two share no history, you are warned before ' +
  'anything is merged. Once you accept the update, the gadget follows the new blueprint.'

const describeChoice = (choice: BlueprintChoice, status: string | null) => (
  <>
    <span className="block"><FormattedMessage id="updateFromBlueprintDialog.version" defaultMessage="Version {version}" values={{ version: choice.version }} />{status && ` · ${status}`}</span>
    {choice.description && <span className="line-clamp-2">{choice.description}</span>}
  </>
)

/**
 * Proposes merging a blueprint's current release into a gadget (see GadgetClient.applyBlueprint()):
 * the blueprint the gadget follows, or, as an advanced option, another one the user names by ID
 * or link. The proposal lands in a new chat, where it is previewed and accepted, so nothing here
 * changes the gadget. Mount it while it should be open.
 */
export const UpdateFromBlueprintDialog = ({
  gadget,
  overseer,
  publicApi,
  authenticatedApi,
  userId,
  onClose,
  onProposed,
}: UpdateFromBlueprintDialogProps) => {
  const { formatMessage } = useIntl()
  const followedId = gadget.upstream?.blueprintId

  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [source, setSource] = useState<Source>(followedId === undefined ? 'switch' : 'followed')
  const [reference, setReference] = useState<{ text: string; lookup: ReferenceLookup }>(
    { text: '', lookup: { status: 'empty' } },
  )
  const referenceRequest = useRef(0)
  const [applying, setApplying] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  // Wrapped, so that a pick of "No agent" (null) is told from no pick at all.
  const [pickedReviewer, setPickedReviewer] = useState<{ modelId: string | null } | null>(null)
  const selectContainer = useDialogSelectPortalContainer()

  useEffect(() => {
    let cancelled = false
    Promise.all([
      overseer.listModels(),
      followedId === undefined ? null : publicApi.getBlueprint(followedId),
    ]).then(([models, followed]) => {
      if (cancelled) return
      setLoad({ status: 'loaded', models, followed })
    }, err => {
      logRpcFailure('Failed to load the blueprint to update from:', err)
      if (!cancelled) setLoad({ status: 'failed' })
    })
    return () => { cancelled = true }
  }, [overseer, publicApi, followedId, loadAttempt])

  const retryLoad = () => {
    setLoad({ status: 'loading' })
    setLoadAttempt(attempt => attempt + 1)
  }

  const handleReferenceChange = (text: string) => {
    const request = ++referenceRequest.current
    setOutcome(null)
    const blueprintId = parseBlueprintReference(text)
    if (blueprintId === null) {
      setReference({ text, lookup: { status: text.trim() === '' ? 'empty' : 'invalid' } })
      return
    }
    setReference({ text, lookup: { status: 'loading' } })
    publicApi.getBlueprint(blueprintId).then(blueprint => {
      if (referenceRequest.current !== request) return
      setReference({
        text,
        lookup: blueprint === null ? { status: 'notFound' } : { status: 'found', blueprint },
      })
    }, err => {
      logRpcFailure('Failed to look up a blueprint by ID:', err)
      if (referenceRequest.current === request) setReference({ text, lookup: { status: 'failed' } })
    })
  }

  const reviewerId = pickedReviewer
    ? pickedReviewer.modelId
    // The same choice a new chat's composer starts on, since a new chat is where this lands.
    : load.status === 'loaded' ? getStoredSelectedModel(userId, load.models) : null

  const pickReviewer = (modelId: string | null) => {
    setPickedReviewer({ modelId })
    // As the composer's selector does, since the chat this opens is where the choice applies.
    persistSelectedModel(authenticatedApi, userId, modelId)
  }

  const apply = async (blueprint: BlueprintChoice, allowUnrelated: boolean) => {
    if (load.status !== 'loaded') return
    setApplying(true)
    try {
      const result = await gadget.client.applyBlueprint(blueprint.id, {
        modelId: reviewerId,
        ...(allowUnrelated ? { allowUnrelated } : {}),
      })
      if (result.outcome === 'proposed') onProposed(result.chatId)
      else setOutcome({ kind: result.outcome, blueprint })
    } catch (err) {
      // What the server says is worth showing as it is. In particular it is how the user learns
      // that the gadget changed while the update was being worked out, which trying again cures.
      const transient = logRpcFailure('Failed to apply a blueprint:', err)
      const message = transient || !(err instanceof Error) || !err.message
        ? formatMessage({ id: 'updateFromBlueprintDialog.somethingWentWrongWhilePreparingThe', defaultMessage: 'Something went wrong while preparing the update.' })
        : err.message
      setOutcome({ kind: 'failed', blueprint, allowUnrelated, message })
    } finally {
      setApplying(false)
    }
  }

  const followed = load.status === 'loaded' && load.followed ? load.followed : null
  const followedChoice = followed && toBlueprintChoice(followed)
  const namedChoice = reference.lookup.status === 'found'
    ? toBlueprintChoice(reference.lookup.blueprint)
    : null
  // With no followed blueprint to offer, naming another is the only way to update.
  const selected = source === 'switch' || !followedChoice ? namedChoice : followedChoice

  // A blueprint stored before releases were commits names no release to compare with, and a
  // gadget made before gadgets recorded the release they took has none to compare. Either gets
  // neither status.
  const followedStatus =
    !followed || gadget.upstream?.commitId === undefined ||
      followed.metadata.commitId === undefined ? null
      : hasNewerRelease(gadget.upstream, followed.metadata) ? formatMessage({ id: 'updateFromBlueprintDialog.updateAvailable', defaultMessage: 'Update available' })
        : formatMessage({ id: 'updateFromBlueprintDialog.upToDate', defaultMessage: 'Up to date' })

  const header = (title: string, description: string) => (
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-kumo-line px-4 py-5 sm:px-6">
      <div className="min-w-0">
        <Dialog.Title className="text-[17px] leading-6 font-medium tracking-[-0.35px] text-kumo-default">
          {title}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-[13px] leading-[18px] font-normal tracking-[-0.25px] text-kumo-subtle">
          {description}
        </Dialog.Description>
      </div>
      <Dialog.Close
        render={props => (
          <WorkshopIconButton {...props} disabled={applying} aria-label={formatMessage({ id: 'updateFromBlueprintDialog.close', defaultMessage: 'Close' })}>
            <X size={18} />
          </WorkshopIconButton>
        )}
      />
    </div>
  )

  const actions = (buttons: ReactNode) => (
    <div className="flex items-center justify-between gap-3">
      <p role="status" className="m-0 min-w-0 text-[12px] leading-4 tracking-[-0.2px] text-kumo-subtle">
        {applying && APPLYING_NOTE}
      </p>
      <div className="flex shrink-0 items-center gap-2">{buttons}</div>
    </div>
  )

  const switchForm = () => (
    <div className="space-y-2">
      <p className={BODY_TEXT}>{SWITCH_NOTE}</p>
      <WorkshopInput
        aria-label={formatMessage({ id: 'updateFromBlueprintDialog.blueprintIdOrLink', defaultMessage: 'Blueprint ID or link' })}
        placeholder={formatMessage({ id: 'updateFromBlueprintDialog.pasteABlueprintIdOrLink', defaultMessage: 'Paste a blueprint ID or link' })}
        value={reference.text}
        onChange={event => handleReferenceChange(event.target.value)}
        disabled={applying}
        className="w-full"
      />
      <div role="status" className={`${BODY_TEXT} empty:hidden`}>
        {namedChoice ? (
          <>
            <span className="block font-medium text-kumo-default">{namedChoice.title}</span>
            {describeChoice(namedChoice, null)}
          </>
        ) : REFERENCE_MESSAGES[reference.lookup.status]}
      </div>
    </div>
  )

  const reviewerField = (models: readonly AiChatAuthorInfo[]) => (
    <Select
      label={formatMessage({ id: 'updateFromBlueprintDialog.reviewingAgent', defaultMessage: 'Reviewing agent' })}
      description={
        formatMessage({ id: 'updateFromBlueprintDialog.ifYouveCustomizedThisGadgetThis', defaultMessage: 'If you’ve customized this gadget, this agent makes sure your customizations are compatible with the new version. Choose “No agent” to check them yourself.' })
      }
      className="w-full text-sm [&_button]:!h-9"
      container={selectContainer}
      value={toModelSelectValue(reviewerId)}
      onValueChange={value => pickReviewer(fromModelSelectValue(String(value)))}
      renderValue={value => value === NO_AGENT_OPTION_VALUE
        ? formatMessage({ id: 'updateFromBlueprintDialog.noAgent', defaultMessage: 'No agent' })
        : models.find(model => model.id === value)?.name ?? String(value)}
      disabled={applying}
    >
      {models.map(model => (
        <Select.Option key={model.id} value={model.id}>{model.name}</Select.Option>
      ))}
      <Select.Option value={NO_AGENT_OPTION_VALUE}><FormattedMessage id="updateFromBlueprintDialog.noAgent" defaultMessage="No agent" /></Select.Option>
    </Select>
  )

  const outcomeBanner = () => {
    switch (outcome?.kind) {
      case 'upToDate':
        return (
          <Banner
            size="sm"
            title={formatMessage({ id: 'updateFromBlueprintDialog.alreadyUpToDate', defaultMessage: 'Already up to date' })}
            description={formatMessage({ id: 'updateFromBlueprintDialog.thisGadgetAlreadyHasTheLatest', defaultMessage: 'This gadget already has the latest version of {title}.' }, { title: outcome.blueprint.title })}
          />
        )
      case 'baseUnavailable':
        return (
          <Banner
            variant="alert"
            size="sm"
            title={formatMessage({ id: 'updateFromBlueprintDialog.thisUpdateCantBeMerged', defaultMessage: 'This update can\'t be merged' })}
            description={
              `This gadget and ${outcome.blueprint.title} have an earlier version in common, but ` +
              'its files are not available to merge against.'
            }
          />
        )
      case 'failed':
        return (
          <Banner
            variant="error"
            size="sm"
            title={formatMessage({ id: 'updateFromBlueprintDialog.theUpdateCouldNotBePrepared', defaultMessage: 'The update could not be prepared' })}
            description={outcome.message}
            action={
              <Banner.Action
                onClick={() => apply(outcome.blueprint, outcome.allowUnrelated)}
                disabled={applying}
              >
                <FormattedMessage id="updateFromBlueprintDialog.tryAgain" defaultMessage="Try again" />
              </Banner.Action>
            }
          />
        )
      default:
        return null
    }
  }

  const unrelated = outcome?.kind === 'unrelated' ? outcome.blueprint : null

  return (
    <Dialog.Root open onOpenChange={nextOpen => { if (!nextOpen && !applying) onClose() }}>
      <Dialog className={DIALOG_CLASS} size="lg">
        {unrelated ? (
          <>
            {header(formatMessage({ id: 'updateFromBlueprintDialog.unrelatedBlueprint', defaultMessage: 'Unrelated blueprint' }), formatMessage({ id: 'updateFromBlueprintDialog.thisGadgetSharesNoHistoryWith', defaultMessage: 'This gadget shares no history with {title}.' }, { title: unrelated.title }))}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
              {/* Kumo's Banner announces nothing itself, and this replaces what was on screen. */}
              <div role="alert">
                <Banner
                  variant="alert"
                  size="sm"
                  title={formatMessage({ id: 'updateFromBlueprintDialog.yourOwnChangesMayBeUndone', defaultMessage: 'Your own changes may be undone' })}
                  description={
                    formatMessage({ id: 'updateFromBlueprintDialog.withNoVersionInCommonThe', defaultMessage: 'With no version in common, the update has to be merged against a guess at what this gadget was built from. A change of yours that the guess happens to include looks like something the blueprint removed, and is undone without a conflict being reported.' })
                  }
                />
              </div>
              <p className={BODY_TEXT}>
                <FormattedMessage id="updateFromBlueprintDialog.theUpdateOpensInANew" defaultMessage="The update opens in a new chat, where you can check the result before accepting it. Nothing changes until you do." />
              </p>
            </div>
            <div className="shrink-0 border-t border-kumo-line px-4 py-4 sm:px-6">
              {actions((
                <>
                  <WorkshopButton
                    className="!h-9"
                    onClick={() => setOutcome(null)}
                    disabled={applying}
                    // The button that led here is gone, and took the focus with it.
                    autoFocus
                  >
                    <FormattedMessage id="updateFromBlueprintDialog.back" defaultMessage="Back" />
                  </WorkshopButton>
                  <WorkshopButton tone="primary" onClick={() => apply(unrelated, true)} disabled={applying}>
                    {applying ? formatMessage({ id: 'updateFromBlueprintDialog.preparingUpdate', defaultMessage: 'Preparing update…' }) : formatMessage({ id: 'updateFromBlueprintDialog.updateAnyway', defaultMessage: 'Update anyway' })}
                  </WorkshopButton>
                </>
              ))}
            </div>
          </>
        ) : (
          <>
            {header(
              formatMessage({ id: 'updateFromBlueprintDialog.updateFromBlueprint', defaultMessage: 'Update from blueprint' }),
              formatMessage({ id: 'updateFromBlueprintDialog.mergeABlueprintsLatestVersionInto', defaultMessage: 'Merge a blueprint\'s latest version into {title}. The update opens in a new chat, where you can try it before accepting it.' }, { title: gadget.title }),
            )}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
              {load.status === 'loading' ? (
                <div className="flex justify-center py-6"><Loader size="base" /></div>
              ) : load.status === 'failed' ? (
                <Banner
                  variant="error"
                  size="sm"
                  title={formatMessage({ id: 'updateFromBlueprintDialog.theBlueprintCouldNotBeLoaded', defaultMessage: 'The blueprint could not be loaded' })}
                  action={<Banner.Action onClick={retryLoad}><FormattedMessage id="updateFromBlueprintDialog.tryAgain" defaultMessage="Try again" /></Banner.Action>}
                />
              ) : !followedChoice ? (
                <>
                  <p className={BODY_TEXT}>
                    {followedId === undefined
                      ? formatMessage({ id: 'updateFromBlueprintDialog.theBlueprintThisGadgetWasMade', defaultMessage: 'The blueprint this gadget was made from is not known, so paste the ID or link of the one to update from.' })
                      : formatMessage({ id: 'updateFromBlueprintDialog.theBlueprintThisGadgetFollowsIs', defaultMessage: 'The blueprint this gadget follows is no longer available, but you can switch it to another.' })}
                  </p>
                  {switchForm()}
                </>
              ) : (
                <>
                  <Radio.Group
                    appearance="card"
                    value={source}
                    onValueChange={value => {
                      setSource(value)
                      setOutcome(null)
                    }}
                    disabled={applying}
                  >
                    <Radio.Legend className="sr-only"><FormattedMessage id="updateFromBlueprintDialog.blueprintToUpdateFrom" defaultMessage="Blueprint to update from" /></Radio.Legend>
                    <Radio.Item
                      value="followed"
                      label={formatMessage({ id: 'updateFromBlueprintDialog.updateFrom', defaultMessage: 'Update from {title}' }, { title: followedChoice.title })}
                      description={describeChoice(followedChoice, followedStatus)}
                    />
                    <Radio.Item
                      value="switch"
                      label={formatMessage({ id: 'updateFromBlueprintDialog.advancedSwitchBlueprints', defaultMessage: 'Advanced: Switch blueprints' })}
                      description={formatMessage({ id: 'updateFromBlueprintDialog.updateFromADifferentBlueprintNamed', defaultMessage: 'Update from a different blueprint, named by its ID or link.' })}
                    />
                  </Radio.Group>
                  {source === 'switch' && switchForm()}
                </>
              )}
              {load.status === 'loaded' && reviewerField(load.models)}
            </div>

            <div className="shrink-0 space-y-3 border-t border-kumo-line px-4 py-4 sm:px-6">
              {/* Always present, so that what arrives in it is announced: Kumo's Banner announces
                  nothing itself. */}
              <div aria-live="polite" className="empty:hidden">{outcomeBanner()}</div>
              {actions((
                <>
                  <WorkshopButton className="!h-9" onClick={onClose} disabled={applying}>
                    <FormattedMessage id="updateFromBlueprintDialog.cancel" defaultMessage="Cancel" />
                  </WorkshopButton>
                  <WorkshopButton
                    tone="primary"
                    onClick={() => { if (selected) void apply(selected, false) }}
                    disabled={applying || !selected}
                  >
                    {applying ? formatMessage({ id: 'updateFromBlueprintDialog.preparingUpdate', defaultMessage: 'Preparing update…' }) : formatMessage({ id: 'updateFromBlueprintDialog.update', defaultMessage: 'Update' })}
                  </WorkshopButton>
                </>
              ))}
            </div>
          </>
        )}
      </Dialog>
    </Dialog.Root>
  )
}
