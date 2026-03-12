# TableSync Monorepo

A restaurant table reservation scheduling system focused on **extremely high concurrency**, built with an **asynchronous microservices (Event-Driven)** architecture.

## Goal

The main problem TableSync solves is preventing **race conditions** in scenarios where thousands of simultaneous requests try to reserve the same table.

Core strategy:
- Receive requests quickly through the API Gateway and return `202 Accepted`.
- Process reservations asynchronously in the worker.
- Protect the critical section with a **distributed lock in Redis** before persisting to PostgreSQL.

## Architecture

High-level flow:

1. The mobile app sends `POST /reservations` to the API Gateway.
2. The API validates the payload and publishes a message to RabbitMQ.
3. The API immediately responds with `202 Accepted`.
4. The Reservation Worker consumes the queue message.
5. The Worker tries to acquire a Redis lock for `tableId`.
6. If the lock is acquired, it persists the reservation to PostgreSQL via EF Core.
7. The Worker releases the lock and completes processing.

## Technology Stack

### Frontend
- React Native with Expo
- TypeScript
- Feature-Sliced Design (FSD) architecture

### Backend
- API Gateway: C# .NET 8+ (ASP.NET Core Web API)
- Reservation Worker: C# .NET 8+ (Worker Service)
- Shared Contracts: C# Class Library (shared DTOs)

### Infrastructure and Data
- RabbitMQ (asynchronous messaging)
- PostgreSQL (relational persistence)
- Redis with StackExchange.Redis (distributed locking)
- Docker Desktop + WSL2 (local environment)
- Kubernetes (target deployment platform)

## Monorepo Structure

Target structure:

```text
tablesync-monorepo/
├── apps/
│   └── mobile-app/          # React Native + Expo (FSD)
├── services/
│   ├── api-gateway/         # ASP.NET Core Web API (.NET 8+)
│   ├── reservation-worker/  # .NET Worker Service (.NET 8+)
│   └── shared-contracts/    # C# Class Library (DTOs)
├── infra/
│   ├── docker/              # docker-compose (Postgres, RabbitMQ, Redis)
│   └── k8s/                 # manifests (Deployment, Service, HPA)
└── README.md
```

The current repository structure can evolve gradually toward this format.

## Concurrency Rules (Project Core)

For each reservation attempt:

- Suggested lock key: `lock:reservation:table:{tableId}`.
- The worker uses `SET NX EX` in Redis (lock with TTL).
- Without lock: the request is discarded or marked as a concurrency failure.
- With lock: write to Postgres in an idempotent/safe operation.
- Always release the lock at the end (with lock ownership validation).

This design reduces collision rates during traffic spikes and protects the relational database from excessive contention.

## Scalability and Kubernetes

Planned scalability points:

- Horizontal scaling of the API Gateway to absorb HTTP traffic.
- Horizontal scaling of the Worker based on queue depth (RabbitMQ).
- Kubernetes HPA for both API and Worker.
- Stateless services running in Linux containers (Alpine).
- Redis and Postgres as shared services with high-availability configuration (future phase).

## Development Guidelines

### C# (.NET 8+)
- Prefer modern features: Minimal APIs, Records, native DI.
- Keep code focused on performance and resilience.
- Ensure readiness for Linux container execution.

### Mobile (React Native + FSD)
- Strictly follow FSD layers:
	- `app`
	- `processes`
	- `pages`
	- `widgets`
	- `features`
	- `entities`
	- `shared`

## Local Environment (Windows + WSL2 + Docker)

Prerequisites:

- Windows with WSL2 enabled
- Docker Desktop
- .NET SDK 8+
- Node.js LTS
- Expo CLI (or `npx expo`)

Local infrastructure (when `docker-compose.yml` is configured):

```bash
cd infra/docker
docker compose up -d
```

Expected services:
- PostgreSQL
- RabbitMQ
- Redis

## Technical Roadmap (Next Steps)

1. Create `shared-contracts` with versioned DTOs.
2. Implement the API Gateway publishing messages to RabbitMQ.
3. Implement the Reservation Worker with distributed locking in Redis.
4. Persist reservations in PostgreSQL with EF Core.
5. Add observability (structured logs, metrics, and tracing).
6. Publish Kubernetes manifests in `infra/k8s` with HPA.
7. Implement status feedback to the app (polling, WebSocket, or push).

## Status

The project is in the initial monorepo structuring phase, with a defined architecture to safely support extreme concurrency.

