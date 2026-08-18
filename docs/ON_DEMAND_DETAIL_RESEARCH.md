# On-Demand Detail Research

## Sources reviewed

| Source | Decision for Mintdesk |
|---|---|
| [Apple HIG: Modality](https://developer.apple.com/design/human-interface-guidelines/modality) | A modal needs a clear, narrowly scoped task and an obvious dismissal path. Mintdesk will use it only for inspecting one audit record or one evidence record, never as a nested application. |
| [Page Flows](https://pageflows.com/) | Real product flows distinguish dashboard summaries from specific interaction surfaces such as cards, bottom sheets, and detail views. Mintdesk will present compact card summaries first and expose the complete source record on request. |
| [shadcn/ui Dialog and Sheet](https://ui.shadcn.com/docs/components/dialog) | The existing accessible component primitives will provide focus trapping, Escape dismiss, and keyboard-safe triggers. A dialog will be used on desktop and a sheet on narrow screens. |

## Interaction contract

Activity shows the latest recorded actions as a capped card collection, with source counts and `View details` as an explicit disclosure. Daily Focus keeps a short evidence preview on the page. Selecting a record opens exactly one modal surface. The detail surface names the item, displays the source facts already available to the page, and has a close action. It does not fetch new data, create a write action, or conceal unavailable state.

## Verification

The Activity regression opens a detail dialog, closes it with Escape, and verifies that focus returns to the originating trigger. A second regression sets the viewport to 375px, opens the same responsive dialog, verifies its constrained detail class, and closes it with Escape. The responsive dialog is retained instead of a bottom sheet because it uses a viewport-constrained width and height at 375px while preserving the same keyboard and screen-reader semantics as desktop.
