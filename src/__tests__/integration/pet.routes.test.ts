import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastify from 'fastify';
import petRoutes from '../../../src/routes/pet.routes.ts';
import { v4 as uuidv4 } from 'uuid';
import multipart from '@fastify/multipart';
import { Pet } from '../../../src/models/Pet.ts';

// Helper to build the app for testing
async function buildApp(): Promise<FastifyInstance> {
  const app: FastifyInstance = fastify({
    logger: false // Disable logging for tests
  });
  
  // Mock WebSocket server
  const mockIo = {
    emit: jest.fn()
  };
  
  // Store the mock WebSocket server in the Fastify instance
  app.decorate('io', mockIo);
  
  // Register multipart plugin for file uploads
  await app.register(multipart);

  // Mock authentication for tests: POST, PUT, DELETE pet routes are protected
  app.decorate('authenticate', async (_request: FastifyRequest, _reply: FastifyReply) => {});

  // Register actual pet routes from src/routes/pet.routes.ts
  // In the test environment, we'll register without a prefix and adjust the test URLs accordingly
  await app.register(petRoutes);
  
  await app.ready();
  return app;
}

describe('Pet Routes Integration Tests', () => {
  let app: FastifyInstance;


  beforeAll(async () => {
    app = await buildApp();
    // No need to store HTTP server for cleanup with this setup
  });

  beforeEach(async () => {
    // Clear the pets map in PetController before each test.
    // This is tricky because PetController.ts uses a module-level const 'pets'.
    // One way is to modify PetController to export 'pets' or add a clear function.
    // For now, we'll proceed, acknowledging tests might share state or fail if not reset.
    // A proper solution would be to ensure PetController's state can be reset.
    // For example, if PetController had a static method: PetController.resetState();
    // Or if the 'pets' map was exported: (await import('../../controllers/PetController.ts')).pets.clear();
    // This is a placeholder for actual state clearing.
    // If the PetController was refactored to be class-based for its state management, this would be easier.
    
    // Hacky way: try to get PetController to clear its own state if it had a method
    // This won't work with the current PetController.ts structure directly.
    // const tempController = new PetController(new Server());
    // if (typeof (tempController as any).clearPets === 'function') {
    //   (tempController as any).clearPets();
    // }

    // For the purpose of this test, we will assume that the module-level 'pets' map
    // in PetController.ts is somehow cleared. In a real scenario, this needs a robust solution.
    // If not cleared, tests will interfere with each other.
    // We can try to delete all pets via API if a DELETE all endpoint existed, or delete one by one.
    // Get all pets and delete them
    const response = await app.inject({ method: 'GET', url: '/api/v1/pets' });
    if (response.statusCode === 200) {
        const pets = JSON.parse(response.payload);
        if (Array.isArray(pets)) {
            for (const pet of pets) {
                await app.inject({ method: 'DELETE', url: `/api/v1/pets/${pet.id}` });
            }
        }
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const samplePetPayload = {
    name: 'Integration Test Dog',
    photoUrls: ['http://example.com/it-dog.jpg'],
    status: 'available' as const,
    category: { id: 1, name: 'Dogs' },
    tags: [{ id: 1, name: 'testing' }],
  };

  describe('POST /pets', () => {
    it('should create a new pet and return it', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/pets',
        payload: samplePetPayload,
      });

      expect(response.statusCode).toBe(201);
      const pet = JSON.parse(response.payload) as Pet;
      expect(pet.id).toBeDefined();
      expect(pet.name).toBe(samplePetPayload.name);
      expect(pet.status).toBe(samplePetPayload.status);
      expect(pet.photoUrls).toEqual(samplePetPayload.photoUrls);
      expect(pet.createdAt).toBeDefined();
      expect(pet.updatedAt).toBeDefined();

      // Verify it can be fetched
      const fetchResponse = await app.inject({
        method: 'GET',
        url: `/pets/${pet.id}`,
      });
      expect(fetchResponse.statusCode).toBe(200);
      const fetchedPet = JSON.parse(fetchResponse.payload);
      expect(fetchedPet).toEqual(pet);
    });

    it('should return 400 for invalid pet data', async () => {
        const invalidPayload = { ...samplePetPayload, name: null }; // name is required
        const response = await app.inject({
          method: 'POST',
          url: '/pets',
          payload: invalidPayload,
        });
        // Add a console log here to inspect the response when the test fails
        if (response.statusCode !== 400) {
          console.error('Unexpected response in test (payload):', response.payload); // Log raw payload
          console.error('Unexpected response in test (full object):', response);
        }
        expect(response.statusCode).toBe(400); // Assuming Zod validation returns 400
      });
  });

  describe('GET /pets/:id', () => {
    it('should return a pet by its ID', async () => {
      // Create a pet first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/pets',
        payload: samplePetPayload,
      });
      const createdPet = JSON.parse(createResponse.payload) as Pet;

      const response = await app.inject({
        method: 'GET',
        url: `/pets/${createdPet.id}`,
      });

      expect(response.statusCode).toBe(200);
      const pet = JSON.parse(response.payload) as Pet;
      expect(pet.id).toBe(createdPet.id);
      expect(pet.name).toBe(samplePetPayload.name);
    });

    it('should return 404 if pet not found', async () => {
      const nonExistentId = uuidv4(); // Ensure uuidv4 is imported
      const response = await app.inject({
        method: 'GET',
        url: `/pets/${nonExistentId}`,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // TODO: Add tests for other Pet routes:
  // GET /pets (findAll with pagination and status filter)
  // PUT /pets/:id (update)
  // DELETE /pets/:id (delete)
  // GET /pet/findByStatus
  // GET /pet/findByTags
  // POST /pet/:petId/uploadImage (if multipart is correctly configured and file handling is testable via inject)
});
