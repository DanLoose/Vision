# Slack-to-Jira AI Agent (MVP)

Arquitetura pensada para MVP limpo hoje e evolução futura sem retrabalho.

## Princípios adotados
- **SOLID**: casos de uso desacoplados de infraestrutura por portas (interfaces).
- **DRY**: validações e contratos centralizados.
- **TDD-friendly**: regras de negócio em use-cases puros, testáveis sem rede/DB.
- **Extensibilidade**: clientes externos e repositórios substituíveis (ex.: fila, redis, novos canais).

## Estrutura
- `src/application/ports`: contratos entre domínio e adapters.
- `src/application/use-cases`: regras de negócio (processar evento/interação).
- `src/domain`: schemas e tipos centrais.
- `src/infrastructure/clients`: adapters externos (Slack/Jira/LLM).
- `src/infrastructure/repositories`: acesso a dados (Prisma) via repository pattern.
- `src/infrastructure/logging`: persistência de audit log.
- `src/routes`: adapters HTTP (Fastify).
- `src/utils`: utilitários de segurança e suporte.

> Observação: a pasta `src/services` legada foi removida para evitar duplicidade arquitetural.

## Setup
```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run dev
```

## Endpoints
- `POST /slack/events`
- `POST /slack/interactions`
- `GET /health`

## Fluxo
1. Recebe evento Slack, valida assinatura e responde rápido.
2. Caso de uso persiste mensagem e chama extrator LLM.
3. Se acionável, cria `ActionCandidate` pendente e envia botão de aprovação.
4. Interação `Create Jira issue` cria Jira, persiste key/url e responde thread.
5. Interação `Ignore` marca ignorado e responde thread.

## Testes
```bash
npm test
```
