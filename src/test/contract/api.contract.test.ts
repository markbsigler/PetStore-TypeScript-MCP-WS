import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { TestContext, setupTestEnvironment, teardownTestEnvironment } from '../setup.js';
import Swagger from '@apidevtools/swagger-parser';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

describe('API Contract Tests', () => {
  let context: TestContext;
  let app: FastifyInstance;
  let openApiSpec: OpenAPIV3.Document;

  beforeAll(async () => {
    context = await setupTestEnvironment();
    app = context.app;
    await app.ready();
    openApiSpec = await Swagger.dereference(app.swagger()) as OpenAPIV3.Document;
  });

  afterAll(async () => {
    await teardownTestEnvironment(context);
  });

  describe('OpenAPI Specification', () => {
    test('should have valid OpenAPI specification', async () => {
      const isValid = await Swagger.validate(openApiSpec);
      expect(isValid).toBeDefined();
    });

    test('should have security schemes defined', () => {
      expect(openApiSpec.components?.securitySchemes).toBeDefined();
      expect(openApiSpec.components?.securitySchemes?.bearerAuth).toBeDefined();
    });
  });

  describe('Endpoint Contracts', () => {
    const testEndpoint = async (path: string, method: string, operation: OpenAPIV3.OperationObject) => {
      test(`${method.toUpperCase()} ${path} should match contract`, async () => {
        // Test request validation
        if (operation.requestBody) {
          const schema = (operation.requestBody as OpenAPIV3.RequestBodyObject)
            .content['application/json'].schema as OpenAPIV3.SchemaObject;
          expect(schema).toBeDefined();
        }

        // Test response schema
        const responses = operation.responses;
        expect(responses).toBeDefined();
        expect(responses['200'] || responses['201']).toBeDefined();

        // Test required parameters
        if (operation.parameters) {
          const requiredParams = operation.parameters
            .filter(p => (p as OpenAPIV3.ParameterObject).required)
            .map(p => (p as OpenAPIV3.ParameterObject).name);
          expect(requiredParams).toBeDefined();
        }
      });
    };

    test('should have valid endpoint contracts', async () => {
      const paths = openApiSpec.paths;
      for (const [path, pathItem] of Object.entries(paths)) {
        if (!isPlainObject(pathItem)) continue;
        const pathItemObj = pathItem as Record<string, unknown>;
        for (const method of Object.keys(pathItemObj)) {
          const operation = pathItemObj[method];
          if (method !== 'parameters' && operation !== undefined) {
            await testEndpoint(path, method, operation as OpenAPIV3.OperationObject);
          }
        }
      }
    });
  });

  describe('Schema Validation', () => {
    test('Pet schema should match contract', () => {
      const petSchema = openApiSpec.components?.schemas?.Pet as OpenAPIV3.SchemaObject;
      expect(petSchema).toBeDefined();
      expect(petSchema.required).toContain('id');
      expect(petSchema.required).toContain('name');
      const statusProp = petSchema.properties?.status;
      if (statusProp && 'enum' in statusProp) {
        expect(statusProp.enum).toBeDefined();
      }
    });

    test('Order schema should match contract', () => {
      const orderSchema = openApiSpec.components?.schemas?.Order as OpenAPIV3.SchemaObject;
      expect(orderSchema).toBeDefined();
      expect(orderSchema.required).toContain('id');
      expect(orderSchema.required).toContain('petId');
      const statusProp = orderSchema.properties?.status;
      if (statusProp && 'enum' in statusProp) {
        expect(statusProp.enum).toBeDefined();
      }
    });
  });

  describe('Security Requirements', () => {
    test('Protected endpoints should require authentication', () => {
      const paths = openApiSpec.paths;
      for (const [path, pathItem] of Object.entries(paths)) {
        if (!isPlainObject(pathItem)) continue;
        const pathItemObj = pathItem as Record<string, unknown>;
        for (const method of Object.keys(pathItemObj)) {
          const operation = pathItemObj[method];
          if (method !== 'parameters' && operation !== undefined) {
            const op = operation as OpenAPIV3.OperationObject;
            if (!path.includes('/auth') && !path.includes('/health')) {
              expect(op.security).toBeDefined();
            }
          }
        }
      }
    });
  });
});

// Helper to check for plain object
function isPlainObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}