# Process Todo Application (プロセス指向ToDoアプリ)

A sophisticated project management system focused on template-based process management with automatic deadline calculation.

## Features

- **Template-based Process Management**: Create reusable process templates with step dependencies
- **Intelligent Scheduling**: Goal-based reverse calculation with business day awareness
- **Japanese Business Context**: Built-in Japanese holiday calendar support
- **Artifact Tracking**: Required deliverables tied to process steps
- **Re-planning Capabilities**: Dynamic recalculation with preview/apply workflow

## Tech Stack

### Backend
- NestJS 11 / Node.js 20 / TypeScript 5
- PostgreSQL 15 with Prisma ORM
- Redis 7 for job queues (BullMQ)
- MinIO for file storage (S3 compatible)

### Architecture
- Clean Architecture with Domain-Driven Design
- Layer separation: Domain → Application → Infrastructure → Interface
- SOLID principles and dependency injection

## Getting Started

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd process-todo
```

2. Install dependencies
```bash
cd api
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start Docker services
```bash
docker-compose up -d db redis minio
```

5. Run database migrations
```bash
npm run prisma:migrate:dev
```

6. Generate Prisma client
```bash
npm run prisma:generate
```

7. Start the development server
```bash
npm run start:dev
```

The API will be available at http://localhost:3001
Swagger documentation at http://localhost:3001/api/docs

## API Endpoints

### Process Templates
- `POST /api/process-templates` - Create a new process template
- `GET /api/process-templates` - List all templates
- `GET /api/process-templates/:id` - Get template details
- `PUT /api/process-templates/:id` - Update template
- `DELETE /api/process-templates/:id` - Delete template

### Cases
- `POST /api/cases` - Create a case from template
- `GET /api/cases` - List all cases
- `GET /api/cases/:id` - Get case details
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case
- `POST /api/cases/:id/replan/preview` - Preview schedule recalculation
- `POST /api/cases/:id/replan/apply` - Apply schedule recalculation

### Steps
- `GET /api/steps/:id` - Get step details
- `PUT /api/steps/:id/status` - Update step status
- `PUT /api/steps/:id/assignee` - Assign step to user
- `PUT /api/steps/:id/lock` - Lock step
- `PUT /api/steps/:id/unlock` - Unlock step

## Development

### Running Tests
```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

### Code Quality
```bash
# Linting
npm run lint

# Format code
npm run format
```

### Docker Development
```bash
# Start all services
docker-compose up

# Stop all services
docker-compose down

# View logs
docker-compose logs -f api
```

## Project Structure

```
process-todo/
├── api/
│   ├── src/
│   │   ├── domain/           # Business logic and entities
│   │   ├── application/      # Use cases and DTOs
│   │   ├── infrastructure/   # Database, external services
│   │   └── interfaces/       # Controllers and API layer
│   ├── prisma/               # Database schema and migrations
│   └── test/                 # Test files
├── docs/                     # Documentation
└── docker-compose.yml        # Docker configuration
```

## License

MIT