# Software Design Document

## 1. Design Position

Mintdesk memakai arsitektur hybrid. Web application mengelola identity, metadata, S3 references, OAuth state, audit, dan UI. Linux companion berjalan lokal untuk metrics dan process control. Tidak ada komponen yang diberi hak root dari dashboard.

## 2. Architecture

```text
Browser
  ├── React + Wouter pages
  ├── tRPC client
  └── local bridge client ── localhost + bearer token ── Linux companion

Full-stack server
  ├── Manus auth/context
  ├── tRPC domain routers
  ├── Drizzle database
  ├── S3 storage helpers
  ├── Google OAuth + provider adapters
  └── audit/event service

Linux companion
  ├── metrics adapter
  ├── process reader
  ├── explicit termination allowlist
  ├── SIGTERM executor
  └── JSONL audit writer
```

## 3. Domain Modules

| Module | Responsibility | Boundary |
|---|---|---|
| Identity | user/session/ownership | Manus OAuth + protected procedures |
| Bridge | health, metrics, process list, terminate | localhost HTTP, token, origin allowlist |
| Files | upload, metadata, download, deletion policy | S3 bytes, DB metadata |
| Workspace | OAuth and provider data | server-side Google APIs |
| Audit | sensitive action history | DB for app events, JSONL local bridge events |
| Settings | connection configuration and revocation | protected user-owned records |

## 4. Data Model

Target tables are `users`, `files`, `bridge_connections`, `workspace_connections`, `audit_events`, and `user_settings`. `files` stores owner, object key, original name, MIME, byte size, checksum, and timestamps. File bytes never enter database columns. `workspace_connections` stores provider, encrypted refresh token, granted scopes, account identity, and expiry metadata. `audit_events` stores actor, action, resource type, resource id, result, and timestamp.

## 5. API Contracts

The app uses tRPC procedures for authenticated domain calls. Planned contracts include `bridge.getStatus`, `files.createUpload`, `files.list`, `files.getDownloadUrl`, `connections.startGoogleOAuth`, `connections.getStatus`, `activity.list`, and `processes.list`/`processes.terminate`. Browser code must not call arbitrary shell commands, Google secrets, or S3 credentials directly.

## 6. Linux Companion Design

The companion binds to `127.0.0.1`, requires a 32-character bearer token, checks an explicit command allowlist, verifies current-user ownership, rejects protected/system processes, sends SIGTERM, and appends an audit JSONL record with restrictive permissions. The service is installed as a `systemd --user` unit. E2E validation must be done on a real Linux laptop because the current development session has no bound Linux folder.

## 7. Google Workspace Design

Google OAuth runs on the server. The app requests the narrowest scopes needed, stores refresh tokens encrypted, checks returned granted scopes, and disables provider features when scopes are missing. Gmail and Calendar are separate capabilities; consent for one does not imply the other. Agent connectors available in the Manus session are not treated as runtime API access for the deployed website.

## 8. Frontend Structure

Routes should be split into `OverviewPage`, `ProcessesPage`, `FilesPage`, `ConnectionsPage`, `WorkspacePage`, `ActivityPage`, and `SettingsPage`, all inside a shared desktop shell. Feature hooks consume typed tRPC procedures and bridge adapter functions. Components must never embed fabricated data to fill empty states.

## 9. Failure Handling

Each adapter returns typed state rather than throwing presentation-specific errors. The UI maps failures to actionable states: install bridge, re-authorize provider, retry request, check ownership, or contact administrator. Last-known data may be displayed only when it is explicitly timestamped as stale.

## 10. Deployment and Operations

The web app is deployed through the managed web project. Linux companion is distributed as source plus installer because Manus Desktop does not currently provide a Linux installer. Production secrets are configured through environment management. Schema changes are generated and applied through the project migration workflow.
