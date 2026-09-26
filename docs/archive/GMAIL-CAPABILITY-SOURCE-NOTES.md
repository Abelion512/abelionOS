# Gmail Content-Aware Capability Notes

Google documents `gmail.metadata` as headers and labels only, whereas `gmail.modify` permits reading mail and changing labels without bypassing Trash. The `users.messages.get` endpoint permits `format=full` when access is granted through `gmail.modify`; `format=full` returns body content in the message payload and cannot be used with metadata-only access. [1] [2] [3]

For Mintdesk, this supports an on-open, content-aware Daily Focus flow without adding `gmail.compose` or `gmail.send`. Message bodies must be fetched only for the bounded set shown to the user, summarized only on explicit request through local reasoning, and never persisted in the application database, action audit details, or Daily Focus history. Gmail cleanup continues to use the existing Trash endpoint with user preview and confirmation; it never permanently deletes messages.

## References

[1]: https://developers.google.com/workspace/gmail/api/auth/scopes "Choose Gmail API scopes"
[2]: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get "Gmail users.messages.get"
[3]: https://developers.google.com/workspace/gmail/api/reference/rest/v1/Format "Gmail message format"
