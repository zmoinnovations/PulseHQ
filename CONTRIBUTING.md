# Contributing to PulseHQ

Thanks for wanting to help! Here's how to get started.

## Getting started

1. Fork and clone the repo
2. `npm install`
3. Copy `.env.example` to `.env` and fill in at least one LLM provider key (Gemini, OpenAI, or Claude)
4. `npm run dev` — opens at http://localhost:3000

## Development workflow

- Create a feature branch from `main`: `git checkout -b feat/your-feature`
- Commit style: use prefixes like `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Keep commits focused — one logical change per commit

## Code style

- TypeScript strict mode — no `any` unless absolutely necessary
- 2-space indentation, double quotes
- Functional React with hooks (no class components)
- Tailwind CSS with CSS variables for theming (`var(--c-bg)`, etc.)
- Self-documenting code — comments only when the "why" isn't obvious
- camelCase for variables/functions, PascalCase for components/interfaces, kebab-case for filenames

## Pull requests

- Keep PRs focused on one thing
- Describe what changed and why in the PR description
- Make sure `npm run lint` passes before submitting
- If adding a new LLM provider, follow the pattern in `src/services/llm/providers/`

## What NOT to commit

- `.env` or any file with real API keys
- `leads_storage.json` or any runtime data files
- Large binary assets

## Questions?

Open an issue — we're happy to help you find the right approach before you start coding.
