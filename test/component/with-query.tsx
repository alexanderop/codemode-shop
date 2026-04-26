import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from 'vitest-browser-react'

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

export async function renderWithQuery(
  ui: ReactElement,
  queryClient: QueryClient = makeQueryClient(),
) {
  const screen = await render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
  return { screen, queryClient }
}
