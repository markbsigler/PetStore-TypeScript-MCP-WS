# PetStore API

A modern, WebSocket-based implementation of the PetStore API built with TypeScript and Fastify. This API provides a complete set of endpoints for managing a pet store, including user authentication, pet management, and order processing.

## Features

- **RESTful API** with WebSocket support
- **JWT Authentication** with role-based access control
- **Real-time updates** via WebSockets
- **Comprehensive documentation** with OpenAPI 3.1
- **High performance** with Redis caching
- **Containerized** with Docker
- **Scalable** architecture

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate and get JWT token
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Invalidate token

### Users
- `GET /api/users` - List all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Pets
- `GET /api/pets` - List all pets with filtering
- `POST /api/pets` - Add a new pet
- `GET /api/pets/:id` - Get pet by ID
- `PUT /api/pets/:id` - Update pet
- `DELETE /api/pets/:id` - Delete pet

### Store
- `GET /api/orders` - List all orders
- `POST /api/orders` - Create a new order
- `GET /api/orders/:id` - Get order by ID
- `DELETE /api/orders/:id` - Cancel order

## WebSocket Events

### Connection
- `connect` - Client connects
- `disconnect` - Client disconnects

### Authentication
- `auth:login` - Authenticate WebSocket connection
- `auth:logout` - Deauthenticate WebSocket connection

### Real-time Updates
- `pet:created` - New pet added
- `pet:updated` - Pet details updated
- `pet:deleted` - Pet removed
- `order:created` - New order placed
- `order:updated` - Order status updated
- `order:deleted` - Order cancelled

## Rate Limiting

- **Unauthenticated**: 100 requests per hour
- **Authenticated**: 1000 requests per hour
- **WebSocket Connections**: 10 per IP address

## Error Handling

All error responses follow the same format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid input data"
}
```

## Authentication

All endpoints except `/api/auth/*` require authentication. Include the JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

## WebSocket Authentication

To authenticate WebSocket connections, send an `auth` message with the JWT token:

```json
{
  "event": "auth:login",
  "data": {
    "token": "<jwt-token>"
  }
}
```

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Access API documentation at `http://localhost:3000/documentation`

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Deployment

### Prerequisites
- Node.js 18+
- Redis 6+
- PostgreSQL 13+

### Environment Variables

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:password@localhost:5432/petstore
```

### Docker

```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

MIT
