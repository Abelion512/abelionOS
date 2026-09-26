# Mintdesk UI Rebaseline Audit

## Decision

Mintdesk will retain the **Mint Atelier** visual language from Dashboard V1 while preserving the current full-stack architecture, companion boundary, Google OAuth integration, Daily Focus actions, Storage observer, Activity audit, and notification center. This is a compositional rebaseline, not a product rollback.

> The target is an editorial operational workspace: a calm primary surface with natural context, followed by only the evidence and actions needed for the current decision.

## Evidence from Dashboard V1

| V1 characteristic | Why it felt more human | Rule to preserve |
|---|---|---|
| One large system hero with a botanical/natural visual field | The runtime status had an atmosphere and a clear focal point rather than looking like a generic admin card. | Dashboard retains one visual hero. Runtime data is placed on that surface, not split into identical cards. |
| Asymmetric composition | The system summary was primary and secondary context was visibly secondary. | Each page has one primary surface and at most one secondary supporting region above the fold. |
| Editorial typography and breathing room | Heading, supporting sentence, metrics, and controls had distinct roles. | Use a single page question and a short factual answer; avoid stacked labels, duplicate badges, and explanatory filler. |
| Purposeful card variety | Quick launch, activity, and calendar were visibly different because they represented different tasks. | A card must represent an action, an evidence group, or a decision. Do not use cards as generic containers. |

## Current-State Findings

| Page | Current strength | Drift to correct |
|---|---|---|
| Dashboard | Real Linux, Google, and process states are present. | Two equal utility panels flatten hierarchy and remove the V1 focal surface. |
| Daily Focus | Evidence-first loading state and action capability are retained. | The page begins as a sparse technical status panel rather than a calm daily workspace. |
| Storage | Workdir state is honest and compact. | The unavailable state is visually an isolated system card without a supporting place context. |
| Activity | Audit data is real and detail is on-demand. | Two equal panels and dense record cards resemble a SaaS administration screen. |

## Design Constitution

1. **Dashboard V1 is the visual baseline.** Preserve its warm parchment field, quiet botanical texture, asymmetric hero, and editorial rhythm.
2. **One page, one question.** Dashboard answers “is my workspace ready?”; Daily Focus answers “what deserves attention now?”; Storage answers “what exists in the workdir?”; Activity answers “what changed?”
3. **No card wallpaper.** A visible card must contain an independently actionable control, a bounded evidence set, or a primary decision. Repeated rectangular wrappers are removed.
4. **No AI-slop copy.** Copy must state a real source, state, uncertainty, or next human decision. Decorative claims and generic assistant language are prohibited.
5. **Details are available, not dominant.** Long evidence stays behind an intentional dialog or detail control. Dialogs are not used to conceal essential page context.
6. **Unavailable is still a designed state.** It identifies the unavailable source, the scope affected, and the safe next step without inventing values.
7. **No backend regression for visual work.** The UI rebaseline does not widen OAuth scopes, send provider writes, change companion allowlists, add fake data, or expose credentials.

## Acceptance Criteria

| Criterion | Verification |
|---|---|
| Dashboard has a single, natural primary visual surface and real runtime data remains visible. | Component test plus 1280px and 375px screenshots. |
| Daily Focus, Storage, and Activity have a distinct page question and a non-template composition. | Screenshot comparison and existing source-state tests. |
| Real/unavailable states remain explicit; no illustrative data is introduced. | Existing regression suite and source inspection. |
| Sidebar, popovers, and dialogs remain keyboard-accessible and responsive. | Existing shell/dialog tests plus mobile screenshots. |

## Implementation Notes

The current Dashboard already exposes real Linux metrics, Google Workspace scope state, and controlled process state. The rebaseline should therefore change layout and surface treatment only. The current `WorkspaceShell` remains the single owner of navigation, responsive drawer behavior, profile menu, and notification trigger; its information architecture will not be expanded during this visual pass.

Daily Focus already has a useful information hierarchy in data terms: briefing window, explicit local reasoning request, human-confirmed actions, Calendar/Gmail evidence, audit evidence, and companion evidence. The visual revision should group those as a daily desk rather than presenting every source as an equal panel. Activity should retain its separate application and Linux audit provenance, but reduce equal-width administrative panels and dense nested record borders.

Storage retains a strict allowlisted-workdir contract and paginated metadata dialog. Its compact unavailable state is correct semantically but needs the same place-oriented hierarchy as the rest of the workspace. The Dashboard regression protects the important runtime facts: an explicit unavailable state before a health request resolves, real hostname and Google headings when sources connect, and visibility-triggered refresh without a redundant visible refresh control. Process termination semantics remain in `ProcessPanel` and are unaffected by this visual work.

## Desktop Verification

The 1280px rebaseline confirms that Dashboard now restores the V1 focal surface using the existing Mint Atelier botanical asset while showing real companion measurements and Google Workspace state. Daily Focus, Storage, and Activity now begin with a page question and source-aware context rather than anonymous utility cards. Unavailable states remain explicit: no process, workdir, audit, or provider values were invented during the visual pass.

## Mobile Adjustment

The 375px verification showed that Daily Focus still rendered too much persistent detail: the full action composer, action history, and every bounded Gmail preview competed with the daily decision. The next adjustment keeps the action desk available through an intentional dialog and limits persistent source previews to a small factual sample. Full evidence remains available on demand; no source is discarded or summarized by an AI.

## Runtime Verification Note

The reported `notificationPreferences` import error was recorded before the schema export was present in the server module graph. The current schema exports `notificationPreferences`, and a clean dev-server restart completed its server startup without a new schema-import failure. Fresh visual verification must use this restarted process rather than historical HMR console records.

## Shell Verification

The restarted server rendered the Workspace Shell without a new schema import error. Desktop verification shows a quieter, pale-mint navigation surface with a restrained active route, one profile surface, and notification access. Mobile verification retains the full-screen drawer model and keeps the Dashboard hero unobstructed until the user explicitly opens navigation. The shell keeps its existing accessible routes and collapse behavior; the rebaseline only changes surface hierarchy and hover restraint.

## Clean-Session Verification

After the dev-server restart, Dashboard, Daily Focus, Storage, and Activity were captured at 1280px and 375px. The pages retained their source-aware unavailable/loading states and the compact Daily Focus action launcher. The browser console recorded normal Vite connection and React DevTools information only; no new `notificationPreferences` or schema `SyntaxError` appeared after restart.
