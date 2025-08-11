# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **process-oriented todo application** (プロセス指向ToDoアプリ) - a sophisticated project management system that focuses on template-based process management with automatic deadline calculation. Currently in the documentation/design phase with comprehensive planning documents in the `/docs` directory.

## Development Commands

### Phase 1-2: Backend Development (when implemented)
```bash
# Backend setup (NestJS)
cd api
npm install
npm run dev        # Development server
npm run build      # Production build
npm run test       # Unit tests
npm run test:e2e   # Integration tests
npm run lint       # ESLint
npm run format     # Prettier
```

### Phase 2-3: Frontend Development (when implemented)
```bash
# Frontend setup (Next.js)
cd web
npm install
npm run dev        # Development server (port 3000)
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Component tests
```

### Database & Infrastructure
```bash
# Docker services
docker-compose up -d     # Start all services (db, redis, minio)
docker-compose down      # Stop services

# Database migrations (Prisma)
cd api
npx prisma migrate dev   # Apply migrations in development
npx prisma generate      # Generate Prisma client
npx prisma studio        # Visual database browser
```

## Architecture & Key Design Decisions

### Clean Architecture Layers
The backend follows Domain-Driven Design with clear separation:
1. **Domain Layer** (`api/src/domain/`): Business logic, entities, value objects
2. **Application Layer** (`api/src/application/`): Use cases, DTOs, application services
3. **Infrastructure Layer** (`api/src/infrastructure/`): Database, external services
4. **Interface Layer** (`api/src/interfaces/`): Controllers, presenters

### Core Algorithm
The scheduling algorithm (`docs/05_scheduling_algorithm.md`) uses **goal-based reverse calculation**:
- Start from target completion date
- Calculate backwards considering business days only
- Account for step dependencies and buffer times
- Japanese holidays are automatically excluded

### Key Domain Concepts
- **ProcessTemplate**: Reusable process definitions with steps
- **ProcessCase**: Instances of templates with actual dates
- **ProcessStep**: Individual tasks with dependencies and required artifacts
- **Artifact**: Deliverables tied to steps
- **BusinessDayCalc**: Service for working day calculations

### Database Schema
PostgreSQL with these core tables (see `docs/04_schema.md`):
- `process_templates`, `template_steps`, `step_dependencies`
- `process_cases`, `case_steps`, `case_artifacts`
- `holidays` (Japanese calendar support)

## Important Documentation References

Critical documents for understanding the system:
- `docs/process_todo_plan.md` - Development roadmap and phases
- `docs/10_arch_overview.md` - Architecture decisions
- `docs/05_scheduling_algorithm.md` - Core scheduling logic
- `docs/04_schema.md` - Complete database DDL
- `docs/01_use_cases.md` - Business requirements

## Development Guidelines

### API Development
- Follow RESTful conventions with proper HTTP status codes
- Use DTOs for request/response validation
- Implement optimistic locking with ETags for concurrent updates
- All dates in UTC, converted at presentation layer

### Frontend Development
- Use server components where possible (Next.js App Router)
- Implement drag-and-drop for template editing (@dnd-kit)
- Gantt/calendar views use dedicated libraries (gantt-task-react)
- Form validation with react-hook-form + zod

### Testing Strategy
- Unit tests for domain logic (Jest/Vitest)
- Integration tests with Testcontainers
- E2E tests for critical user flows (Playwright)
- Minimum 80% coverage for domain layer

### Key Technical Decisions
- **Authentication**: JWT for MVP, OIDC for enterprise
- **Job Queue**: BullMQ with Redis for async operations
- **File Storage**: MinIO (dev) / S3 (production)
- **Monitoring**: OpenTelemetry with Grafana/Prometheus