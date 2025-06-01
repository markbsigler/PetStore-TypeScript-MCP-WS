import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { TestContext, setupTestEnvironment, teardownTestEnvironment, clearRedis, generateTestPet } from '../setup.js';
import { Pet } from '../../models/Pet.js';
import { type PetStatus } from '../../models/types.js';
import FormData from 'form-data';

describe('Pet Endpoints', () => {
  let context: TestContext;
  let testPet: Pet;

  beforeAll(async () => {
    context = await setupTestEnvironment();
  });

  beforeEach(async () => {
    await clearRedis(context.app);
    testPet = {
      ...generateTestPet(),
      status: 'available' as PetStatus,
    };
  });

  afterAll(async () => {
    await teardownTestEnvironment(context);
  });

  describe('POST /pets', () => {
    test('should create a new pet', async () => {
      const response = await context.app.inject({
        method: 'POST',
        url: '/pets',
        payload: testPet,
      });

      expect(response.statusCode).toBe(201);
      const createdPet = JSON.parse(response.payload);
      expect(createdPet).toMatchObject({
        ...testPet,
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test('should validate required fields', async () => {
      const invalidPet = {
        status: 'available',
      };

      const response = await context.app.inject({
        method: 'POST',
        url: '/pets',
        payload: invalidPet,
      });

      expect(response.statusCode).toBe(400);
      const error = JSON.parse(response.payload);
      expect(error.message).toContain('Validation failed');
    });
  });

  describe('GET /pets', () => {
    test('should list all pets', async () => {
      // Create test pets
      await context.app.inject({
        method: 'POST',
        url: '/pets',
        payload: testPet,
      });

      const response = await context.app.inject({
        method: 'GET',
        url: '/pets',
      });

      expect(response.statusCode).toBe(200);
      const pets = JSON.parse(response.payload);
      expect(Array.isArray(pets)).toBe(true);
      expect(pets.length).toBeGreaterThan(0);
      expect(pets[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        status: expect.any(String),
      });
    });

    test('should filter pets by status', async () => {
      // Create pets with different statuses
      const availablePet = { ...testPet, status: 'available' as PetStatus };
      const soldPet = { ...testPet, status: 'sold' as PetStatus };
      
      await context.app.inject({
        method: 'POST',
        url: '/pets',
        payload: availablePet,
      });
      
      await context.app.inject({
        method: 'POST',
        url: '/pets',
        payload: soldPet,
      });

      const response = await context.app.inject({
        method: 'GET',
        url: '/pets?status=available',
      });

      expect(response.statusCode).toBe(200);
      const pets = JSON.parse(response.payload);
      expect(Array.isArray(pets)).toBe(true);
      expect(pets.every((pet: { status: string }) => pet.status === 'available')).toBe(true);
    });
  });

  describe('GET /pets/{id}', () => {
    test('should get a pet by ID', async () => {
      // Create a test pet
      const createResponse = await context.app.inject({
        method: 'POST',
        url: '/pets',
        payload: testPet,
      });
      const { id } = JSON.parse(createResponse.payload);

      const response = await context.app.inject({
        method: 'GET',
        url: `/pets/${id}`,
      });

      expect(response.statusCode).toBe(200);
      const pet = JSON.parse(response.payload);
      expect(pet).toMatchObject({
        ...testPet,
        id,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test('should return 404 for non-existent pet', async () => {
      const response = await context.app.inject({
        method: 'GET',
        url: '/pets/non-existent-id',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /pets/{id}', () => {
    test('should update an existing pet', async () => {
      // Create a test pet
      const createResponse = await context.app.inject({
        method: 'POST',
        url: '/pets',
        payload: testPet,
      });
      const { id } = JSON.parse(createResponse.payload);

      const updatedPet = {
        ...testPet,
        name: 'Updated Name',
        status: 'sold' as PetStatus,
      };

      const response = await context.app.inject({
        method: 'PUT',
        url: `/pets/${id}`,
        payload: updatedPet,
      });

      expect(response.statusCode).toBe(200);
      const pet = JSON.parse(response.payload);
      expect(pet).toMatchObject({
        ...updatedPet,
        id,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test('should return 404 for updating non-existent pet', async () => {
      const response = await context.app.inject({
        method: 'PUT',
        url: '/pets/non-existent-id',
        payload: testPet,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /pets/{id}', () => {
    test('should delete an existing pet', async () => {
      // Create a test pet
      const createResponse = await context.app.inject({
        method: 'POST',
        url: '/pets',
        payload: testPet,
      });
      const { id } = JSON.parse(createResponse.payload);

      const response = await context.app.inject({
        method: 'DELETE',
        url: `/pets/${id}`,
      });

      expect(response.statusCode).toBe(204);

      // Verify pet is deleted
      const getResponse = await context.app.inject({
        method: 'GET',
        url: `/pets/${id}`,
      });
      expect(getResponse.statusCode).toBe(404);
    });

    test('should return 404 for deleting non-existent pet', async () => {
      const response = await context.app.inject({
        method: 'DELETE',
        url: '/pets/non-existent-id',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /pets/{id}/upload-image', () => {
    test('should upload an image for a pet', async () => {
      // Create a test pet
      const createResponse = await context.app.inject({
        method: 'POST',
        url: '/pets',
        payload: testPet,
      });
      const { id } = JSON.parse(createResponse.payload);

      const form = new FormData();
      const imageBuffer = Buffer.from('fake-image-data');
      form.append('file', imageBuffer, {
        filename: 'test-image.jpg',
        contentType: 'image/jpeg',
      });

      const response = await context.app.inject({
        method: 'POST',
        url: `/pets/${id}/upload-image`,
        payload: form,
        headers: form.getHeaders(),
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result).toMatchObject({
        message: expect.any(String),
        fileName: expect.any(String),
      });
    });

    test('should return 404 for uploading to non-existent pet', async () => {
      const form = new FormData();
      const imageBuffer = Buffer.from('fake-image-data');
      form.append('file', imageBuffer, {
        filename: 'test-image.jpg',
        contentType: 'image/jpeg',
      });

      const response = await context.app.inject({
        method: 'POST',
        url: '/pets/non-existent-id/upload-image',
        payload: form,
        headers: form.getHeaders(),
      });

      expect(response.statusCode).toBe(404);
    });
  });
});