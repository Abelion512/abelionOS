# Provider Verification Notes

## 2026-08-18: Production capability check

The deployed Daily Focus page successfully read current Calendar data, returned a bounded on-open preview for unread Gmail, and listed read-inbox candidates for reviewed cleanup. No email body was copied into this document.

The controlled `calendar.create` verification request was recorded as action `120001` and finished with status `error` and code `reasoner_unavailable`. It has no provider resource ID, confirmation timestamp, or execution timestamp. Therefore, no Calendar event was created and no Calendar deletion has been attempted.

The production audit trail confirms the failure transition as `daily_focus.proposal.requested` followed by `daily_focus.proposal.error`. The action error was visible to the user as local reasoning unavailable, with no raw provider response exposed.

The next safe verification path is the existing reviewed Gmail Trash flow using one non-critical, read newsletter candidate. It remains a move to Gmail Trash, not permanent deletion, and is logged by the application action audit.

The Gmail Trash verification succeeded. Action `120002` reached `executed` after an explicit review and confirmation, with a provider resource identifier, confirmation timestamp, and execution timestamp. Exactly one read newsletter candidate was moved to Gmail Trash. The message was not permanently deleted and its content is not recorded here.

Calendar create/delete is not yet provider-verified because the event proposal depends on local 9router output and the companion returned `reasoner_unavailable`. The Google Calendar provider itself was never called for this test. This is a dependency failure in the proposal path, not an OAuth or Calendar-write failure.

After the deterministic fallback deployment, the same explicitly structured event draft produced a `ready` Calendar proposal in production without calling local reasoning. The preview renders the intended ten-minute time window in Asia/Jakarta and remains subject to the existing explicit confirmation step.

The Calendar create preview is action `120003`. It is explicitly titled as a verification event and has no attendees. At this point it has not been confirmed or sent to Google.

Action `120003` then reached `executed` with a provider event identifier, confirmation timestamp, and execution timestamp. Google Calendar therefore accepted the controlled create request. The app now exposes the event's cleanup through its action history rather than relying on the next-24-hour briefing list.

The deployed action history now renders `Review deletion` for action `120003`, confirming that the cleanup path has the exact provider resource ID and schema-valid event details needed to prepare the owned-event deletion review.

The verification delete action `120004` reached `executed` against the exact provider event identifier created by action `120003`. The Calendar create/delete path is therefore provider-verified end to end: deterministic proposal, reviewed confirmation, Google event creation, ownership-guarded deletion review, reviewed confirmation, and Google deletion. No test event remains.
