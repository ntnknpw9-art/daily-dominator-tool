# Authentication sweep
- [x] Inspect main login, native Apple/Google, web OAuth, admin login, agent consent, signup, recovery, session hydration, rescue function and MCP verification.
- [x] Normalize service-outage handling across interactive authentication flows and test it (3 passing tests).
- [x] Verify simulated 504 responses in main login, admin login and agent consent; each reports an outage and releases its submit button.
- [ ] Verify real Apple/Google login and outage recovery — requires an interactive provider session/native iOS device and recovery of the external key-fetch service.
# Database pressure (Nov 2026)
- [x] Diagnose: 5-second email-queue background job filled its run history (~3.4 GB) and drained the Tiny disk I/O budget.
- [ ] Clear background-job history and schedule a daily purge — blocked: database unreachable.
- [ ] Optional compute upgrade Tiny → Mini — waits on user approval card.
- [ ] Restrict leaderboard tables (user_stats, user_seasons, profiles) to safe columns — waits on user decision + database availability.
