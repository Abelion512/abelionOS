# Engineering Workflow Adoption

Mintdesk adopts the applicable principles from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills): define the change, create atomic tasks, implement one slice at a time, prove it with tests, review the rendered result, then publish a recoverable checkpoint.

For the Dashboard and Shell rework, this means the visible UI reports only observed source state, uses no placeholder integrations, avoids duplicate status presentation, and is verified through component regression tests, a production build, and desktop/mobile screenshots. The first mobile screenshot revealed an uncollapsed two-column status grid; that finding was fixed before completion. A sidebar collapse control is intentionally deferred until the backend, server, authentication, and authorization status work is explicitly approved; it must not appear as an inert visual affordance.
