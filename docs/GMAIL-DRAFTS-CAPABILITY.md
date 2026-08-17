# Gmail Drafts Backend Capability Notes

## Verified API Surface

Google Gmail API exposes `users.drafts.list`, `get`, `create`, `update`, `delete`, and `send`. Draft creation applies the `DRAFT` label; update replaces a draft's content; delete permanently deletes a draft; send sends an existing draft to recipients defined in its `To`, `Cc`, and `Bcc` headers. The authenticated user can be addressed with `userId=me`. [1]

## OAuth Decision

The narrowest scope available for draft create, update, delete, and send is `https://www.googleapis.com/auth/gmail.compose`. Google classifies it as a **restricted** scope. It enables draft management and sending, while the existing `gmail.metadata` scope remains sufficient for header-only inbox summaries. Restricted scopes can trigger OAuth verification and, when restricted data is stored or transmitted by a public application, may require an additional security assessment. [2]

Mintdesk must therefore keep refresh tokens encrypted server-side, never persist email bodies by default, request re-consent explicitly when adding `gmail.compose`, and write audit events for all draft mutations. Draft **send** is an external action and requires a separate user confirmation in the UI.

## Intended Server Contract

| Procedure | Effect | Confirmation |
|---|---|---|
| `gmailDrafts.list` | Lists draft metadata for the connected user | No |
| `gmailDrafts.get` | Retrieves selected draft headers/body for editing | No |
| `gmailDrafts.create` | Creates a server-side Gmail draft | Yes in UI |
| `gmailDrafts.update` | Replaces a draft's content | Yes in UI |
| `gmailDrafts.delete` | Permanently deletes a Gmail draft | Yes in UI |
| `gmailDrafts.send` | Sends an existing draft | Yes, separate final confirmation |

## Sources

[1] [Gmail Drafts REST resource](https://developers.google.com/workspace/gmail/api/reference/rest?apix=true#rest-resource:-v1.users.drafts.)

[2] [Choose Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)
