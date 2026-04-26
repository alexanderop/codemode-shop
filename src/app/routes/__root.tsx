import { useCallback } from 'react'
import { HeadContent, Link, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { useHotkey, useHotkeySequence } from '@tanstack/react-hotkeys'
import { useRouter } from '@tanstack/react-router'
import { Toaster } from '#/components/ui/sonner'
import { Button } from '#/components/ui/button'
import { StorekeeperDrawer } from '#/features/storefront/components/storekeeper-drawer'
import { KeyboardCheatsheet } from '#/components/keyboard-cheatsheet'
import { assistantUi, useAssistantOpen } from '#/stores/assistant-ui'
import { cheatsheetUi, useCheatsheetOpen } from '#/stores/cheatsheet-ui'
import { cartQueryOptions } from '#/queries/cart'
import { AiActionConfirm } from '#/features/ai-ui/ai-action-confirm'
import { useAiActionHandler } from '#/features/ai-ui/use-ai-action'
import { aiUiStore } from '#/features/ai-ui/store'
import {
  AI_UI_DISPATCH_EVENT,
  type AiAction,
  type AiActionPayloadByType,
} from '#/features/ai-ui/types'

import appCss from '#/styles.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'codemode.shop — TanStack AI code mode demo',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(cartQueryOptions())
  },
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-md text-muted-foreground">
        We couldn't find the page you were looking for.
      </p>
      <Button asChild>
        <Link to="/">Back to storefront</Link>
      </Button>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const assistantOpen = useAssistantOpen()
  const cheatsheetOpen = useCheatsheetOpen()
  const router = useRouter()
  useHotkey('Mod+K', () => {
    assistantUi.toggle()
  })
  useHotkey({ key: '/', shift: true }, () => {
    cheatsheetUi.toggle()
  })
  useHotkeySequence(['G', 'H'], () => {
    void router.navigate({ to: '/' })
  })
  useHotkeySequence(['G', 'C'], () => {
    void router.navigate({ to: '/cart' })
  })

  const handleNavigate = useCallback(
    (payload: AiActionPayloadByType['navigate']) => {
      const go = () => router.navigate({ to: payload.to })
      if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        document.startViewTransition(() => go())
      } else {
        void go()
      }
    },
    [router],
  )
  useAiActionHandler('navigate', handleNavigate)

  const handleDrawerCustomEvent = useCallback((eventType: string, data: unknown) => {
    if (eventType === AI_UI_DISPATCH_EVENT) {
      aiUiStore.propose(data as AiAction)
    }
  }, [])

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <StorekeeperDrawer
          open={assistantOpen}
          onOpenChange={assistantUi.set}
          onCustomEvent={handleDrawerCustomEvent}
        />
        <KeyboardCheatsheet open={cheatsheetOpen} onOpenChange={cheatsheetUi.set} />
        <AiActionConfirm />
        <Toaster position="top-center" />
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            {
              name: 'TanStack Query',
              render: <ReactQueryDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
