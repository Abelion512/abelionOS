# Runtime and Scope Decisions

Mintdesk uses **pnpm** for the hosted web application. The React, Vite, Express, Drizzle, and Vitest project is defined by `package.json` and `pnpm-lock.yaml`; it does not use `bun.lock`. This avoids lockfile drift and preserves the managed full-stack template workflow.

The Linux companion uses **Bun** as its local runtime. Bun runs the lightweight systemd user service, loopback pairing endpoint, outbound polling, and local 9router proposal parsing. It does not run the hosted application or execute Google actions.

Google Workspace writes are deliberately limited to reviewed Daily Focus actions. Google Tasks, Calendar create/delete for self-organized events, and Gmail Trash are available only after an explicit preview and confirmation. Gmail Draft and send capabilities remain out of scope because `gmail.compose` is not granted. A Calendar event has no Trash state; a controlled verification creates a named test event and deletes that exact self-organized event only after explicit approval.

Gmail content previews use the already-granted `gmail.modify` scope because Google does not provide a narrower scope that both reads message bodies and moves messages to Trash. The OAuth grant is therefore broader than Mintdesk's application allowlist. Mintdesk does not expose Draft, send, permanent-delete, filter, or settings endpoints; the server allowlist exposes only reviewed Gmail Trash. Bounded previews are fetched on open, never persisted, and are sent to local reasoning only after the user explicitly requests refinement.
