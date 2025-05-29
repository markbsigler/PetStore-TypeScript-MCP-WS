# PetStore TypeScript Microservice with WebSockets

A professional TypeScript Node.js microservice implementing the Swagger Petstore API with WebSocket support using the Model Context Protocol (MCP) pattern.

## Features

- 🚀 **Modern TypeScript** - Written in TypeScript with strict mode enabled
- 🌐 **Fastify Framework** - High-performance web framework
- 📡 **WebSocket Support** - Real-time updates using Socket.IO
- 🔒 **OAuth 2.1 Authentication** - Secure authentication and authorization
- 📚 **OpenAPI Integration** - Auto-generated API client from Swagger spec
- 🎯 **MCP Pattern** - Model Context Protocol for clean architecture
- 🔍 **API Documentation** - Auto-generated Swagger documentation
- 🧪 **Testing** - Jest for unit and integration testing
- 🔧 **Development Tools** - ESLint, Prettier, and Git hooks
- 🐳 **Docker Support** - Multi-stage builds and Docker Compose

## Prerequisites

- Node.js 20.x or later
- npm 9.x or later
- Docker and Docker Compose (optional)

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
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

4. Generate API code:
   ```bash
   npm run generate:api
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## Docker Development

Start the application using Docker Compose:

```bash
docker-compose up
```

## Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Request handlers
├── generated/        # Auto-generated API code
├── middleware/       # Custom middleware
├── models/          # Data models
├── protocols/        # MCP protocol implementations
├── routes/          # API routes
├── services/        # Business logic
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── websocket/       # WebSocket handlers
```

## API Documentation

Once the server is running, access the Swagger documentation at:
- http://localhost:3000/api-docs

## WebSocket Events

The service supports the following WebSocket events:

- `pet:created` - New pet added
- `pet:updated` - Pet details updated
- `pet:deleted` - Pet removed
- `order:created` - New order placed
- `order:updated` - Order status updated
- `order:cancelled` - Order cancelled
- `inventory:updated` - Stock levels changed

## Testing

Run tests:
```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Development Tools

- **Linting**: `npm run lint`
- **Auto-fix linting**: `npm run lint:fix`
- **Format code**: `npm run format`

## Production Build

1. Build the application:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

## Docker Production Build

Build and run the production Docker image:

```bash
docker build -t petstore-typescript-mcp-ws .
docker run -p 3000:3000 petstore-typescript-mcp-ws
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
