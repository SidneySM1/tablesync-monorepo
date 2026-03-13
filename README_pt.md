# TableSync Monorepo

Sistema de agendamento de reservas de mesas com foco em **altíssima concorrência**, construído em arquitetura de **microsserviços assíncronos (Event-Driven)**.

## Objetivo

O principal problema resolvido pelo TableSync é evitar **race conditions** em cenários de milhares de requisições simultâneas tentando reservar a mesma mesa.

Estratégia central:
- Receber requisições rapidamente via API Gateway e retornar `202 Accepted`.
- Processar reservas de forma assíncrona em worker.
- Proteger a seção crítica com **lock distribuído no Redis** antes de persistir no PostgreSQL.

## Arquitetura

Fluxo de alto nível:

1. O app mobile envia `POST /reservations` para a API Gateway.
2. A API valida payload e publica mensagem no RabbitMQ.
3. A API responde imediatamente com `202 Accepted`.
4. O Reservation Worker consome a mensagem da fila.
5. O Worker tenta adquirir lock no Redis por `tableId`.
6. Se lock for obtido, persiste a reserva no PostgreSQL via EF Core.
7. O Worker libera o lock e finaliza processamento.

## Stack Tecnológica

### Frontend
- React Native com Expo
- TypeScript
- Arquitetura Feature-Sliced Design (FSD)

### Backend
- API Gateway: C# .NET 8+ (ASP.NET Core Web API)
- Reservation Worker: C# .NET 8+ (Worker Service)
- Shared Contracts: C# Class Library (DTOs compartilhados)

### Infra e Dados
- RabbitMQ (mensageria assíncrona)
- PostgreSQL (persistência relacional)
- Redis com StackExchange.Redis (lock distribuído)
- Docker Desktop + WSL2 (ambiente local)
- Kubernetes (deploy alvo)

## Estrutura do Monorepo

Estrutura alvo:

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

Estrutura atual do repositório pode evoluir gradualmente até este formato.

## Regras de Concorrência (Core do Projeto)

Para cada tentativa de reserva:

- Chave de lock sugerida: `lock:reservation:table:{tableId}`.
- O worker tenta `SET NX EX` no Redis (lock com TTL).
- Sem lock: requisição é descartada ou marcada como falha de concorrência.
- Com lock: grava no Postgres em operação idempotente/segura.
- Sempre liberar lock ao final (com validação de ownership do lock).

Esse desenho reduz colisões em picos e mantém o banco relacional protegido de contenção excessiva.

## Escalabilidade e Kubernetes

Pontos de escalabilidade planejados:

- Escala horizontal da API Gateway para absorver tráfego HTTP.
- Escala horizontal do Worker por profundidade da fila (RabbitMQ).
- HPA no Kubernetes para API e Worker.
- Serviços stateless em contêiner Linux (Alpine).
- Redis e Postgres como serviços compartilhados com configuração de alta disponibilidade (fase futura).

## Diretrizes de Desenvolvimento

### C# (.NET 8+)
- Preferir recursos modernos: Minimal APIs, Records, DI nativa.
- Código orientado a performance e resiliência.
- Pronto para execução em contêiner Linux.

### Mobile (React Native + FSD)
- Respeitar estritamente camadas FSD:
	- `app`
	- `processes`
	- `pages`
	- `widgets`
	- `features`
	- `entities`
	- `shared`

## Ambiente Local (Windows + WSL2 + Docker)

Pré-requisitos:

- Windows com WSL2 habilitado
- Docker Desktop
- .NET SDK 8+
- Node.js LTS
- Expo CLI (ou `npx expo`)

Infra local (quando `docker-compose.yml` estiver configurado):

```bash
cd infra/docker
docker compose up -d
```

Serviços esperados:
- PostgreSQL
- RabbitMQ
- Redis

## Roadmap Técnico (Próximos Passos)

1. Criar `shared-contracts` com DTOs versionados.
2. Implementar API Gateway publicando mensagens no RabbitMQ.
3. Implementar Reservation Worker com lock distribuído no Redis.
4. Persistir reservas no PostgreSQL com EF Core.
5. Adicionar observabilidade (logs estruturados, métricas e tracing).
6. Publicar manifests em `infra/k8s` com HPA.
7. Implementar retorno de status ao app (polling, WebSocket ou push).

## Status

Projeto em fase de estruturação inicial do monorepo com arquitetura definida para suportar concorrência extrema com segurança.

