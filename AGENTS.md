# LeaveFlow agent instructions

## Cross-service contracts

- Preserve employee/manager/administrator roles, team-scoped authorization, and server-side date, overlap, and balance validation. UI visibility is not an authorization boundary.
- Django is the identity and domain authority. The notification gateway validates tokens against Django rather than introducing a second identity system.
- Publish domain events only after the database commit succeeds. Preserve Redis consumer-group recovery, deduplication, persisted feeds, and authenticated SSE delivery across worker/gateway changes.
- Keep leave state, API/event schemas, migrations, and notification recipients consistent across Django, Vue, the Elixir worker, and the TypeScript gateway.
- Protect employee records and credentials in logs, fixtures, screenshots, and reports. Use fictional demo data and preserve secret redaction.
- Retain English/Italian localization, plural/date semantics, and reduced-motion behavior for affected UI flows.

## Guidance and verification

Use [README.md](README.md) for service ownership, development, and the relevant checks. Preserve committed dependency locks. Validate the changed service while iterating; cross-service behavior needs producer/consumer and failure-path coverage, not just a frontend build. Check both language documentation when a supported workflow changes.

Treat demo credentials and seed data as local-demo material. Tests and migrations use disposable databases; do not run seeding, volume deletion, or deployment against a live environment as routine verification.

Completion requires the requested behavior, affected permissions/events/migrations, and documentation checked with actual results recorded. Deployment-specific constraints are in `deploy/`; do not present a demo or a green unit suite as a production rollout.
