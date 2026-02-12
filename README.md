# Project Management API

## Description

Comprehensive Multi-Tenant Project Management API built with NestJS, providing functionalities for project management, organization scoping, and RBAC.

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- Yarn
- PostgreSQL
- RabbitMQ

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/solomon-prosperity/project_mgt_api.git
   cd project_mgt_api
   ```
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Environment Configuration:

   - Copy `.env.template` to `.env`.
   - Fill in the required environment variables (Database, RabbitMQ, JWT).

4. Database Setup:

   ```bash
   yarn migrate
   ```

5. Seed Data:
   The application automatically seeds default roles, permissions on startup.

### Running the App

```bash
# development
$ yarn start:dev

# production mode
$ yarn start:prod

# docker
$ docker-compose up --build
```

### Running Tests

```bash
# unit tests
$ yarn test

# test coverage
$ yarn test:cov

# e2e tests
$ NODE_ENV=test yarn test:e2e
```

## Multi-Tenancy

- **Isolation Strategy**: I used a **Shared Database, Shared Schema** approach. Every tenant-specific record (like Projects) is associated with an `org_id`.
- **Tenant Context**: The `org_id` is extracted from the JWT payload. The `JwtStrategy` performs a lookup on every request to ensure the user is an active member of the organization they are trying to access.
- **RBAC Policy**: Permissions are granular and slug-based (e.g., `create_project`). Roles are organization-specific, allowing a user to be an `Admin` in one org and a `Member` in another.
- **Audit Logging**: Sensitive operations like building projects or deleting them are logged asynchronously via RabbitMQ to maintain API performance.

## API Documentation

The API documentation is automatically generated using Swagger. Once the application is running, you can access it at:

- **Swagger UI**: `http://localhost:4000/api-docs` (accessing the containerized or local app).

## Architectural Decisions

- **Framework**: [NestJS](https://nestjs.com/) for its modular architecture and TypeScript first-class support.
- **ORM**: [TypeORM](https://typeorm.io/) used for robust entity management and migration tracking.
- **Multi-Tenancy Bridge**: The `OrganizationMember` entity serves as a critical junction connecting users, organizations, and roles, facilitating flexible RBAC.
- **Asynchronous Auditing**: [RabbitMQ](https://www.rabbitmq.com/) is used to offload auditing tasks, ensuring that the primary API response is never delayed by logging overhead.
- **Global Guards**: `PermissionsGuard` combined with the `@Permissions` decorator provides a clean, declarative way to secure endpoints.

## Trade-offs & Improvements

### Trade-offs made

- **Database Lookup on Auth**: I fetch the user's role/permissions from the DB on every request. While this adds a small overhead, it ensures "instant" permission revocation and avoids "stale" tokens.
- **Shared Schema**: Easier to manage migrations and infrastructure, though it relies on strict application-level query scoping.

### Future Improvements

1. **Row Level Security (RLS)**: Implement PostgreSQL RLS for a secondary layer of data isolation at the DB level.
2. **Invitation Flow**: Add a formal invitation/acceptance workflow for new organization members.
3. **Advanced Scoping**: Implement a global TypeORM subscriber or interceptor to automatically inject `org_id` into all queries.

---

## SQL Exercise

### Solution Query

```sql
SELECT
    c.id AS client_id,
    c.full_name,
    COALESCE(SUM(i.total_amount), 0) AS total_invoiced_amount,
    COUNT(i.id) AS invoice_count
FROM clients c
LEFT JOIN invoices i ON c.id = i.client_id
    AND i.org_id = c.org_id
    AND i.status = 'Paid'
    AND i.created_at BETWEEN '2026-01-01' AND '2026-01-31'
WHERE c.org_id = :org_id
GROUP BY c.id, c.full_name;
```

### Indexing Recommendations

To optimize this query for performance and tenant isolation, I would add the following indexes:

1. **Composite Index on `invoices(org_id, status, created_at)`**:
   - **Why**: This index allows the database to instantly filter records for a specific tenant and a specific status ('Paid') while also performing an efficient range scan on the `created_at` column.
2. **Foreign Key Index on `clients(org_id)`**:
   - **Why**: Essential for the initial filtering of clients belonging to the specified organization and for joining with the organizations table if necessary.
3. **Index on `invoices(client_id)`**:
   - **Why**: Speeds up the join operation between the `clients` and `invoices` tables.
4. **Composite Index on `invoices(client_id, org_id)`**:
   - **Why**: (Optional but recommended) Ensures that the join integrity (matching both client and organization) is highly performant and can potentially allow for index-only scans if other columns are included.

**Rationale**: Leading with `org_id` in most indexes ensures that the database engine can isolate the relevant data subset (the tenant's data) immediately, minimizing Disk I/O and CPU usage.

---

### Author

- **Prosper Eravwuvieke**
- [LinkedIn Profile](https://www.linkedin.com/in/prosper-eravwuvieke/)

### License

This project is [UNLICENSED](LICENSE).
