# Phase 1 Baseline: Honest Overview

## Frozen Scope

Fase pertama hanya mencakup tiga hal: **app shell**, **Overview**, dan **Linux connection state**. Tidak ada Files page, Workspace page, Gmail, Calendar, weather provider, settings persistence, arbitrary terminal action, atau cloud synchronization pada fase ini. Item-item tersebut tetap berada di roadmap target, tetapi tidak boleh ditampilkan sebagai fitur selesai.

## Active Surface

| Surface | Status | Source of truth | Minimum data |
|---|---|---|---|
| App shell | Implemented | React route `/` and CSS layout | Navigation shell, responsive drawer |
| System Overview | Implemented/unavailable-safe | Local Linux companion `GET /metrics` | `checkedAt`, `platform`, `uptimeSeconds`, `cpuPercent`, `memory.usedPercent`, `loadAverage` |
| Process control | Visible operational slice | Local Linux companion `GET /processes` | `pid`, `command`, `cpuPercent`, `memoryPercent`, `user`, `canTerminate` |
| Weather | Not configured | No provider | Must remain unavailable; no temperature or location value |
| Google Workspace | Not connected | App OAuth not yet available | Must remain unavailable; no event or email value |
| Footer status | Implemented | Current bridge request state | `connected` or `unavailable`, plus local check time |
| User identity | Implemented when authenticated | Manus auth session | `name` or `email`; anonymous state otherwise |

## Rules

The Overview may render only the fields listed in the matrix. Any new widget requires a source-of-truth entry and a test before being added. A button must either perform a real implemented action, navigate to an existing route, or be a non-interactive status element. Planned features are represented in documentation, not as clickable fake actions.

## Acceptance Criteria

Phase 1 is accepted when `/` builds and renders without fabricated values, bridge failure is visibly unavailable, metrics are sourced from a local request, process data is sourced from the bridge, user identity comes from auth state, and no navigation control claims to open an unimplemented feature.
