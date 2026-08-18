# Operational Pages Audit

## Baseline findings

The pre-change Activity page used a narrow single-card stack despite containing two independent audit sources. Storage used a large explanatory hero for a single unavailable state. Daily Focus repeated navigation and orientation copy above the evidence and action surfaces. The first desktop review also showed that the sidebar collapse changed width but did not visually transition its labels and profile content in concert.

## Changes applied

Activity now uses two source-specific panels, with the application audit receiving the wider track and local companion audit retaining a separate source status. Storage and Daily Focus use one compact operational header and retain only their live control. Dashboard links were removed because persistent workspace navigation already supplies that route. The sidebar now animates rail width, canvas displacement, label clipping, and profile collapse on the same eased timing.

## Verification gate

Desktop and 375px mobile views of `/activity`, `/storage`, and `/briefing` must be captured before the checkpoint. The collapse button is also exercised in the authenticated production session; its state remains a local preference and mobile continues to use an off-canvas drawer.
