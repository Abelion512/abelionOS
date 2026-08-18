# Dashboard UI Research

## Sources reviewed

| Source | Finding adopted in Mintdesk |
|---|---|
| [Apple HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | Layout must remain recognizably consistent through resizing, orientation, and text-size changes. The dashboard needs explicit breakpoints, readable constraints, and no clipped cards. |
| [shadcn/ui: Sidebar](https://ui.shadcn.com/docs/components/base/sidebar) | Desktop collapse should retain icon navigation, while mobile remains an off-canvas drawer. Open/collapsed state should be controlled and persistent. |
| [Vercel Observability](https://vercel.com/docs/observability) | A real operational product separates concise monitoring surfaces from deeper investigation views. Mintdesk follows this by keeping only current system facts on Dashboard and leaving evidence/action detail in Daily Focus and Activity. |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | Work proceeds as an explicit slice: research, small task, implementation, test, visual review, checkpoint. |

## Design decisions for this rework

The dashboard will show one dominant operational surface rather than explanatory cards. Source labels and long provenance copy are removed where the user already knows the system topology. Status vocabulary is limited to the observed fact, for example `Online`, `Unavailable`, or an actual metric. The time label uses the source reading timestamp only. The dashboard refreshes on opening and when the page returns to visibility; no fixed 15-second polling occurs in this iteration.

The desktop rail will collapse into icon navigation through a visible, symmetric control in the brand row. The choice is persisted locally. On narrow screens, that desktop preference does not collapse content into icons; navigation remains the existing accessible drawer. Dashboard grids use one column on small screens, a measured two-column layout on medium screens, and do not rely on fixed-width cards. The repeatable visual gate is the managed screenshot capture at 1280px desktop and 375px mobile, run before every checkpoint. It is intentionally paired with component tests rather than brittle pixel snapshots because the dashboard represents live source states whose timestamps and availability legitimately vary. Desktop and 375px mobile screenshots were reviewed after the rework; the original horizontal overflow was not present in the corrected mobile layout.
