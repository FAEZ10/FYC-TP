# 🏗️ Architecture du Projet

## 📁 Structure des Fichiers

```
swarm-ecommerce-demo/
│
├── 📄 README.md              # Documentation complète
├── 📄 ARCHITECTURE.md        # Ce fichier
├── 📄 docker-compose.yml     # Dev local
├── 📄 .gitignore
│
├── 📂 backend/               # API Node.js + Express
│   ├── package.json
│   ├── server.js             # Code de l'API (CRUD produits)
│   ├── init.sql              # Script d'initialisation PostgreSQL
│   ├── Dockerfile
│   └── .dockerignore
│
├── 📂 frontend/              # Interface utilisateur
│   ├── index.html            # Page principale
│   ├── style.css             # Design moderne
│   ├── app.js                # Logique client
│   ├── nginx.conf            # Configuration Nginx
│   ├── Dockerfile
│   └── .dockerignore
│
└── 📂 swarm-stacks/          # Configurations Swarm
    ├── traefik-stack.yml     # Reverse proxy + SSL
    ├── app-stack.yml         # Application complète
    ├── monitoring-stack.yml  # Prometheus + Grafana
    └── prometheus.yml        # Config Prometheus
```

---

## 🌐 Architecture Réseau

### Vue d'ensemble

```
┌───────────────────────────────────────────────────────────┐
│                      INTERNET                             │
│                   (Users + Bots)                          │
└──────────────────────────┬────────────────────────────────┘
                           │
                   HTTPS (Let's Encrypt)
                           │
                           ▼
            ┌──────────────────────────┐
            │    TRAEFIK (Manager)     │
            │   Reverse Proxy + SSL    │
            │  - Port 80  (redirect)   │
            │  - Port 443 (HTTPS)      │
            └────────────┬─────────────┘
                         │
                         │ traefik-public (overlay)
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
┌─────────────────┐          ┌─────────────────┐
│   FRONTEND      │          │   BACKEND API   │
│   Nginx         │◄────────►│   Express       │
│   (2 replicas)  │          │   (3 replicas)  │
│                 │          │                 │
│ app.example.com │          │ api.example.com │
└─────────────────┘          └────────┬────────┘
  traefik-public                      │
  frontend-net                        │
                                      │ backend-net
                                      │ (INTERNAL - Isolé)
                                      │
                                      ▼
                           ┌──────────────────┐
                           │   POSTGRESQL     │
                           │   (1 replica)    │
                           │                  │
                           │  Volume: db-data │
                           │  Config: init.sql│
                           │  (Auto-init)     │
                           └──────────────────┘
```

### Réseaux Overlay

| Réseau | Type | Services | But | Création |
|--------|------|----------|-----|----------|
| **traefik-public** | Public | Traefik, Frontend, API | Exposition vers Internet | Auto (traefik-stack.yml) |
| **frontend-net** | Privé | Frontend, API | Communication Frontend ↔ API | Auto (app-stack.yml) |
| **backend-net** | **Internal** | API, Database | Communication API ↔ DB (ISOLÉ) | Auto (app-stack.yml) |
| **monitoring** | Privé | Prometheus, Grafana, Exporters | Métriques | Auto (monitoring-stack.yml) |

**💡 Note :** Tous les réseaux sont créés automatiquement lors du déploiement des stacks. Plus besoin de les créer manuellement !

---

## 🔐 Flux de Sécurité

### Gestion des Secrets

```
┌─────────────────────────────────────────┐
│   Manager Node (Raft Database)         │
│   ┌─────────────────────────────────┐   │
│   │  Secret: db_password            │   │
│   │  Value: ●●●●●● (chiffré)        │   │
│   └─────────────────────────────────┘   │
└──────────────────┬──────────────────────┘
                   │
                   │ Injection sécurisée
                   │
     ┌─────────────┴─────────────┐
     │                           │
     ▼                           ▼
┌─────────┐               ┌─────────┐
│ API Pod │               │ DB Pod  │
│         │               │         │
│ /run/   │               │ /run/   │
│ secrets/│               │ secrets/│
│ db_pass │               │ db_pass │
└─────────┘               └─────────┘
```

**Propriétés :**
- ✅ Chiffré au repos (Raft DB)
- ✅ Chiffré en transit (TLS)
- ✅ Monté en tmpfs (RAM, pas de disque)
- ✅ Jamais dans les variables d'environnement
- ✅ Invisible via `docker inspect`

### Initialisation Automatique de la Base de Données

```
┌─────────────────────────────────────────┐
│   Docker Swarm Config                   │
│   ┌─────────────────────────────────┐   │
│   │  Config: db_init_script          │   │
│   │  Source: backend/init.sql        │   │
│   └─────────────────────────────────┘   │
└──────────────────┬──────────────────────┘
                   │
                   │ Montage automatique
                   │
                   ▼
         ┌──────────────────┐
         │   POSTGRESQL     │
         │   /docker-       │
         │   entrypoint-    │
         │   initdb.d/      │
         │   init.sql       │
         └──────────────────┘
                   │
                   │ Exécution auto
                   │ (1er démarrage)
                   ▼
         ✅ Tables créées
         ✅ Données insérées
```

**Propriétés :**
- ✅ Initialisation automatique au premier démarrage
- ✅ Script injecté via Config Docker Swarm
- ✅ Pas besoin d'intervention manuelle
- ✅ Idempotent (ne s'exécute qu'une fois)

---

## 📊 Architecture de Monitoring

```
┌─────────────────────────────────────────────────┐
│            GRAFANA (Dashboard)                  │
│          https://grafana.example.com            │
└──────────────────┬──────────────────────────────┘
                   │ Query
                   ▼
         ┌─────────────────┐
         │   PROMETHEUS    │
         │  (Time Series)  │
         └────────┬────────┘
                  │ Scrape (15s interval)
         ┌────────┼────────┐
         │        │        │
         ▼        ▼        ▼
    ┌────────┐ ┌──────┐ ┌──────────┐
    │ Node   │ │cAdv  │ │  App     │
    │Exporter│ │isor  │ │ Metrics  │
    └────────┘ └──────┘ └──────────┘
    (Système)  (Docker)  (Custom)
     
    Mode Global  Mode Global  Mode Replicated
    (1 par nœud) (1 par nœud) (Optionnel)
```

**Métriques collectées :**
- CPU, RAM, Disque, Réseau (par nœud)
- Conteneurs actifs, restarts, erreurs
- Latence des requêtes HTTP
- Taux d'erreur 5xx

---

## 🔄 Flux de Déploiement

### Rolling Update (Zero Downtime)

```
État Initial:
┌────┐ ┌────┐ ┌────┐
│ v1 │ │ v1 │ │ v1 │  ← API version 1 (3 replicas)
└────┘ └────┘ └────┘

Étape 1 (parallelism: 1, delay: 10s):
┌────┐ ┌────┐ ┌────┐
│ v2 │ │ v1 │ │ v1 │  ← Mise à jour du 1er conteneur
└────┘ └────┘ └────┘
       │     │
       Wait... Healthcheck...
       ✅ OK

Étape 2:
┌────┐ ┌────┐ ┌────┐
│ v2 │ │ v2 │ │ v1 │  ← Mise à jour du 2ème conteneur
└────┘ └────┘ └────┘
              │
              Wait... Healthcheck...
              ❌ FAIL!

Rollback Automatique:
┌────┐ ┌────┐ ┌────┐
│ v1 │ │ v1 │ │ v1 │  ← Retour à la version stable
└────┘ └────┘ └────┘
```

**Configuration :**
- `parallelism: 1` → 1 conteneur à la fois
- `delay: 10s` → Attente entre chaque mise à jour
- `failure_action: rollback` → Rollback auto si échec
- `monitor: 5s` → Surveillance post-déploiement

---

## 🎭 Scénarios de Haute Disponibilité

### Scénario 1 : Panne d'un nœud

```
État Normal:
Node-1: [Frontend-1] [API-1] [DB-1]
Node-2: [Frontend-2] [API-2]
Node-3:               [API-3]

❌ Node-2 tombe en panne:
Node-1: [Frontend-1] [API-1] [DB-1]
Node-2: ❌ OFFLINE ❌
Node-3:               [API-3]

🔄 Swarm détecte et réagit (30s):
Node-1: [Frontend-1] [API-1] [DB-1] [API-2-new]
Node-2: ❌ OFFLINE ❌
Node-3: [Frontend-2-new] [API-3]

✅ Application toujours accessible!
```

### Scénario 2 : Conteneur qui plante

```
État Normal:
API-1: ✅ Running → Healthcheck ✅
API-2: ✅ Running → Healthcheck ✅
API-3: ✅ Running → Healthcheck ✅

💥 API-2 crash (bug, OOM, etc.):
API-1: ✅ Running → Healthcheck ✅
API-2: ❌ Unhealthy (3 checks failed)
API-3: ✅ Running → Healthcheck ✅

🔄 Swarm redémarre (10-30s):
API-1: ✅ Running → Healthcheck ✅
API-2: 🔄 Restarting...
API-3: ✅ Running → Healthcheck ✅

✅ API-2: ✅ Running → Healthcheck ✅

✅ Récupération automatique!
```

---

## 🔍 Points de Contrôle du Cas Pratique

| # | Objectif | Implémentation | Fichier |
|---|----------|----------------|---------|
| 1 | **Haute Disponibilité** | Réplicas multiples + placement distribué | `app-stack.yml` |
| 2 | **Sécurité Secrets** | Docker Secrets + tmpfs | `app-stack.yml` |
| 3 | **SSL Automatique** | Traefik + Let's Encrypt | `traefik-stack.yml` |
| 4 | **Isolation Réseau** | Réseaux overlay + internal | `app-stack.yml` |
| 5 | **Monitoring** | Prometheus + Grafana + Exporters | `monitoring-stack.yml` |
| 6 | **Auto-healing** | Healthchecks + restart_policy | `app-stack.yml` |

---

## 🚦 Processus de Déploiement

```
┌─────────────────┐
│ 1. Init Swarm   │  docker swarm init
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Join Nodes   │  docker swarm join
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Secrets      │  docker secret create
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Build Images │  docker build + push
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Deploy Stack │  docker stack deploy
│                 │  (réseaux créés auto)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Verify ✅    │  docker service ls
│                 │  (DB init auto via Config)
└─────────────────┘
```

---

## 📈 Scalabilité

### Capacité actuelle

| Service | Replicas | CPU/Replica | RAM/Replica | Total |
|---------|----------|-------------|-------------|-------|
| Frontend | 2 | 0.1 core | 50 MB | 100 MB |
| API | 3 | 0.2 core | 150 MB | 450 MB |
| Database | 1 | 0.5 core | 256 MB | 256 MB |
| **Total** | **6** | **1.3 cores** | **806 MB** | |

### Scalabilité horizontale

```bash
# Augmenter les réplicas API
docker service scale ecommerce_api=10

# Augmenter les réplicas Frontend
docker service scale ecommerce_frontend=5

# Ajouter des nœuds au cluster
docker swarm join --token xxx...
```

**Limites :**
- ✅ Frontend : scalable à l'infini (stateless)
- ✅ API : scalable à l'infini (stateless)
- ⚠️ Database : 1 réplica (solution : PostgreSQL externe ou Patroni)

---

