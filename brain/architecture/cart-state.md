# Cart state isn't persisted

Cart is a module-level `Map` in `src/lib/catalog.ts`. Restart = empty cart. Don't add persistence without matching client cart sync.
