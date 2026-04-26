import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Send, Sparkles, Square, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import { parsePartialJSON } from '@tanstack/ai'
import { ComarkClient } from '@comark/react'
import { useHotkey } from '@tanstack/react-hotkeys'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Kbd } from '#/components/ui/kbd'
import { cn } from '#/lib/utils'
import { StorefrontCanvas } from '#/features/storefront/components/storefront-canvas'
import { FrozenCanvas } from '#/features/storefront/components/frozen-canvas'
import { ProgramCard, PriorAttemptChip } from '#/features/storefront/components/program-card'
import { SkillCard } from '#/features/storefront/components/skill-card'
import { InlineErrorCard } from '#/features/storefront/components/inline-error-card'
import { SystemPromptSheet } from '#/features/storefront/components/system-prompt-sheet'
import { useQueryClient } from '@tanstack/react-query'
import { canvasCallbacks } from '#/features/storefront/components/canvas/canvas-callbacks'
import { uiStore } from '#/features/storefront/stores/ui-store'
import { invalidateCart } from '#/queries/cart'
import {
  activityStore,
  snapshotUIState,
  useActivityState,
} from '#/features/storefront/stores/activity-store'
import type { PriorAttempt, TerminalError } from '#/features/storefront/types/activity-types'
import type { UIEvent } from '#/features/storefront/types/ui-types'

type AnyMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  parts: Array<any>
}

const STARTER_PROMPTS = [
  'Compare the three top-rated running shoes under $160 in size 10.',
  'Any wide-width trail shoes I could get by Friday?',
  "Best-value basketball shoe that's actually in stock?",
] as const

function ThinkingDots() {
  return (
    <div
      className="mr-auto inline-flex items-center gap-1.5 rounded-2xl bg-muted px-3.5 py-2.5"
      aria-label="Storekeeper is thinking"
      role="status"
    >
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60" />
    </div>
  )
}

const CART_MUTATING_CALLS = new Set([
  'external_addToCart',
  'external_removeFromCart',
  'external_setCartQuantity',
  'external_clearCart',
  'external_placeOrder',
])

function turnTouchedCart(turn: { calls: Array<{ function: string }> }): boolean {
  return turn.calls.some((c) => CART_MUTATING_CALLS.has(c.function))
}

function buildAssistantTurnIds(
  messages: Array<AnyMessage>,
  turnIds: Array<string>,
): Array<string | null> {
  const out: Array<string | null> = []
  let userCount = 0
  for (const m of messages) {
    if (m.role === 'user') userCount++
    else if (m.role === 'assistant') out.push(turnIds[userCount - 1] ?? null)
  }
  return out
}

function extractToolCallData(parts: Array<any>) {
  const calls = parts.filter((p) => p.type === 'tool-call' && p.name === 'execute_typescript')
  return calls
}

function extractTypescriptCode(part: any): string | undefined {
  const fromInput = part?.input?.typescriptCode
  if (typeof fromInput === 'string') return fromInput
  const args = part?.arguments
  if (typeof args !== 'string' || !args) return undefined
  const parsed = parsePartialJSON(args) as { typescriptCode?: unknown } | null
  return typeof parsed?.typescriptCode === 'string' ? parsed.typescriptCode : undefined
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
  onCustomEvent,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  zipCode?: string
  onCustomEvent?: (eventType: string, data: unknown) => void
}) {
  const lastPromptRef = useRef<string>('')
  const turnIdsRef = useRef<Array<string>>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const queryClient = useQueryClient()

  const { messages, sendMessage, isLoading, stop, clear } = useChat({
    connection: fetchServerSentEvents('/api/storefront-agent'),
    body: { data: { zipCode } },
    onCustomEvent(eventType, data) {
      if (eventType === 'storefront:ui') {
        uiStore.dispatch(data as UIEvent)
      } else if (eventType.startsWith('code_mode:')) {
        activityStore.record(eventType, data as Record<string, unknown>)
      } else if (eventType === 'skill:registered') {
        const tid = activityStore.get().currentTurnId
        if (tid) {
          const payload = data as { name: string; description?: string }
          activityStore.setSkillRegistered(tid, {
            name: payload.name,
            description: payload.description,
            registeredAt: Date.now(),
          })
        }
      }
      onCustomEvent?.(eventType, data)
    },
    onFinish() {
      const currentTid = activityStore.get().currentTurnId
      if (currentTid) {
        const turn = activityStore.get().byTurnId[currentTid]
        activityStore.endTurn(currentTid, snapshotUIState(uiStore.get()))
        if (turn && turnTouchedCart(turn)) void invalidateCart(queryClient)
      } else {
        void invalidateCart(queryClient)
      }
      inputRef.current?.focus()
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
  const [promptOpen, setPromptOpen] = useState(false)
  const activityState = useActivityState()

  const typedMessages = messages as unknown as Array<AnyMessage>

  const assistantTurnIds = useMemo(
    () => buildAssistantTurnIds(typedMessages, turnIdsRef.current),
    [typedMessages],
  )

  useEffect(() => {
    let assistantIdx = -1
    for (const msg of typedMessages) {
      if (msg.role !== 'assistant') continue
      assistantIdx++
      const tid = assistantTurnIds[assistantIdx]
      if (!tid) continue
      const toolCalls = extractToolCallData(msg.parts)
      if (!toolCalls.length) continue

      const last = toolCalls[toolCalls.length - 1]
      const priors: Array<PriorAttempt> = toolCalls.slice(0, -1).map((tc) => ({
        code: extractTypescriptCode(tc),
        error:
          tc.output && tc.output.success === false
            ? toTerminalErrorFromOutput(tc.output)
            : { source: 'runtime', message: 'Attempt failed' },
      }))
      activityStore.setPriorAttempts(tid, priors)

      const code = extractTypescriptCode(last)
      if (code) activityStore.setCode(tid, code)
      if (last.output) {
        if (last.output.success) {
          activityStore.setReturnValue(tid, last.output.result)
        } else {
          activityStore.setTerminalError(tid, toTerminalErrorFromOutput(last.output))
        }
      }
    }
  }, [typedMessages, assistantTurnIds])

  const launch = useCallback(
    async (text: string) => {
      uiStore.clear()
      const tid = crypto.randomUUID()
      turnIdsRef.current.push(tid)
      activityStore.startTurn(tid)
      lastPromptRef.current = text
      stickToBottomRef.current = true
      inputRef.current?.focus()
      await sendMessage(text)
    },
    [sendMessage],
  )

  useEffect(() => {
    canvasCallbacks.setHandlers({ onFollowupSelect: (text) => void launch(text) })
    return () => canvasCallbacks.setHandlers(null)
  }, [launch])

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

  function handleClear() {
    if (isLoading) stop()
    clear()
    activityStore.clear()
    uiStore.clear()
    turnIdsRef.current = []
    lastPromptRef.current = ''
    stickToBottomRef.current = true
    setInput('')
    inputRef.current?.focus()
  }

  useHotkey('/', () => inputRef.current?.focus(), { enabled: open && !isLoading })
  useHotkey('Escape', () => stop(), { enabled: open && isLoading })
  useHotkey('R', () => void handleRetry(), {
    enabled: open && !isLoading && !!lastPromptRef.current,
  })
  useHotkey('P', () => setPromptOpen(true), { enabled: open && !promptOpen })
  useHotkey('N', () => handleClear(), {
    enabled: open && typedMessages.length > 0,
  })
  useHotkey('1', () => void launch(STARTER_PROMPTS[0]), {
    enabled: open && !isLoading && typedMessages.length === 0,
  })
  useHotkey('2', () => void launch(STARTER_PROMPTS[1]), {
    enabled: open && !isLoading && typedMessages.length === 0,
  })
  useHotkey('3', () => void launch(STARTER_PROMPTS[2]), {
    enabled: open && !isLoading && typedMessages.length === 0,
  })

  const liveTurnId = useMemo(() => {
    const cur = activityState.currentTurnId
    if (!cur) return null
    const turn = activityState.byTurnId[cur]
    if (isLoading || (turn && !turn.endedAt)) return cur
    let assistantCount = 0
    let userCount = 0
    for (const m of typedMessages) {
      if (m.role === 'assistant') assistantCount++
      else if (m.role === 'user') userCount++
    }
    return userCount > assistantCount ? cur : null
  }, [activityState.byTurnId, activityState.currentTurnId, isLoading, typedMessages])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      stickToBottomRef.current = distance < 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const el = scrollContainerRef.current
    if (!el || !stickToBottomRef.current) return
    el.scrollTop = el.scrollHeight
  }, [open, typedMessages, activityState, isLoading])

  let assistantIdxCursor = -1

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        >
          <SheetHeader className="border-b px-5 py-4">
            <div className="flex items-center justify-between gap-2 pr-7">
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Storekeeper
              </SheetTitle>
              <div className="flex items-center gap-1">
                {typedMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear chat"
                    className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear</span>
                    <Kbd className="ml-0.5">N</Kbd>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPromptOpen(true)}
                  aria-label="View system prompt"
                  className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Prompt</span>
                  <Kbd className="ml-0.5">P</Kbd>
                </button>
              </div>
            </div>
            <SheetDescription>
              Ask for shoes in plain English. Each answer comes from a TypeScript program the model
              writes and runs in a sandbox — click the program card to see what it did.
            </SheetDescription>
          </SheetHeader>

          <div
            ref={scrollContainerRef}
            className="scrollbar-thin min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
          >
            <div
              className="space-y-3 p-5"
              role="log"
              aria-live="polite"
              aria-atomic="false"
              aria-label="Conversation with Storekeeper"
            >
              {typedMessages.length === 0 && (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Try one of these:</div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {STARTER_PROMPTS.map((prompt, i) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void launch(prompt)}
                        className="flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-left text-xs text-foreground transition hover:bg-muted hover:border-primary/40"
                      >
                        <Kbd>{i + 1}</Kbd>
                        <span className="flex-1">{prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {typedMessages.map((m) => {
                if (m.role === 'user') {
                  return (
                    <div
                      key={m.id}
                      className="ml-auto max-w-[75%] rounded-2xl bg-primary/15 px-3.5 py-2 text-sm text-foreground"
                    >
                      {m.parts.map((p: any, i: number) =>
                        p.type === 'text' ? (
                          // oxlint-disable-next-line no-array-index-key
                          <span key={i}>{p.content}</span>
                        ) : null,
                      )}
                    </div>
                  )
                }
                if (m.role !== 'assistant') return null

                assistantIdxCursor++
                const tid = assistantTurnIds[assistantIdxCursor] ?? null
                const nextTid = assistantTurnIds[assistantIdxCursor + 1] ?? null
                if (tid && nextTid === tid) return null

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

                const hasProgramActivity =
                  !!turn &&
                  (turn.calls.length > 0 ||
                    !!turn.code ||
                    turn.codeLength != null ||
                    !!turn.terminalError)
                const hasSkillReplays = !!turn && turn.replayedSkills.length > 0
                const showProgramCard =
                  !!turn && (hasProgramActivity || (turn.turnId === liveTurnId && !hasSkillReplays))

                return (
                  <div key={m.id} className="mr-auto w-full min-w-0 max-w-[92%] space-y-2">
                    {turn?.priorAttempts.map((pa, i) => (
                      <PriorAttemptChip
                        // oxlint-disable-next-line no-array-index-key
                        key={i}
                        index={i}
                        error={{ name: pa.error.name, message: pa.error.message }}
                      />
                    ))}
                    {showProgramCard && turn && <ProgramCard turn={turn} />}
                    {turn?.replayedSkills.map((skill) => (
                      <SkillCard key={skill.id} skill={skill} />
                    ))}
                    {textParts.length > 0 && (
                      <div
                        className={cn(
                          'prose prose-sm dark:prose-invert max-w-none rounded-lg bg-muted px-3 py-2 text-sm',
                          'prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground',
                          'prose-a:text-brand-fg prose-a:underline prose-a:decoration-brand-fg/40 prose-a:underline-offset-2 hover:prose-a:decoration-brand-fg',
                          'prose-ul:my-2 prose-li:my-0.5 prose-li:marker:text-fg-subtle',
                          isLiveStream &&
                            "after:ml-[1px] after:inline-block after:h-3 after:w-[2px] after:translate-y-[2px] after:animate-pulse after:bg-primary/70 after:content-['']",
                        )}
                      >
                        <ComarkClient markdown={markdown} streaming={isLiveStream} caret={false} />
                      </div>
                    )}
                    {turn?.canvasSnapshot && turn.canvasSnapshot.rootIds.length > 0 && (
                      <FrozenCanvas snapshot={turn.canvasSnapshot} />
                    )}
                    {isLiveStream && textParts.length === 0 && !showInlineError && <ThinkingDots />}
                    {showInlineError && terminal && (
                      <InlineErrorCard
                        title="Storekeeper couldn't finish this one."
                        message={
                          terminal.name ? `${terminal.name}: ${terminal.message}` : terminal.message
                        }
                        onRetry={() => void handleRetry()}
                        onAskDifferently={() => inputRef.current?.focus()}
                      />
                    )}
                  </div>
                )
              })}

              {liveTurnId &&
                activityState.byTurnId[liveTurnId] &&
                !assistantTurnIds.includes(liveTurnId) && (
                  <div className="mr-auto w-full min-w-0 max-w-[92%] space-y-2">
                    <ThinkingDots />
                    {activityState.byTurnId[liveTurnId].replayedSkills.length === 0 && (
                      <ProgramCard turn={activityState.byTurnId[liveTurnId]} />
                    )}
                    {activityState.byTurnId[liveTurnId].replayedSkills.map((skill) => (
                      <SkillCard key={skill.id} skill={skill} />
                    ))}
                  </div>
                )}

              {liveTurnId && <StorefrontCanvas />}
            </div>
          </div>

          <form onSubmit={handleSend} className="border-t p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Storekeeper…"
                  disabled={isLoading}
                />
                {!input && !isLoading && (
                  <Kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                    /
                  </Kbd>
                )}
              </div>
              {isLoading ? (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={() => stop()}
                  aria-label="Stop generating"
                  title="Stop (Esc)"
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim()}
                  aria-label="Send message"
                  title="Send (Enter)"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </SheetContent>
      </Sheet>
      <SystemPromptSheet open={promptOpen} onOpenChange={setPromptOpen} zipCode={zipCode} />
    </>
  )
}
