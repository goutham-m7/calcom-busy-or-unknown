# Synthetic Graph corpus

50 named cases: ten scenario families × five event positions. Every query covers 09:00–13:00 UTC on 2026-11-16, two selected calendars and eight half-hour candidate slots. No customer records or real event titles.

Families: clean-empty, clean-busy, inner-403, inner-503, missing, retry-recovered, retry-exhausted, mixed-retry-error, page-success, page-failed. These are deterministic position variants, not 50 statistically independent failures. Each case stores the full finite ordered response trace and separately authored truth (including events hidden by failure). A successful read with zero events means free; incomplete selected-calendar coverage makes every slot unknown. All selected calendars belong to one synthetic host; clean cases demonstrate independent healthy hosts.

The gzip header follows the upstream tests: the Response body is already decoded text. It does not test wire decompression. Retry-After is zero to keep offline execution immediate. HTTP throttling timing and account behavior are not simulated.
