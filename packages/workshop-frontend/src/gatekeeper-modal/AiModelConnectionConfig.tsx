import { Select, type PortalContainer } from '@cloudflare/kumo'
import { useIntl } from 'react-intl'
import { AiChatAuthorInfo } from '@gadgets/workshop-shared/api'
import { ConnectionConfigField } from './ConnectionConfigField'

export interface AiModelConnectionConfigProps {
  availableModels: AiChatAuthorInfo[]
  selectedModelId: string | undefined
  onSelectedModelIdChange: (id: string | undefined) => void
  selectContainer?: PortalContainer
}

export function AiModelConnectionConfig({
  availableModels,
  selectedModelId,
  onSelectedModelIdChange,
  selectContainer,
}: AiModelConnectionConfigProps) {
  const { formatMessage } = useIntl()
  return (
    <section className="grid gap-3">
      <ConnectionConfigField
        label={formatMessage({ id: 'aiModelConnectionConfig.modelLabel', defaultMessage: 'Model' })}
        description={formatMessage({
          id: 'aiModelConnectionConfig.modelDescription', defaultMessage: 'Choose the model this connection can use.',
        })}
      >
        <Select
          aria-label={formatMessage({ id: 'aiModelConnectionConfig.selectAiModel', defaultMessage: 'Select an AI model' })}
          className="w-full text-sm [&_button]:!h-9"
          container={selectContainer}
          placeholder={formatMessage({ id: 'aiModelConnectionConfig.selectAiModel', defaultMessage: 'Select an AI model' })}
          value={selectedModelId}
          onValueChange={(v) => onSelectedModelIdChange(v as string | undefined)}
          renderValue={(id) => availableModels.find((m) => m.id === id)?.name ?? id}
        >
          {availableModels.map(model => (
            <Select.Option key={model.id} value={model.id}>
              {model.name}
            </Select.Option>
          ))}
        </Select>
      </ConnectionConfigField>
    </section>
  )
}
