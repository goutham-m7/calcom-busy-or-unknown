# Implementation and test plan

Default REGULAR implementation mode: repository starts empty, with no project configuration.

Sequence: record design; pin public source and notices; establish Vitest/TypeScript; prove source extraction; implement finite replay transport; define 50 synthetic traces; test-first strict coverage reader; independent interval oracle; corpus metrics; CLI/timeline; CI and captured evidence; fresh-clone verification.

Tests operate at three boundaries: exact adapter availability members with a fake Graph transport (integration); coverage reader with that same external transport (integration); interval feasibility and HTML escaping (unit). Graph, time and randomness are the only doubles. No internal business logic mocks. Cases include valid empty/busy/free events, unordered/missing/duplicate IDs, 403/429/503, retry recovery/exhaustion, mixed failures, successful/failed pagination and malformed bodies. Application OAuth, calendar discovery, real Microsoft gzip decompression, CalendarManager, hosted Cal.com and booking persistence are deliberately not tested because this is an offline adapter-boundary regression pack.
