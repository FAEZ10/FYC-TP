# 🐳 Cas Pratique : Déploiement Docker Swarm d'une Application E-Commerce

> Application simple pour apprendre Docker Swarm avec un exemple concret et réaliste

## 📋 Table des matières

- [Présentation](#présentation)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Développement Local](#développement-local)
- [Déploiement Swarm](#déploiement-swarm)
- [Vérifications et Tests](#vérifications-et-tests)
- [Analyse des Points de Contrôle](#analyse-des-points-de-contrôle)
- [Dépannage](#dépannage)

---

## 🎯 Présentation

Cette application e-commerce simple démontre tous les concepts clés de Docker Swarm :

- ✅ **Haute disponibilité** : L'application reste accessible même si un nœud tombe
- ✅ **Sécurité** : Gestion des secrets (mot de passe BDD)
- ✅ **SSL automatique** : Certificats Let's Encrypt via Traefik
- ✅ **Isolation réseau** : Segmentation frontend/backend/database
- ✅ **Monitoring** : Prometheus + Grafana
- ✅ **Auto-healing** : Redémarrage automatique des conteneurs défaillants

### Stack Technique

**Frontend**
- HTML/CSS/JavaScript vanilla
- Nginx pour servir les fichiers statiques
- Design moderne et responsive

**Backend**
- Node.js + Express
- API REST simple (CRUD produits)
- Healthcheck endpoint

**Base de données**
- PostgreSQL 15
- Données persistantes avec volumes

---

## 🏗️ Architecture

### Infrastructure

```
┌─────────────────────────────────────────────────────┐
│                    Internet                         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  Traefik (Manager)   │  ← SSL automatique
          │  Reverse Proxy       │
          └──────────┬───────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐         ┌──────────────┐
│  Frontend    │         │   API        │
│  (2 replicas)│────────▶│  (3 replicas)│
└──────────────┘         └───────┬──────┘
   traefik-public          │     │
   frontend-net            │     │
                           │     │ backend-net
                           │     │ (ISOLÉ)
                           │     ▼
                           │  ┌──────────────┐
                           │  │  PostgreSQL  │
                           └─▶│  (1 replica) │
                              └──────────────┘
```

### Réseaux

1. **traefik-public** : Réseau public exposé via Traefik
2. **frontend-net** : Communication Frontend ↔ API
3. **backend-net** : Communication API ↔ Database (ISOLÉ, pas d'accès Internet)

---

## 🔧 Prérequis

### Pour le développement local

- Docker Desktop ou Docker Engine
- Docker Compose
- Node.js 18+ (optionnel, pour développement sans Docker)

### Pour le déploiement Swarm

- **3 serveurs Ubuntu** (minimum 2 GB RAM chacun)
- Docker Engine installé sur chaque serveur
- Accès SSH à tous les serveurs
- Un nom de domaine pointant vers votre cluster (pour SSL)

**Exemple de configuration des nœuds :**

| Nœud | IP | Rôle |
|------|-------|------|
| Node-1 | 192.168.1.10 | Manager + Worker |
| Node-2 | 192.168.1.11 | Manager + Worker |
| Node-3 | 192.168.1.12 | Manager + Worker |

---

## 💻 Développement Local

### Démarrage rapide

```bash
# Cloner ou copier le projet
cd swarm-ecommerce-demo

# Démarrer tous les services
docker compose up -d

# Vérifier que tout fonctionne
docker compose ps
```

### Accès aux services

- **Frontend** : http://localhost:3000
- **API** : http://localhost:8080
- **Health Check** : http://localhost:8080/health
- **PostgreSQL** : localhost:5432

### Tester l'API

```bash
# Voir les produits
curl http://localhost:8080/api/products

# Ajouter un produit
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","price":99.99,"stock":10}'
```

### Arrêter le développement

```bash
docker compose down
# Ou pour supprimer aussi les volumes :
docker compose down -v
```

---

## 🚀 Déploiement Swarm

> **📖 Guide complet :** Pour un guide de déploiement détaillé étape par étape, consultez [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

### Étape 1 : Initialiser le cluster Swarm

**Sur le premier nœud (Node-1) :**

```bash
# Initialiser Swarm
docker swarm init --advertise-addr <IP_NODE_1>

# La commande affiche un token, copiez-le
```

**Sur les nœuds 2 et 3 :**

```bash
# Joindre le cluster avec le token fourni
docker swarm join --token SWMTKN-1-xxxxx... 192.168.1.10:2377
```

**Retour sur Node-1 : Promouvoir les workers en managers**

```bash
# Lister les nœuds
docker node ls

# Promouvoir pour avoir 3 managers (haute disponibilité)
docker node promote Node-2
docker node promote Node-3

# Vérifier
docker node ls
# Les 3 nœuds doivent avoir le statut "Reachable" ou "Leader"
```

**💡 Note :** La base de données sera automatiquement déployée sur `Node-1` grâce à la contrainte de placement dans la stack. Plus besoin d'ajouter de label manuellement !

---

### Étape 2 : Créer le secret

**💡 Note :** Les réseaux (`traefik-public`, `frontend-net`, `backend-net`, `monitoring`) seront créés automatiquement lors du déploiement des stacks. Plus besoin de les créer manuellement !

```bash
# Créer le secret pour le mot de passe PostgreSQL
# ⚠️ Le secret ne sera JAMAIS visible en clair
# ⚠️ Changez le mot de passe ci-dessous par un mot de passe sécurisé !
echo "VotreMotDePasseSecurise123!" | docker secret create db_password -

# Vérifier (on ne peut PAS voir le contenu)
docker secret ls
docker secret inspect db_password
```

---

### Étape 3 : Build et Push des images

**Avec Docker Hub**

```bash
# Se connecter
docker login

# Build et push du backend
cd backend
docker build -t faezbacar/ecommerce-backend:latest .
docker push faezbacar/ecommerce-backend:latest

# Build et push du frontend
cd ../frontend
docker build -t faezbacar/ecommerce-frontend:latest .
docker push faezbacar/ecommerce-frontend:latest
```

**⚠️ IMPORTANT :** Remplacez `faezbacar` par votre username Docker Hub réel !

---

### Étape 4 : Déployer Traefik

**⚠️ IMPORTANT :** Les domaines sont déjà configurés avec `faez-studio.fr`. Si vous utilisez un autre domaine, modifiez `swarm-stacks/traefik-stack.yml`.

```bash
cd swarm-stacks

# Déployer Traefik (crée automatiquement le réseau traefik-public)
docker stack deploy -c traefik-stack.yml traefik

# Vérifier le déploiement
docker service ls
docker service logs traefik_traefik

# Attendre que Traefik soit prêt (30-60 secondes)
```

**Test :** https://traefik.faez-studio.fr (devrait afficher le dashboard Traefik avec SSL)

---

### Étape 5 : Déployer l'application

**⚠️ IMPORTANT :** Les images sont configurées avec `faezbacar`. Si vous utilisez un autre username Docker Hub, modifiez `swarm-stacks/app-stack.yml`.

```bash
# Déployer l'application complète
# Les réseaux frontend-net et backend-net sont créés automatiquement
# La base de données s'initialise automatiquement via Config Docker Swarm
docker stack deploy -c app-stack.yml ecommerce

# Vérifier le déploiement
docker stack ps ecommerce

# Voir les logs
docker service logs ecommerce_frontend
docker service logs ecommerce_api
docker service logs ecommerce_database

# Attendre que tous les services soient "Running" (1-2 minutes)
watch docker service ls
```

**✅ IMPORTANT :** La base de données s'initialise automatiquement ! Le script `init.sql` est injecté via un Config Docker Swarm et exécuté au premier démarrage de PostgreSQL.

**Vérifier l'initialisation (après 60 secondes) :**
```bash
POSTGRES_CONTAINER=$(docker ps -q -f name=ecommerce_database)
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d ecommerce -c "\dt"
# Devrait afficher la table "products"
```

---

### Étape 6 : Déployer le monitoring (optionnel)

```bash
# Déployer Prometheus + Grafana
docker stack deploy -c monitoring-stack.yml monitoring

# Vérifier
docker service ls | grep monitoring
```

**Accès Grafana :**
- URL : https://grafana.faez-studio.fr
- User : `admin`
- Pass : `AdminPass123`

**Configuration Grafana :**
1. Ajouter une Data Source : Prometheus
   - URL : `http://prometheus:9090`
   - Save & Test
2. Importer un dashboard :
   - Dashboard ID : **1860** (Node Exporter Full)
   - Dashboard ID : **893** (Docker Swarm)

---

## ✅ Vérifications et Tests

### Vérifier l'état du cluster

```bash
# État des nœuds
docker node ls

# Services déployés
docker service ls

# Détails d'une stack
docker stack ps ecommerce

# Logs en temps réel
docker service logs -f ecommerce_api
```

### Tester l'application

**Via le navigateur :**
- Frontend : https://app.faez-studio.fr
- API : https://api.faez-studio.fr/health
- Traefik Dashboard : https://traefik.faez-studio.fr

**Via curl :**

```bash
# Health check de l'API
curl https://api.faez-studio.fr/health

# Liste des produits
curl https://api.faez-studio.fr/api/products

# Ajouter un produit
curl -X POST https://api.faez-studio.fr/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Nouveau Produit","price":199.99,"stock":25}'
```

### Test de haute disponibilité

```bash
# Simuler la panne d'un nœud
docker node update --availability drain Node-2

# Observer la migration des tâches
watch docker service ps ecommerce_api

# Les conteneurs qui étaient sur Node-2 migrent vers Node-1 et Node-3
# L'application reste accessible !

# Remettre le nœud en service
docker node update --availability active Node-2
```

### Test d'auto-healing

```bash
# Tuer un conteneur API
docker kill $(docker ps -q -f name=ecommerce_api | head -1)

# Swarm redémarre automatiquement un nouveau conteneur
docker service ps ecommerce_api

# L'application reste accessible pendant ce temps
```

### Test de rolling update

```bash
# Modifier le code, rebuild, push l'image
# Puis mettre à jour le service :
docker service update --image faezbacar/ecommerce-backend:v2 ecommerce_api

# Swarm met à jour 1 conteneur à la fois (parallelism: 1)
# Si une mise à jour échoue, rollback automatique
watch docker service ps ecommerce_api
```

---

## 🎓 Analyse des Points de Contrôle

### ✅ Point 1 : Haute disponibilité

**Configuration :**
- Frontend : 2 réplicas
- API : 3 réplicas
- Database : 1 réplica (épinglé sur Node-1)

**Test :**
```bash
# Mettre un nœud en drain
docker node update --availability drain Node-2

# L'application reste accessible car les réplicas sont sur d'autres nœuds
# Swarm redémarre automatiquement les conteneurs manquants
```

**Limite :** La base de données a un seul réplica. Si le nœud de la BDD tombe, il faut attendre qu'il revienne. Solution : utiliser une base de données managée externe.

---

### ✅ Point 2 : Sécurité des secrets

**Configuration :**
```bash
# Le secret est créé sans jamais être écrit en clair dans un fichier
echo "password" | docker secret create db_password -

# Dans le service, il est injecté via un fichier
DB_PASSWORD_FILE=/run/secrets/db_password
```

**Vérification :**
```bash
# Impossible de voir le secret
docker secret inspect db_password  # Ne montre PAS le contenu

# Le secret n'est visible QUE dans les conteneurs autorisés
docker exec <container-id> cat /run/secrets/db_password
```

**Sécurité :** Même `docker inspect` ne révèle pas le secret.

---

### ✅ Point 3 : SSL automatique

**Configuration :** Traefik demande automatiquement des certificats Let's Encrypt via le challenge HTTP.

**Vérification :**
```bash
# Voir le certificat
docker exec <traefik-container-id> ls /letsencrypt

# Dans le navigateur : le cadenas doit être vert
```

**Renouvellement :** Automatique 30 jours avant expiration.

---

### ✅ Point 4 : Isolation réseau

**Configuration :**
- Frontend : `traefik-public` + `frontend-net`
- API : `traefik-public` + `frontend-net` + `backend-net`
- Database : `backend-net` uniquement (réseau **internal**)

**Test :**
```bash
# Entrer dans un conteneur frontend
docker exec -it <frontend-container> sh

# Essayer de pinger la base - ÉCHEC
ping database  # Timeout ou bad address

# Essayer de pinger l'API - SUCCÈS
ping api  # Répond
```

---

### ✅ Point 5 : Monitoring fonctionnel

**Configuration :**
- Node Exporter : mode global (1 par nœud)
- Prometheus : collecte les métriques
- Grafana : visualisation

**Accès :**
- Grafana : https://grafana.faez-studio.fr
- Datasource : `http://prometheus:9090`
- Dashboards recommandés : 1860, 893

---

### ✅ Point 6 : Auto-healing

**Configuration :**
- Healthchecks sur API et Database
- `restart_policy: on-failure`
- `max_attempts: 3`

**Test :**
```bash
# Tuer un conteneur
docker kill <container-id>

# Swarm redémarre automatiquement
docker service ps ecommerce_api
```

**Temps de récupération :** Environ 30-45 secondes.

---

## 🐛 Dépannage

### Problème : Les services ne démarrent pas

```bash
# Voir les logs détaillés
docker service ps <service-name> --no-trunc

# Voir les logs du service
docker service logs <service-name>

# Vérifier les contraintes de placement
docker service inspect <service-name> --pretty
```

### Problème : Impossible d'accéder à l'application

```bash
# Vérifier que les nœuds sont actifs
docker node ls

# Vérifier les réseaux
docker network ls
docker network inspect traefik-public

# Vérifier les ports
netstat -tuln | grep -E '80|443'

# Vérifier Traefik
docker service logs traefik_traefik
```

### Problème : Certificat SSL non généré

```bash
# Vérifier les logs Traefik
docker service logs traefik_traefik | grep acme

# Prérequis :
# - Le domaine doit pointer vers l'IP publique
# - Le port 80 doit être ouvert (pour le challenge HTTP)
# - Attendre 1-2 minutes après le déploiement
```

### Problème : La base de données ne démarre pas

```bash
# Vérifier les logs
docker service logs ecommerce_database

# Vérifier le secret
docker secret ls
docker service inspect ecommerce_database | grep -A5 Secrets

# Vérifier le volume
docker volume ls
docker volume inspect db-data
```

### Problème : L'API ne peut pas se connecter à la base

```bash
# Vérifier que les services sont sur le même réseau
docker service inspect ecommerce_api | grep -A10 Networks
docker service inspect ecommerce_database | grep -A10 Networks

# Tester la connectivité
docker exec -it <api-container> ping database

# Vérifier les variables d'environnement
docker exec -it <api-container> env | grep DB_
```

---

## 🎯 Commandes Utiles

### Gestion du cluster

```bash
# État du cluster
docker node ls
docker service ls
docker stack ls

# Inspecter un nœud
docker node inspect Node-1

# Mettre un nœud en maintenance
docker node update --availability drain Node-2

# Réactiver un nœud
docker node update --availability active Node-2

# Retirer un nœud du cluster
docker node rm Node-3
```

### Gestion des services

```bash
# Mettre à l'échelle un service
docker service scale ecommerce_api=5

# Mettre à jour un service
docker service update --image nouvelle-image:tag ecommerce_api

# Rollback d'un service
docker service rollback ecommerce_api

# Forcer le redéploiement
docker service update --force ecommerce_api
```

### Gestion des stacks

```bash
# Déployer/Mettre à jour une stack
docker stack deploy -c app-stack.yml ecommerce

# Lister les services d'une stack
docker stack services ecommerce

# Voir l'état d'une stack
docker stack ps ecommerce

# Supprimer une stack
docker stack rm ecommerce
```

### Nettoyage

```bash
# Supprimer toutes les stacks
docker stack rm ecommerce traefik monitoring

# Supprimer les réseaux (si créés manuellement, sinon supprimés avec les stacks)
docker network rm traefik-public frontend-net backend-net monitoring

# Supprimer les secrets
docker secret rm db_password

# Quitter Swarm (sur chaque nœud)
docker swarm leave --force
```

---

## 📚 Ressources

- [Documentation Docker Swarm](https://docs.docker.com/engine/swarm/)
- [Documentation Traefik](https://doc.traefik.io/traefik/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Prometheus](https://prometheus.io/docs/)
- [Grafana](https://grafana.com/docs/)

---

## 📝 Licence

Projet éducatif pour le projet FYC.

**Auteurs :** BACAR ZOUBEIRI FAEZ, IBRAHIM SAINDOU

---

