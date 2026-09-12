# Deployment agent instructions

- Match the existing Django, Vue, notification worker/gateway, PostgreSQL, and Redis topology. Coordinate service names, ports, probes, credentials, and event dependencies with their consumers.
- Preserve persistent data, migration ordering, and rollback/recovery behavior. Do not delete volumes, PVCs, streams, or databases to make an upgrade appear successful.
- Keep secrets outside committed manifests and retain intended service exposure and network policy. Demo credentials are not deployment credentials.
- Validate manifests and the affected local-demo workflow without applying them to an unverified cluster or account. Check the actual context and namespace before any separately authorized apply.

Use [k8s/README.md](k8s/README.md) for the Minikube workflow and the [root README](../README.md) for Compose/service contracts. Record what was rendered, built, or actually deployed and to which isolated environment. A parsed manifest or passing application test does not prove rollout health, storage recovery, or safe production readiness.
