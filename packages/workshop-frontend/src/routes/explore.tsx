import { createFileRoute } from '@tanstack/react-router'
import { useIntl } from 'react-intl'
import BlueprintsPage from '../BlueprintsPage'
import { useDocumentTitle } from '../useDocumentTitle'

export const Route = createFileRoute('/explore')({
  component: ExplorePage,
})

function ExplorePage() {
  const { formatMessage } = useIntl()
  useDocumentTitle(formatMessage({ id: 'explorePage.documentTitle', defaultMessage: 'Explore' }))

  return <BlueprintsPage />
}
