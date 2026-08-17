# Daily Focus Action Contract

## Boundary

Action capability hanya tersedia dari layar Daily Focus. Tidak ada route agent umum, scheduler, atau webhook yang dapat membuat perubahan Google. Setiap request menghasilkan proposal terstruktur; hanya proposal berstatus `ready` yang dapat dikonfirmasi secara eksplisit oleh pemilik akun.

## Action lifecycle

| Status | Pemicu | Perubahan provider |
| --- | --- | --- |
| `draft` | Teks bebas atau evidence dipilih | Tidak ada |
| `ready` | Parser Bun/9router atau deterministic builder menyelesaikan schema | Tidak ada |
| `processing` | Companion sudah mengklaim satu job dan sedang menyusun proposal | Tidak ada |
| `confirmed` | Pemilik akun menekan confirm pada preview | Tidak ada, record confirmation dibuat |
| `executed` | Backend menjalankan request Google dengan token user-scoped | Satu aksi provider sesuai proposal |
| `rejected`, `error`, `expired` | Pengguna membatalkan, provider gagal, atau TTL lewat | Tidak ada atau kegagalan diaudit |

## Action kinds

| Kind | Proposal minimum | Scope | Guardrail |
| --- | --- | --- | --- |
| `task.create` | title, notes, due, taskListId | `tasks` | Maksimal satu task per proposal pada MVP |
| `calendar.create` | calendarId, title, start, end, timezone, attendees, reminders | `calendar.events.owned` | Start/end valid, timezone eksplisit, preview seluruh peserta |
| `calendar.delete` | calendarId, eventId, title, start, organizerSelf | `calendar.events.owned` | Hanya `organizer.self=true`; tampilkan event sebelum confirm |
| `gmail.trash` | messageIds, subject/from/date metadata | `gmail.modify` | Maksimal 25 message per confirmation; memindahkan ke Trash, tidak permanent delete |

Task dan event baru boleh diparse dari teks bebas oleh companion Bun. Calendar delete dan Gmail Trash tidak memakai ID atau subjek dari model: keduanya hanya dapat dibuat dari metadata evidence yang dipilih pengguna di Daily Focus.

## Device contract

Device Bun terdaftar memiliki `deviceId`, `userId`, `name`, `type`, `capabilities`, device secret yang disimpan hash, dan heartbeat. Backend menyimpan job proposal dengan TTL. Device hanya mengambil job miliknya, mengirim payload allowlisted ke 9router, dan mengembalikan proposal JSON tervalidasi. Device tidak menerima token Google dan tidak menjalankan Google mutation.

## Audit

Audit menyimpan action kind, proposal ID, device ID opsional, outcome, dan provider resource ID. Audit tidak menyimpan refresh token, body Gmail, atau teks mentah 9router.
