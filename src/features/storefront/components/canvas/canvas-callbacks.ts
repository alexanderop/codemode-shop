type Handlers = {
  onFollowupSelect: (text: string) => void
}

let handlers: Handlers | null = null

export const canvasCallbacks = {
  setHandlers(h: Handlers | null) {
    handlers = h
  },
  selectFollowup(text: string) {
    handlers?.onFollowupSelect(text)
  },
}
