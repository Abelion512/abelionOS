# Runtime and Scope Decisions

Mintdesk uses **pnpm** for the hosted web application. The React, Vite, Express, Drizzle, and Vitest project is defined by `package.json` and `pnpm-lock.yaml`; it does not use `bun.lock`. This avoids lockfile drift and preserves the managed full-stack template workflow.

The Linux companion uses **Bun** as its local runtime. Bun runs the lightweight systemd user service, loopback pairing endpoint, outbound polling, and local 9router proposal parsing. It does not run the hosted application or execute Google actions.

Google Workspace writes are deliberately limited to reviewed Daily Focus actions. Google Tasks, Calendar create/delete for self-organized events, and Gmail Trash are available only after an explicit preview and confirmation. Gmail Draft and send capabilities remain out of scope because `gmail.compose` is not granted. A Calendar event has no Trash state; a controlled verification creates a named test event and deletes that exact self-organized event only after explicit approval.
