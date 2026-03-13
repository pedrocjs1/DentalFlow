# DentalFlow — SaaS Dental Platform

## Stack
- Monorepo: Turborepo
- Frontend: Next.js 14 (App Router) + shadcn/ui + Tailwind CSS
- Backend: Fastify + TypeScript
- DB: Prisma + PostgreSQL
- Cache: Redis + BullMQ
- Auth: JWT (Better Auth)
- AI: Anthropic API (claude-sonnet-4-20250514)
- WhatsApp: Meta Business Cloud API

## Key Rules
- ALL DB queries must filter by `tenantId`
- Auth middleware on EVERY endpoint
- Encrypt external tokens in DB (AES-256-GCM)
- Zod validation on EVERY endpoint
- Code/comments in English, UI content in Spanish
- Dates stored UTC, displayed in tenant timezone
- Soft delete (isActive: false), not hard delete

## Dev Priority
1. Works correctly end-to-end
2. Secure (auth, tenant isolation, validation)
3. Scalable (100+ clinics from day 1)
4. Fast (optimized queries, correct indexes)
5. Beautiful (polished professional UI)

## Conventions
- Files: kebab-case
- Functions/vars: camelCase
- Types/interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE
