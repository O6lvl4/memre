# MemRE

AI-powered spaced repetition flashcards as a native macOS desktop app.

- **Wails v3** shell (Go + WebView)
- **React 18 + Tailwind v4** UI
- **SQLite** local persistence (pure-Go `modernc.org/sqlite`)
- **Multi-provider AI**: Ollama (Gemma 4 by default) / Anthropic API / Claude Code CLI / offline stub fallback
- **DDD vertical slice** architecture (one bounded context per directory)

## Quick start

```bash
# Build the production bundle (requires Xcode CLT, Go 1.25+, Node 20+)
cd frontend && npm ci && cd ..
wails3 task darwin:package

# Run the bundled app
open bin/memre.app
```

## AI providers

Configure via the gear icon in the header. Settings live in
`~/Library/Application Support/Memre/memre.db` (the same SQLite store used
for decks/cards). API keys are kept local; nothing is uploaded.

| Provider | Auth | Default model |
|---|---|---|
| Ollama (local) | none | `gemma4:26b` (or set `MEMRE_OLLAMA_MODEL`) |
| Anthropic API | API key (set in dialog) | `claude-sonnet-4-6` |
| Claude Code CLI | none — uses your `claude` CLI session | `claude-sonnet-4-6` |
| Local stub | n/a | offline fallback only |

Settings hot-reload: changes apply on the next AI call without restart.

## Architecture

```
internal/
├── deck/          ← bounded context (entity + service + repository + sqlite + wails handler)
├── card/
├── knowledge/
├── ai/            ← Provider interface + Ollama/Anthropic/ClaudeCode/Stub + Registry
├── settings/
├── srs/           ← pure SM-2 / retention math
├── platform/
│   ├── sqlite/    ← shared DB connection + migration
│   ├── clock/
│   └── idgen/
└── composition/   ← composition root (the only place adapters meet ports)
```

Each context owns its repository interface (consumer-side) and the SQLite
implementation. Services accept dependencies as struct fields so tests
substitute fakes without any DI framework.

## Development

```bash
go test -race -count=1 -cover ./internal/...   # ~110 tests, coverage 50–100% per pkg
wails3 generate bindings -ts                   # regen TS bindings after Go changes
wails3 dev                                     # hot-reload dev mode
```

## CI

`.github/workflows/ci.yml`:
- `go vet` + `go test -race`
- frontend `vite build`
- macOS full `.app` bundle + smoke test + artifact upload

## License

MIT
