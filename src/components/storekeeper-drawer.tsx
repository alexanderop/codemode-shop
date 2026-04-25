import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import { ComarkClient } from '@comark/react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { ScrollArea } from '#/components/ui/scroll-area'
import { StorefrontCanvas } from '#/components/storefront-canvas'
import { FrozenCanvas } from '#/components/frozen-canvas'
import { ProgramCard, PriorAttemptChip } from '#/components/program-card'
import { InlineErrorCard } from '#/components/inline-error-card'
import { uiStore } from '#/lib/storefront/ui-store'
import {
  activityStore,
  snapshotUIState,
  useActivityState,
} from '#/lib/storefront/activity-store'
import type {
  PriorAttempt,
  TerminalError,
} from '#/lib/storefront/activity-types'
import type { UIEvent } from '#/lib/storefront/ui-types'

type AnyMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  parts: Array<any>
}

function assistantTurnId(
  messages: Array<AnyMessage>,
  assistantIndex: number,
  turnIds: Array<string>,
): string | null {
  let userCountBefore = 0
  let seenAssistant = -1
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    if (m.role === 'user') userCountBefore++
    else if (m.role === 'assistant') {
      seenAssistant++
      if (seenAssistant === assistantIndex) {
        return turnIds[userCountBefore - 1] ?? null
      }
    }
  }
  return null
}

function extractToolCallData(parts: Array<any>) {
  const calls = parts.filter(
    (p) => p.type === 'tool-call' && p.name === 'execute_typescript',
  )
  return calls
}

function toTerminalErrorFromOutput(output: any): TerminalError {
  const err = output?.error
  if (!err) return { source: 'runtime', message: 'Execution failed' }
  const name: string | undefined = err.name
  return {
    source: name === 'TypeScriptError' ? 'typescript' : 'runtime',
    name,
    message: err.message ?? 'Execution failed',
    line: err.line,
  }
}

export function StorekeeperDrawer({
  open,
  onOpenChange,
  zipCode = '94107',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  zipCode?: string
}) {
  const lastPromptRef = useRef<string>('')
  const turnIdsRef = useRef<Array<string>>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, sendMessage, isLoading } = useChat({
    connection: fetchServerSentEvents('/api/storefront-agent'),
    body: { data: { zipCode } },
    onCustomEvent(eventType, data) {
      if (eventType === 'storefront:ui') {
        uiStore.dispatch(data as UIEvent)
      } else if (eventType.startsWith('code_mode:')) {
        activityStore.record(eventType, data as Record<string, unknown>)
      }
    },
    onFinish() {
      const currentTid = activityStore.get().currentTurnId
      if (currentTid) {
        const uiState = uiStore.get()
        activityStore.endTurn(currentTid, snapshotUIState(uiState))
      }
    },
    onError(err) {
      const currentTid = activityStore.get().currentTurnId
      if (currentTid) {
        activityStore.setTerminalError(currentTid, {
          source: 'network',
          message: err.message,
        })
        activityStore.endTurn(currentTid, snapshotUIState(uiStore.get()))
      }
      toast.error('Storekeeper hit a snag.', {
        description: err.message,
        action: lastPromptRef.current
          ? {
              label: 'Retry',
              onClick: () => {
                void handleRetry()
              },
            }
          : undefined,
      })
    },
  })
  const [input, setInput] = useState('')
  const activityState = useActivityState()

  const typedMessages = messages as unknown as Array<AnyMessage>

  useEffect(() => {
    let assistantIdx = -1
    for (let i = 0; i < typedMessages.length; i++) {
      const msg = typedMessages[i]
      if (msg.role !== 'assistant') continue
      assistantIdx++
      const tid = assistantTurnId(typedMessages, assistantIdx, turnIdsRef.current)
      if (!tid) continue
      const toolCalls = extractToolCallData(msg.parts)
      if (!toolCalls.length) continue

      const last = toolCalls[toolCalls.length - 1]
      const priors: Array<PriorAttempt> = toolCalls.slice(0, -1).map((tc) => ({
        code: tc.input?.typescriptCode,
        error:
          tc.output && tc.output.success === false
            ? toTerminalErrorFromOutput(tc.output)
            : { source: 'runtime', message: 'Attempt failed' },
      }))
      activityStore.setPriorAttempts(tid, priors)

      const code = last.input?.typescriptCode as string | undefined
      if (code) activityStore.setCode(tid, code)
      if (last.output) {
        if (last.output.success) {
          activityStore.setReturnValue(tid, last.output.result)
        } else {
          activityStore.setTerminalError(
            tid,
            toTerminalErrorFromOutput(last.output),
          )
        }
      }
    }
  }, [typedMessages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input
    setInput('')
    await launch(text)
  }

  async function handleRetry() {
    if (!lastPromptRef.current) return
    await launch(lastPromptRef.current)
  }

  async function launch(text: string) {
    uiStore.clear()
    const tid =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    turnIdsRef.current.push(tid)
    activityStore.startTurn(tid)
    lastPromptRef.current = text
    await sendMessage(text)
  }

  const pendingTurnId = useMemo(() => {
    const cur = activityState.currentTurnId
    if (!cur) return null
    const assistantCount = typedMessages.filter((m) => m.role === 'assistant').length
    const userCount = typedMessages.filter((m) => m.role === 'user').length
    return userCount > assistantCount ? cur : null
  }, [activityState.currentTurnId, typedMessages])

  let assistantIdxCursor = -1

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Storekeeper
          </SheetTitle>
          <SheetDescription>
            Ask for shoes in plain English. Each answer comes from a TypeScript
            program the model writes and runs in a sandbox — click the program
            card to see what it did.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-3 p-5">
            {typedMessages.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">Try one of these:</div>
                <ul className="mt-2 space-y-1.5">
                  <li>
                    “Compare the three top-rated running shoes under $160 in size
                    10.”
                  </li>
                  <li>“Any wide-width trail shoes I could get by Friday?”</li>
                  <li>“Best-value basketball shoe that's actually in stock?”</li>
                </ul>
              </div>
            )}

            {typedMessages.map((m) => {
              if (m.role === 'user') {
                return (
                  <div
                    key={m.id}
                    className="ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  >
                    {m.parts.map((p: any, i: number) =>
                      p.type === 'text' ? <span key={i}>{p.content}</span> : null,
                    )}
                  </div>
                )
              }
              if (m.role !== 'assistant') return null

              assistantIdxCursor++
              const tid = assistantTurnId(
                typedMessages,
                assistantIdxCursor,
                turnIdsRef.current,
              )
              const turn = tid ? activityState.byTurnId[tid] : null

              const textParts = m.parts.filter((p: any) => p.type === 'text')
              const markdown = textParts.map((p: any) => p.content).join('')
              const isLastAssistant = m === typedMessages[typedMessages.length - 1]
              const isLiveStream = isLoading && isLastAssistant
              const terminal = turn?.terminalError
              const showInlineError =
                !!terminal &&
                (terminal.source === 'runtime' ||
                  terminal.source === 'typescript' ||
                  terminal.source === 'loop-exhausted')

              return (
                <div key={m.id} className="mr-auto w-full max-w-[92%] space-y-2">
                  {turn?.priorAttempts.map((pa, i) => (
                    <PriorAttemptChip
                      key={i}
                      index={i}
                      error={{ name: pa.error.name, message: pa.error.message }}
                    />
                  ))}
                  {turn && (turn.calls.length > 0 || turn.code || turn.terminalError) && (
                    <ProgramCard turn={turn} />
                  )}
                  {textParts.length > 0 && (
                    <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg bg-muted px-3 py-2 text-sm">
                      <ComarkClient markdown={markdown} streaming={isLiveStream} caret={isLiveStream} />
                    </div>
                  )}
                  {turn?.canvasSnapshot && turn.canvasSnapshot.rootIds.length > 0 && (
                    <FrozenCanvas snapshot={turn.canvasSnapshot} />
                  )}
                  {showInlineError && terminal && (
                    <InlineErrorCard
                      title="Storekeeper couldn't finish this one."
                      message={
                        terminal.name
                          ? `${terminal.name}: ${terminal.message}`
                          : terminal.message
                      }
                      onRetry={() => void handleRetry()}
                      onAskDifferently={() => inputRef.current?.focus()}
                    />
                  )}
                </div>
              )
            })}

            {pendingTurnId && activityState.byTurnId[pendingTurnId] && (
              <div className="mr-auto w-full max-w-[92%]">
                <ProgramCard turn={activityState.byTurnId[pendingTurnId]} />
              </div>
            )}

            {pendingTurnId && <StorefrontCanvas />}
          </div>
        </ScrollArea>

        <form onSubmit={handleSend} className="border-t p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Storekeeper…"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
