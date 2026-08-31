# Kubernetes Deployment Guide
 
Full deployment of beta-code on 3 servers with auto-scaling runners and HA proxy.
 
## What you end up with
 
```
http://SERVER1_IP  →  NGINX Ingress  →  frontend pods (2–6, auto-scaled by CPU)
                                      →  runner pods   (0–20, scales on queue depth)
                                      →  postgres      (1 pod, persistent storage)
                                      →  redis         (1 pod, queue + sessions)
```
 
If any one of the 3 servers goes offline, Kubernetes reschedules everything onto the remaining two automatically.
 
Runner pods scale up the moment people start submitting code — 1 extra pod per 2 queued jobs, up to 20 pods — so there's no long wait during competitions.
 
---
 
## Before you start
 
- 3 servers running Ubuntu 22.04 or Debian 12
- SSH access to all 3
- Ports open between servers: `6443`, `8472/UDP`, `51820/UDP`, `2049`
- Your project code on Server 1
 
Replace `SERVER1_IP`, `SERVER2_IP`, `SERVER3_IP` with your actual IPs throughout.
 
---
 
## Phase 1 — Install Docker on all 3 servers
 
Run on **Server 1, 2, and 3**:
 
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```
 
---
 
## Phase 2 — Build the k3s cluster
 
**Server 1** — bootstrap:
 
```bash
curl -sfL https://get.k3s.io | K3S_TOKEN=pick-a-secret-token sh -s - server \
  --cluster-init \
  --disable traefik
```
 
Wait ~30 seconds, then check it's running:
 
```bash
sudo kubectl get nodes
```
 
**Server 2** — join:
 
```bash
curl -sfL https://get.k3s.io | K3S_TOKEN=pick-a-secret-token sh -s - server \
  --server https://SERVER1_IP:6443 \
  --disable traefik
```
 
**Server 3** — join:
 
```bash
curl -sfL https://get.k3s.io | K3S_TOKEN=pick-a-secret-token sh -s - server \
  --server https://SERVER1_IP:6443 \
  --disable traefik
```
 
**Server 1** — verify all 3 nodes are ready:
 
```bash
sudo kubectl get nodes
# NAME       STATUS   ROLES                  AGE
# server-1   Ready    control-plane,master   2m
# server-2   Ready    control-plane,master   1m
# server-3   Ready    control-plane,master   1m
```
 
Set up kubectl without sudo (Server 1):
 
```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER ~/.kube/config
```
 
---
 
## Phase 3 — Set up shared storage (NFS)
 
The frontend stores problems/tasks/tests as files on disk. With multiple frontend pods across 3 servers, they all need to read the same files — NFS handles that.
 
**Server 1** — create the NFS share:
 
```bash
sudo apt install -y nfs-kernel-server
sudo mkdir -p /srv/beta-code-data
echo "/srv/beta-code-data *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
sudo systemctl enable --now nfs-server
```
 
**Server 2 and 3** — install NFS client:
 
```bash
sudo apt install -y nfs-common
```
 
**Server 1** — install Helm, then the NFS provisioner:
 
```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
 
helm repo add nfs-subdir-external-provisioner \
  https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/
helm repo update
 
helm install nfs-subdir-external-provisioner \
  nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  --set nfs.server=SERVER1_IP \
  --set nfs.path=/srv/beta-code-data \
  --set storageClass.name=nfs-client
```
 
---
 
## Phase 4 — Set up local image registry
 
**Server 1:**
 
```bash
docker run -d -p 5000:5000 --restart always --name registry registry:2
```
 
Tell k3s to trust it. Run on **Server 1, 2, and 3**:
 
```bash
sudo mkdir -p /etc/rancher/k3s
sudo tee /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "SERVER1_IP:5000":
    endpoint:
      - "http://SERVER1_IP:5000"
EOF
```
 
Restart k3s to pick up the config:
 
```bash
# Server 1
sudo systemctl restart k3s
 
# Server 2 and 3
sudo systemctl restart k3s-agent
```
 
---
 
## Phase 5 — Build and push images
 
Run on **Server 1** from your project root:
 
```bash
docker build -t SERVER1_IP:5000/beta-code-frontend:latest ./frontend
docker build -t SERVER1_IP:5000/beta-code-runner:latest ./runner
docker build -t SERVER1_IP:5000/cpp-sandbox:latest ./sandbox
 
docker push SERVER1_IP:5000/beta-code-frontend:latest
docker push SERVER1_IP:5000/beta-code-runner:latest
```
 
The sandbox image is run directly by Docker (not k3s), so pull and tag it on **every server**:
 
```bash
# Run on Server 1, 2, and 3
docker pull SERVER1_IP:5000/cpp-sandbox:latest
docker tag SERVER1_IP:5000/cpp-sandbox:latest cpp-sandbox:latest
```
 
---
 
## Phase 6 — Update manifests with your IP
 
From your project root on **Server 1**:
 
```bash
grep -rl "SERVER1_IP" k8s/ | xargs sed -i 's/SERVER1_IP/YOUR_ACTUAL_IP/g'
```
 
Example (if your Server 1 IP is `192.168.1.10`):
 
```bash
grep -rl "SERVER1_IP" k8s/ | xargs sed -i 's/SERVER1_IP/192.168.1.10/g'
```
 
---

## Phase 6.5 — Set real secrets

`k8s/secrets.yaml` ships with placeholder/example values that must not be used as-is in a real deployment:

- `RUNNER_SECRET` — the bearer token the runner uses to authenticate against the frontend's internal `/api/tasks/tests` endpoint (which returns hidden tests' expected output). If this is ever blank, the frontend now refuses that endpoint entirely rather than serving it unauthenticated — so deployment fails safe, but you still need a real value for the runner to work. Generate one per environment:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- `POSTGRES_PASSWORD` — still set to the same default as local dev (`postgres`). Change this before exposing the cluster anywhere untrusted. Note that Postgres only picks up `POSTGRES_PASSWORD` on first `initdb`; if you change it after the `postgres-pvc` volume already has data, you'll also need to update the password inside Postgres itself (or wipe the PVC) or the frontend/runner pods won't be able to authenticate.

Edit `k8s/secrets.yaml` with your real values before running Phase 8.

---
 
## Phase 7 — Install NGINX Ingress and KEDA
 
```bash
# NGINX Ingress Controller (the proxy)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml
 
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=180s
 
# KEDA (runner autoscaling)
kubectl apply --server-side -f https://github.com/kedacore/keda/releases/download/v2.15.0/keda-2.15.0.yaml
 
kubectl wait --namespace keda \
  --for=condition=ready pod \
  --selector=app=keda-operator \
  --timeout=180s
```
 
---
 
## Phase 8 — Deploy the app
 
```bash
kubectl apply -k k8s/
kubectl apply -f k8s/keda-scaledobject.yaml
```
 
Watch pods come up:
 
```bash
kubectl get pods -n beta-code -w
```
 
All pods should reach `Running` within ~2 minutes.
 
---
 
## Phase 9 — Verify
 
```bash
# All pods running?
kubectl get pods -n beta-code
 
# Ingress has an IP?
kubectl get ingress -n beta-code
 
# Site reachable?
curl http://SERVER1_IP
 
# Watch runners scale up when someone submits (open in a separate terminal)
kubectl get pods -n beta-code -l app=runner -w
```
 
---
 
## Autoscaling behaviour
 
| Queue depth | Runner pods |
|---|---|
| 0 jobs | 0 pods (scales to zero) |
| 1–2 jobs | 1 pod |
| 3–4 jobs | 2 pods |
| 10 jobs | 5 pods |
| 20+ jobs | up to 20 pods |
 
KEDA checks the queue every 3 seconds and scales up immediately with no delay. Pods scale back down 90 seconds after the queue empties.
 
To increase the max runners (e.g. for a bigger competition), edit `k8s/keda-scaledobject.yaml`:
 
```yaml
maxReplicaCount: 20  # raise this
```
 
---
 
## Quick-deploy container (optional)
 
Instead of running phases 6–8 manually, you can use the deploy container which does it all in one command:
 
```bash
# Build the deploy image (from project root)
docker build -f deploy/Dockerfile -t beta-code-deploy .
 
# Run it
docker run --rm \
  -e SERVER1_IP=192.168.1.10 \
  -e NFS_SERVER=192.168.1.10 \
  -v ~/.kube/config:/root/.kube/config \
  beta-code-deploy
```