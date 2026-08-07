# LeaveFlow on Kubernetes

This directory contains a small, local Kubernetes deployment for the same
services used by `docker compose`:

- PostgreSQL and Redis run as single-replica StatefulSets with local PVCs.
- Django, the Node.js notification service and the Vue frontend run as
  Deployments.
- Services use ClusterIP networking inside the cluster.
- HTTP health probes are configured for the backend and notification service;
  the backend's `/health/` endpoint verifies database connectivity.
- The backend runs migrations and seeds the demo data in init containers before
  Gunicorn starts.
- Application containers run as non-root users with dropped Linux capabilities
  and service-account token mounting disabled.
- Optional overlays add an Ingress for browser-friendly routing, autoscaling,
  disruption budgets and dependency-level NetworkPolicies.

The manifests are intended for a disposable development cluster, not for a
production deployment. The checked-in Secret contains demo-only credentials.
Replace it and review the security settings before using this configuration
outside a local cluster.

## Prerequisites

- Docker Desktop
- `kubectl`
- Minikube (the examples below use Minikube's default StorageClass)

## Build and load the images

From the repository root:

```powershell
docker build -t leaveflow-backend:dev -f backend/Dockerfile .
docker build -t leaveflow-notifications:dev -f notifications/Dockerfile .
docker build -t leaveflow-frontend:dev -f frontend/Dockerfile .

minikube start
minikube image load leaveflow-backend:dev
minikube image load leaveflow-notifications:dev
minikube image load leaveflow-frontend:dev
```

## Deploy

```powershell
kubectl apply -k deploy/k8s
kubectl -n leaveflow get pods,services,persistentvolumeclaims
kubectl -n leaveflow rollout status statefulset/postgres
kubectl -n leaveflow rollout status statefulset/redis
kubectl -n leaveflow rollout status deployment/backend
kubectl -n leaveflow rollout status deployment/notifications
kubectl -n leaveflow rollout status deployment/frontend
```

The backend image runs migrations and seeds the demo data on startup, matching
the existing Docker Compose workflow.

## Open the local services

The frontend reads browser-facing URLs, so keep the three port-forwards open
in separate terminals:

```powershell
kubectl -n leaveflow port-forward service/frontend 5173:5173
kubectl -n leaveflow port-forward service/backend 8000:8000
kubectl -n leaveflow port-forward service/notifications 3000:3000
```

Then open <http://localhost:5173>. The demo accounts are documented in the
root README.

Useful checks:

```powershell
kubectl -n leaveflow get pods
kubectl -n leaveflow logs deployment/backend
kubectl -n leaveflow logs deployment/notifications
curl http://localhost:8000/health/
curl http://localhost:3000/health
```

## Optional hardening and autoscaling overlay

The base deployment includes HPA objects and PodDisruptionBudgets. HPA needs a
metrics server, for example:

```powershell
minikube addons enable metrics-server
kubectl apply -k deploy/k8s
kubectl -n leaveflow get hpa,pdb
```

For dependency-level network isolation, apply the secure overlay instead of the
base resources:

```powershell
kubectl apply -k deploy/k8s/overlays/secure
kubectl -n leaveflow describe networkpolicy postgres-ingress
kubectl -n leaveflow describe networkpolicy redis-ingress
```

It only permits PostgreSQL traffic from the backend and Redis traffic from the
backend or notification service, while leaving the browser-facing Services
reachable for local port-forwarding.

To enable both the Ingress and the dependency NetworkPolicies in one command,
use the composed overlay:

```powershell
kubectl apply -k deploy/k8s/overlays/full
```

## Optional Ingress overlay

The Ingress overlay exposes the whole demo through one hostname and keeps the
API and Server-Sent Events paths working behind the same origin:

```powershell
minikube addons enable ingress
kubectl apply -k deploy/k8s/overlays/ingress
minikube ip
```

Add `leaveflow.local` and the displayed Minikube IP to the Windows hosts file,
then open <http://leaveflow.local>. The overlay changes the frontend to use
`/api`, `/notifications` and `/events` relative paths, avoiding hard-coded
localhost ports.

## Remove the local deployment

This removes the namespace and its local PVCs, so the demo data is deleted:

```powershell
kubectl delete namespace leaveflow
```
