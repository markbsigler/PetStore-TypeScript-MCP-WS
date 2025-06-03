# 🐾 WebSocket-based Pet Store API

[![Node.js CI](https://github.com/markbsigler/PetStore-TypeScript-MCP-WS/actions/workflows/node.js.yml/badge.svg)](https://github.com/markbsigler/PetStore-TypeScript-MCP-WS/actions/workflows/node.js.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org/)

A robust WebSocket-based API implementation for a pet store, built with TypeScript, ESM, and modern best practices. This project implements a RESTful API with WebSocket support for real-time updates, following the OpenAPI 3.0 specification.

## Table of Contents
- [Features](#features)
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Authentication](#authentication)
- [Monitoring and Metrics](#monitoring-and-metrics)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Roadmap](#roadmap)

---

**2025 Update: ESM & TypeScript Compatibility**

- This project is fully ESM-native and uses TypeScript with `module: nodenext`.
- All import paths use explicit `.ts` extensions in source and test files for compatibility with Node.js ESM loader and ts-node/jest.
- Dynamic imports (e.g., plugins) must use `.ts` extensions in source and test mode.
- Node.js >= 18 is required for ESM and fetch API support.
- TypeScript 5.1.x is recommended for best compatibility with ESLint tooling.

---

## Features

- **RESTful API**
  - Full CRUD operations for pets, users, and orders
  - OpenAPI 3.0 documentation
  - Request validation using Zod schemas
  - Error handling with appropriate HTTP status codes

- **WebSocket Communication**
  - Real-time updates for resource changes
  - Type-safe message schemas using Zod
  - Request-response correlation with IDs
  - Request timeout handling
  - Message routing

- **Security**
  - JWT-based authentication with session management
  - Token-based authentication with configurable expiration
  - Session tracking and management
  - IP-based rate limiting
  - Origin validation
  - Role-based authorization
  - Connection limits per IP

- **Scalability**
  - Load balancer with multiple distribution strategies
  - Node health monitoring
  - Dynamic node management
  - Connection statistics tracking

- **Reliability**
  - Circuit breaker pattern
  - Failure detection and isolation
  - Automatic recovery mechanisms
  - State management (CLOSED, OPEN, HALF-OPEN)
  - Fallback operations

- **Performance Monitoring**
  - Prometheus metrics integration
  - Grafana dashboards
  - Latency tracking and histograms
  - Error rate monitoring
  - Real-time metrics collection

- **Message Queue System**
  - Priority-based queuing
  - Backpressure handling
  - Retry mechanisms
  - Concurrent processing
  - Queue monitoring

- **Clustering Support**
  - Redis-based coordination
  - Node discovery
  - Health monitoring
  - Load distribution
  - Cluster-wide broadcasting

## Quick Start

Get started with the Pet Store API in minutes:

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/yourusername/PetStore-TypeScript-MCP-WS.git
   cd PetStore-TypeScript-MCP-WS
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. For detailed API documentation, visit the interactive [Swagger UI](/documentation) after starting the server. The API documentation is also available as [OpenAPI 3.1 specification](API_DESCRIPTION.md).

### Key Endpoints

- **Authentication**: `POST /api/auth/login`
- **Users**: `GET /api/users`
- **Pets**: `GET /api/pets`
- **Store**: `GET /api/orders`

For WebSocket documentation, see the [API Description](API_DESCRIPTION.md#websocket-events).

## Architecture

For a detailed overview of the system architecture, components, and design decisions, see the [Architecture Documentation](ARCHITECTURE.md).

Key aspects of the architecture include:

- **Modular Design**: Plugin-based architecture for extensibility
- **Real-time Updates**: WebSocket support for live data
- **Scalability**: Designed for horizontal scaling
- **Security**: JWT authentication, rate limiting, and input validation
- **Monitoring**: Built-in metrics and logging

### High-Level Architecture

```mermaid
graph TD
    A[Client] -->|HTTP/WebSocket| B[API Gateway]
    B --> C[Authentication]
    B --> D[Request Validation]
    B --> E[Rate Limiting]
    C -->|JWT| F[Controllers]
    D --> F
    E --> F
    F --> G[Services]
    G --> H[Models]
    G --> I[Redis Cache]
    G --> J[Database]
    K[WebSocket Manager] -->|Pub/Sub| L[Connected Clients]
    M[Monitoring] -->|Metrics| N[Prometheus]
    N --> O[Grafana Dashboard]
```

## Prerequisites

- Node.js >= 18
- Redis (for session storage and pub/sub)
- Docker and Docker Compose (for containerized deployment)
- npm >= 9 or yarn >= 1.22
- TypeScript 5.1.x (recommended)

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1h

# Redis Configuration (for sessions and pub/sub)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS Configuration
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100  # Max requests per window

# Monitoring
METRICS_ENABLED=true
METRICS_PATH=/metrics

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Configuration Files

- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Jest test configuration
- `docker-compose.yml` - Docker Compose configuration for local development
- `Dockerfile` - Production Dockerfile
- `src/config/` - Application configuration files

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/PetStore-TypeScript-MCP-WS.git
   cd PetStore-TypeScript-MCP-WS
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start Redis (required for sessions and pub/sub):
   ```bash
   docker-compose up -d redis
   ```

5. Build and start the application:
   ```bash
   npm run build
   npm start
   ```

> **Note:** For development with hot-reloading, use `npm run dev` instead of `npm start`.

## Development

### Prerequisites
- Node.js >= 18
- npm >= 9
- TypeScript 5.1.x (recommended for best compatibility)

### Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env as needed
   ```

3. **Start the development server** with hot reloading:
   ```bash
   npm run dev
   ```
   The server will be available at `http://localhost:3000`

4. **Access API documentation** at `http://localhost:3000/documentation`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run docker:build` - Build Docker image
- `npm run docker:up` - Start containers
- `npm run docker:down` - Stop containers

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run linting:
```bash
npm run lint
```

Format code:
```bash
npm run format
```

Build the project:
```bash
npm run build
```

### Testing

The project includes comprehensive test coverage including:
- Unit tests for controllers and utilities
- Integration tests for API endpoints
- WebSocket communication tests
- Error handling and edge cases

To run specific test files:
```bash
# Run controller tests
npm test -- src/__tests__/controllers/

# Run integration tests
npm test -- src/__tests__/integration/
```

> **Tip:** All npm scripts are ESM/TypeScript compatible. Use `.ts` extensions in imports for all source and test files.

## Deployment

### Docker Compose (Development)

1. Start all services:
   ```bash
   docker-compose up -d
   ```

2. Access the application:
   - API: http://localhost:3000
   - API Docs: http://localhost:3000/documentation
   - Grafana: http://localhost:3001
   - Prometheus: http://localhost:9090

### Production Deployment

1. Build the Docker image:
   ```bash
   docker build -t petstore-api .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name petstore-api \
     -p 3000:3000 \
     --env-file .env \
     --restart unless-stopped \
     petstore-api
   ```

### Kubernetes

Example deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: petstore-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: petstore-api
  template:
    metadata:
      labels:
        app: petstore-api
    spec:
      containers:
      - name: petstore-api
        image: petstore-api:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: petstore-secrets
        resources:
          limits:
            cpu: "1"
            memory: "512Mi"
          requests:
            cpu: "0.5"
            memory: "256Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Ensure ports 3000 (API), 3001 (Grafana), and 9090 (Prometheus) are available

2. **Redis Connection Issues**
   - Check if Redis is running: `docker ps | grep redis`
   - Verify Redis connection string in `.env`

3. **JWT Errors**
   - Ensure `JWT_SECRET` is set and consistent across services
   - Check token expiration

4. **TypeScript Errors**
   - Use TypeScript 5.1.x
   - Run `npm install` to ensure all types are installed

### Debugging

1. **Enable Debug Logging**
   ```bash
   DEBUG=* npm run dev
   ```

2. **Check Container Logs**
   ```bash
   docker-compose logs -f
   ```

3. **Inspect Running Containers**
   ```bash
   docker ps
   docker exec -it <container_id> sh
   ```

## Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a pull request

### Development Workflow

1. Create an issue describing the bug or feature
2. Assign the issue to yourself
3. Create a branch from `main`
4. Write tests for your changes
5. Ensure all tests pass
6. Update documentation
7. Submit a pull request

### Code Style

- Follow [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- Use Prettier for code formatting
- Run `npm run lint` before committing
- Write meaningful commit messages

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Roadmap

### Upcoming Features

- [ ] Refresh tokens
- [ ] Two-factor authentication
- [ ] API versioning
- [ ] WebSocket compression
- [ ] Rate limiting per endpoint
- [ ] Advanced search with Elasticsearch
- [ ] File upload service
- [ ] Email notifications
- [ ] Webhook support

### In Progress

- [x] Basic authentication
- [x] WebSocket support
- [x] Metrics and monitoring
- [x] Docker support

### Completed

- [x] Project setup
- [x] CI/CD pipeline
- [x] Basic API endpoints
- [x] Testing framework

---

<p align="center">
  <a href="https://github.com/markbsigler/PetStore-TypeScript-MCP-WS">GitHub</a> •
  <a href="https://github.com/markbsigler/PetStore-TypeScript-MCP-WS/issues">Issues</a> •
  <a href="https://github.com/markbsigler/PetStore-TypeScript-MCP-WS/pulls">Pull Requests</a>
</p>

## API Documentation

### Available Endpoints

#### Pet Endpoints
- `POST /pets` - Create a new pet
- `GET /pets/:id` - Get pet by ID
- `PUT /pets/:id` - Update a pet
- `DELETE /pets/:id` - Delete a pet
- `GET /pets/findByStatus` - Find pets by status
- `POST /pets/:id/uploadImage` - Upload an image for a pet

#### Store Endpoints
- `POST /store/order` - Place an order
- `GET /store/order/:orderId` - Get order by ID
- `DELETE /store/order/:orderId` - Delete an order
- `GET /store/inventory` - Get store inventory

#### User Endpoints
- `POST /api/v1/users` - Create a new user (no authentication required)
  ```json
  {
    "username": "testuser",
    "password": "password123",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "phone": "123-456-7890",
    "userStatus": 1
  }
  ```

- `GET /api/v1/users/:username` - Get user by username (requires authentication)
- `PUT /api/v1/users/:username` - Update user (requires authentication)
- `DELETE /api/v1/users/:username` - Delete user (requires authentication)
- `GET /api/v1/users/login` - Logs user into the system
  ```
  GET /api/v1/users/login?username=testuser&password=password123
  ```
  Returns:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAfter": "2025-06-03T23:32:16.102Z"
  }
  ```

- `GET /api/v1/users/logout` - Logs out current logged-in user session (requires authentication)
  ```
  GET /api/v1/users/logout
  Authorization: Bearer <token>
  ```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication with session management. Here's how to use it:

### 1. Register a New User

```http
POST /api/v1/users
Content-Type: application/json

{
  "username": "testuser",
  "password": "securePassword123!",
  "email": "test@example.com",
  "firstName": "Test",
  "lastName": "User",
  "phone": "123-456-7890",
  "userStatus": 1
}
```

### 2. Log In to Get a JWT Token

```http
GET /api/v1/users/login?username=testuser&password=securePassword123!
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAfter": "2025-06-03T23:32:16.102Z"
}
```

### 3. Use the Token for Authenticated Requests

Include the token in the `Authorization` header:

```http
GET /api/v1/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 4. Log Out (Invalidate Session)

```http
GET /api/v1/users/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Token Management

- **Expiration**: Tokens are valid for 1 hour by default (configurable via `JWT_EXPIRES_IN`)
- **Session Invalidation**: Tokens are invalidated on the server side after logout
- **Refresh Tokens**: Not currently implemented (see Roadmap)
- **Rate Limiting**: Authentication endpoints are rate-limited to prevent brute force attacks

### Security Best Practices

1. Always use HTTPS in production
2. Store tokens securely (httpOnly cookies recommended for web apps)
3. Implement proper password policies
4. Use strong JWT secrets
5. Rotate secrets regularly
6. Implement IP-based rate limiting
7. Monitor failed login attempts

## Monitoring and Metrics

The application provides comprehensive monitoring capabilities through Prometheus and Grafana.

### Built-in Monitoring Endpoints

#### 1. Prometheus Metrics
- **Endpoint**: `GET /metrics`
- **Content-Type**: `text/plain; version=0.0.4; charset=utf-8`
- **Authentication**: None

**Example Response:**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200",path="/api/v1/pets"} 42
```

#### 2. Health Check
- **Endpoint**: `GET /health`
- **Response**:
  ```json
  {
    "status": "ok",
    "timestamp": "2025-06-03T18:35:27.000Z",
    "uptime": 123.45,
    "services": {
      "redis": "connected",
      "database": "connected"
    }
  }
  ```

### Grafana Dashboards

Grafana is pre-configured with the following dashboards:

1. **API Overview**
   - Request rates and response times
   - Error rates by endpoint
   - Latency percentiles

2. **System Health**
   - CPU and memory usage
   - Event loop lag
   - Garbage collection metrics

3. **Authentication**
   - Login attempts and failures
   - Active sessions
   - Token usage

**Accessing Grafana:**
- URL: `http://localhost:3001` (when running with Docker Compose)
- Default credentials:
  - Username: `admin`
  - Password: `admin`

### Setting Up Production Monitoring

1. **Prometheus Configuration**
   ```yaml
   scrape_configs:
     - job_name: 'petstore-api'
       metrics_path: '/metrics'
       static_configs:
         - targets: ['localhost:3000']
   ```

2. **Alerting Rules**
   - High error rate (>5% for 5 minutes)
   - High CPU usage (>80% for 5 minutes)
   - High memory usage (>90% for 5 minutes)
   - Service down (health check failing)

3. **Logging**
   - Structured JSON logs
   - Correlation IDs for request tracing
   - Log levels: error, warn, info, debug, trace

### Health Checks

A health check endpoint is available at `/health` that reports the status of the application and its dependencies.

## Monitoring & Metrics

- The `/metrics` endpoint exposes Prometheus-compatible metrics, including Node.js process, WebSocket, and API health metrics.
- **Custom metrics include:**
  - WebSocket connections (current/total, by status)
  - WebSocket messages (by type/status), errors, and latency histograms
  - Rate limiting and authentication attempts (with labels)
  - Circuit breaker state, load balancer nodes/latency, queue size/processing time
  - System metrics: CPU load (1m/5m/15m), memory usage (heap, RSS, external)
- **Extending metrics:**
  1. Define new metrics in `src/monitoring/metrics.ts` and register with the shared registry.
  2. Add/extend tests in `src/__tests__/monitoring/metrics.test.ts` to cover all label combinations, buckets, and error/edge cases.
  3. Ensure helper functions and error handling are tested (see file-level doc comment in `metrics.test.ts`).
- **Testing:**
  - All metrics logic is covered by robust unit tests, including error/edge cases and resource cleanup.
  - To run metrics tests: `npm test -- src/__tests__/monitoring/metrics.test.ts --coverage`
- **Production monitoring:**
  - Prometheus scrapes `/metrics` for dashboards and alerting (see `grafana/dashboards/` for examples).
  - System metric collection is resilient to restricted environments (errors are caught and ignored).

### Metrics Flow Diagram

```mermaid
graph TD
    A[WebSocket Events / System Events] -->|emit| B((Metrics Helpers))
    B -->|registerMetrics| C[Prometheus Registry]
    C -->|expose| D[metrics Endpoint]
    D -->|scrape| E[Prometheus Server]
    E -->|query| F[Grafana Dashboards]
    C -->|mock| G[Unit Tests]
    B -->|logError| H[Error Logging]
    
    style B fill:#f9f,stroke:#333,stroke-width:2px
    style C fill:#bbf,stroke:#333,stroke-width:2px
```

This diagram shows how metrics are updated in response to WebSocket and system events, registered with the Prometheus registry, and exposed via the `/metrics` endpoint for Prometheus and Grafana. Tests and error handling are integrated into the flow.

## Testing

The test suite is built with Jest and ts-jest, with full TypeScript and ESM support.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/__tests__/integration/pet.routes.test.ts
```

### Test Coverage

Coverage reports are generated in the `coverage/` directory. The minimum coverage thresholds are:

- Statements: 90%
- Branches: 85%
- Functions: 90%
- Lines: 90%

### Testing Strategy

1. **Unit Tests**
   - Test individual functions and classes in isolation
   - Mock external dependencies
   - Located in `src/__tests__/unit/`

2. **Integration Tests**
   - Test API endpoints and WebSocket communication
   - Use a test database
   - Located in `src/__tests__/integration/`

3. **E2E Tests**
   - Test complete user flows
   - Use a real browser (Playwright)
   - Located in `e2e/`

### Testing Best Practices

- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- Keep tests independent and isolated
- Test edge cases and error conditions
- Use snapshots for complex objects
- Mock external services
- Clean up test data after each test

## Architecture

### System Overview

```mermaid
graph TB
    Client[Client WebSocket]
    LB[Load Balancer]
    WS[WebSocket Manager]
    CB[Circuit Breaker]
    MQ[Message Queue]
    Redis[(Redis)]
    Metrics[Metrics Collector]
    
    Client <-->|"1. Connect/Disconnect"| LB
    LB <-->|"2. Route Messages"| WS
    WS <-->|"3. Process Requests"| CB
    CB <-->|"4. Queue Operations"| MQ
    MQ <-->|"5. Persistent Storage"| Redis
    WS -->|"6. Emit Metrics"| Metrics
    CB -->|"7. Report State"| Metrics
    MQ -->|"8. Queue Stats"| Metrics
```

### Message Flow Sequence

```mermaid
sequenceDiagram
    participant C as Client
    participant WS as WebSocket Manager
    participant CB as Circuit Breaker
    participant MQ as Message Queue
    participant R as Redis

    C->>WS: 1. Connect
    WS->>C: 2. Connection Accepted
    C->>WS: 3. Send Request
    alt Request Valid
        WS->>CB: 4. Process Request
        CB->>MQ: 5. Queue Message
        MQ->>R: 6. Store Data
        R-->>MQ: 7. Data Stored
        MQ-->>CB: 8. Processing Complete
        CB-->>WS: 9. Response Ready
        WS-->>C: 10. Send Response
    else Request Invalid
        WS-->>C: 4. Error: Invalid Request
    end
```

### State Management

```mermaid
stateDiagram-v2
    [*] --> CLOSED
    CLOSED --> OPEN: Failure Threshold Exceeded
    OPEN --> HALF_OPEN: Timeout Period
    HALF_OPEN --> CLOSED: Success
    HALF_OPEN --> OPEN: Failure
```

## WebSocket API Documentation

### Message Format

All WebSocket messages follow a standardized format with type-safe schemas using Zod:

#### Base Message Structure
```typescript
{
  type: 'request' | 'response' | 'notification',
  correlationId: string, // UUID
  timestamp: number
}
```

#### Request Messages
```typescript
{
  type: 'request',
  correlationId: string,
  timestamp: number,
  action: string,
  payload: unknown
}
```

#### Response Messages
```typescript
{
  type: 'response',
  correlationId: string,
  timestamp: number,
  status: 'success' | 'error',
  payload: unknown
}
```

#### Notification Messages
```typescript
{
  type: 'notification',
  correlationId: string,
  timestamp: number,
  event: string,
  payload: unknown
}
```

### Common Message Flows

#### Authentication Flow
1. Connect to WebSocket server
2. Send authentication request:
```typescript
{
  type: 'request',
  correlationId: '123e4567-e89b-12d3-a456-426614174000',
  timestamp: 1634567890123,
  action: 'authenticate',
  payload: {
    token: 'your-jwt-token'
  }
}
```
3. Receive authentication response:
```typescript
{
  type: 'response',
  correlationId: '123e4567-e89b-12d3-a456-426614174000',
  timestamp: 1634567890124,
  status: 'success',
  payload: {
    userId: '12345',
    permissions: ['read', 'write']
  }
}
```

#### Error Handling
The system includes built-in error types:
- `WebSocketTimeoutError`: Thrown when a request exceeds the timeout period
- `WebSocketValidationError`: Thrown when message validation fails

Example error response:
```typescript
{
  type: 'response',
  correlationId: '123e4567-e89b-12d3-a456-426614174000',
  timestamp: 1634567890125,
  status: 'error',
  payload: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid message format'
  }
}
```

### WebSocket Events

| Event | Description | Payload Example |
|-------|-------------|----------------|
| `connect` | Client connection established | `{ clientId: string }` |
| `disconnect` | Client disconnected | `{ reason: string }` |
| `error` | Error occurred | `{ code: string, message: string }` |
| `ping` | Health check | `{ timestamp: number }` |

### Rate Limiting

- Maximum connections per IP: 10
- Message rate limit: 100 messages per minute
- Burst allowance: 20 messages

### Best Practices

1. **Connection Management**
   - Implement exponential backoff for reconnection attempts
   - Handle connection timeouts gracefully
   - Monitor connection health with ping/pong

2. **Message Handling**
   - Always include a `correlationId` for request-response pairs
   - Validate message schemas before processing
   - Implement timeout handling for requests

3. **Error Handling**
   - Log all errors with appropriate context
   - Implement proper error recovery mechanisms
   - Use appropriate error types

## API Documentation

### WebSocket Events

-

## Security

### Authentication and Authorization

```mermaid
sequenceDiagram
    participant C as Client
    participant WS as WebSocket Server
    participant Auth as Auth Service
    participant Redis as Redis Store

    C->>WS: 1. Initial Connection
    WS->>C: 2. Connection Accepted
    C->>WS: 3. Auth Request (JWT)
    WS->>Auth: 4. Validate Token
    Auth->>Redis: 5. Check Token Blacklist
    Redis-->>Auth: 6. Token Status
    Auth-->>WS: 7. Validation Result
    
    alt Token Valid
        WS->>Redis: 8a. Store Session
        WS->>C: 8b. Auth Success
        loop Token Refresh
            C->>WS: 9. Refresh Token (before expiry)
            WS->>Auth: 10. Validate Refresh Token
            Auth-->>WS: 11. New Access Token
            WS->>C: 12. New Token
        end
    else Token Invalid
        WS->>C: 8c. Auth Failed
        WS->>C: 8d. Close Connection
    end
```

### Security Features

#### Token-Based Authentication
- **JWT Token Structure**
  ```typescript
  {
    header: {
      alg: 'RS256',
      typ: 'JWT'
    },
    payload: {
      sub: string,      // User ID
      exp: number,      // Expiration timestamp
      iat: number,      // Issued at timestamp
      roles: string[],  // User roles
      perms: string[]   // User permissions
    }
  }
  ```
- Token rotation every 24 hours
- Automatic token refresh mechanism
- Token blacklisting for revoked access

#### Rate Limiting Implementation
```mermaid
graph TD
    A[Incoming Request] -->|"1. Extract Key (IP/User)"| B{Rate Limit Check}
    B -->|"2. Under Limit"| C[Process Request]
    B -->|"3. Over Limit"| D[Rate Limited]
    D -->|"4. 429 Response"| E[Client]
    
    subgraph Rate Limit Store
    F[(Redis)]
    end
    
    B ---|"5. Increment Counter"| F
    B ---|"6. Get Counter"| F
    
    subgraph Rate Limit Config
    G[Window: 60s]
    H[Max: 100 req]
    I[Burst: 20]
    end
```

- **Rate Limit Configuration**
  ```typescript
  interface RateLimitConfig {
    windowMs: 60000,           // 1 minute window
    maxRequests: 100,         // requests per window
    burstLimit: 20,          // burst allowance
    ipWhitelist: string[],   // exempt IPs
    errorCode: 429,         // too many requests
    keyPrefix: 'rl:'       // Redis key prefix
  }
  ```

#### Connection Security
- TLS/WSS required for all connections
- Origin validation with configurable allowlist
- IP-based connection limiting
- Automatic connection termination for inactive clients

#### Data Validation
- Schema validation using Zod for all messages
- Payload size limits
- Input sanitization
- Type safety enforcement

### WebSocket Connection Lifecycle

```mermaid
stateDiagram-v2
    [*] --> CONNECTING
    CONNECTING --> AUTHENTICATING: Connection Established
    CONNECTING --> [*]: Connection Failed
    AUTHENTICATING --> AUTHENTICATED: Valid Token
    AUTHENTICATING --> CLOSED: Invalid Token
    AUTHENTICATED --> ACTIVE: Session Created
    ACTIVE --> INACTIVE: Idle Timeout
    INACTIVE --> ACTIVE: Activity Detected
    INACTIVE --> CLOSED: Max Idle Exceeded
    ACTIVE --> RECONNECTING: Connection Lost
    RECONNECTING --> ACTIVE: Reconnect Success
    RECONNECTING --> CLOSED: Reconnect Failed
    ACTIVE --> CLOSED: Client Disconnect/Error
    CLOSED --> [*]
```

### WebSocket Message Handling

#### Message Queue Priority Levels
```typescript
enum MessagePriority {
  CRITICAL = 0,   // System messages, authentication
  HIGH = 1,       // User actions, transactions
  NORMAL = 2,     // Regular updates, queries
  LOW = 3,        // Bulk operations, analytics
  BACKGROUND = 4  // Maintenance tasks
}
```

#### Backpressure Handling
```mermaid
graph TD
    A[Client Message] -->|1. Enqueue| B{Queue Check}
    B -->|2. Below Threshold| C[Process Message]
    B -->|3. Above Threshold| D[Apply Backpressure]
    D -->|4a. Notify| E[Client Slow Down]
    D -->|4b. Drop| F[Drop Message]
    D -->|4c. Backoff| G[Delay Processing]
    
    subgraph Queue Metrics
    H[Current Size: X/Y]
    I[Processing Rate: Z/s]
    J[Drop Rate: W/s]
    K[Avg. Wait Time: T ms]
    end
    
    C -->|Update| H
    C -->|Update| I
    F -->|Update| J
    C -->|Update| K
    
    style D fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
```

### Security Best Practices

1. **Connection Management**
   - Implement connection pooling
   - Set appropriate timeouts
   - Monitor connection states
   - Handle reconnection with exponential backoff

2. **Message Security**
   - Encrypt sensitive data
   - Validate message integrity
   - Implement message acknowledgment
   - Handle message replay protection

3. **Error Handling and Logging**
   - Log security events
   - Monitor failed authentication attempts
   - Track rate limit violations
   - Alert on suspicious patterns

4. **Session Management**
   ```typescript
   interface SessionConfig {
     maxAge: 3600000,        // 1 hour
     inactiveTimeout: 300000, // 5 minutes
     renewThreshold: 600000,  // 10 minutes
     cleanupInterval: 60000   // 1 minute
   }
   ```

### Monitoring and Alerts

#### Security Metrics
| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `auth_failures` | Failed authentication attempts | >10/minute |
| `rate_limits` | Rate limit violations | >100/hour |
| `invalid_messages` | Message validation failures | >50/minute |
| `connection_drops` | Abnormal connection terminations | >20/minute |

#### Health Checks
```typescript
interface HealthCheck {
  redis: {
    status: 'up' | 'down',
    latency: number
  },
  messageQueue: {
    size: number,
    processRate: number
  },
  connections: {
    active: number,
    authenticated: number
  }
}
```

## Diagram Validation

A script is provided to automatically validate all Mermaid diagrams in the README and documentation files. This ensures diagrams are syntactically correct and renderable in CI and documentation tools.

### How to Run Diagram Validation

1. **Install mermaid-cli (mmdc):**
   ```bash
   npm install -g @mermaid-js/mermaid-cli
   ```
2. **Run the validation script:**
   ```bash
   npx mmdc -i README.md -o /tmp/diagram.svg --quiet || (echo "Mermaid diagram validation failed" && exit 1)
   ```
   - This will parse all Mermaid code blocks in `README.md` and attempt to render them. If any diagram is invalid, the command will fail.
   - You can adapt this for other markdown files as needed.

3. **CI Integration:**
   - Add the above command to your CI pipeline (e.g., GitHub Actions, GitLab CI) to ensure all Mermaid diagrams are always valid.

### Example GitHub Actions Step
```yaml
- name: Validate Mermaid diagrams
  run: |
    npm install -g @mermaid-js/mermaid-cli
    npx mmdc -i README.md -o /tmp/diagram.svg --quiet
```

> **Tip:** For multi-file validation, use a glob or loop over all markdown files.

## Automated Endpoint Health Checks

A script is provided to automatically build, start, and check the health and key endpoints of the server—including REST and WebSocket endpoints. This ensures that `/health`, `/metrics`, `/`, `/pets`, and WebSocket connect/auth/ping are always tested for availability and correctness.

### How to Run Endpoint Health Checks

1. **Run the script:**
   ```bash
   ./health-and-endpoints-check.sh
   ```
   - This will build the project, start the server in the background (using the correct ESM/TypeScript loader for Node.js), check all key REST endpoints, perform WebSocket connect/auth/ping checks (using `wscat`), print their responses, and then stop the server.
   - **Note:** If you encounter a TypeScript/ESM loader error, ensure you are using Node.js >= 18 and that the script invokes the server with:
     ```bash
     node --loader ts-node/esm src/index.ts
     ```
     If you are using zsh, ensure the command is not split or quoted incorrectly. See comments in the script for details.

2. **CI Integration:**
   - Add the following step to your GitHub Actions workflow after the build step:

```yaml
- name: Automated Endpoint Health Checks
  run: |
    chmod +x health-and-endpoints-check.sh
    ./health-and-endpoints-check.sh
```

> **Tip:**
> - You can add or modify REST or WebSocket endpoints to check by editing the `health-and-endpoints-check.sh` script.
> - If you encounter permission or port issues, ensure no other process is using the server port and that the script has execute permissions (`chmod +x`).
> - For ESM/TypeScript loader issues, see the troubleshooting note above and ensure all dependencies are installed.
