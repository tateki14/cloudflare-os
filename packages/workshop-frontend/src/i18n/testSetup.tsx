import { createElement } from 'react'
import { vi } from 'vitest'
import { TestIntlProvider } from './testIntlProvider'

// The fork's i18n (react-intl) needs an <IntlProvider> above every component that renders a
// message, but upstream's tests mount with `createRoot` and no provider. Rather than editing each
// upstream test (and re-conflicting on every merge), every root renders inside TestIntlProvider.
vi.mock('react-dom/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom/client')>()
  const wrapRoot = (root: ReturnType<typeof actual.createRoot>) => {
    const render = root.render.bind(root)
    root.render = (children) => render(createElement(TestIntlProvider, null, children))
    return root
  }
  return {
    ...actual,
    createRoot: ((...args: Parameters<typeof actual.createRoot>) =>
      wrapRoot(actual.createRoot(...args))) as typeof actual.createRoot,
  }
})
