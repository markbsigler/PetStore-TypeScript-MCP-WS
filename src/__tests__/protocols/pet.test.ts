import { describe, expect, test } from '@jest/globals';
import { PetProtocol, PetStatus } from '../../protocols/pet';
import { Context } from '../../protocols/base';

describe('PetProtocol', () => {
  let petProtocol: PetProtocol;
  let context: Context;

  beforeEach(() => {
    petProtocol = new PetProtocol();
    context = {
      userId: 'test-user',
      roles: ['admin'],
    };
  });

  const samplePet = {
    name: 'Fluffy',
    category: {
      id: 1,
      name: 'Cats',
    },
    photoUrls: ['https://example.com/fluffy.jpg'],
    tags: [
      {
        id: 1,
        name: 'cute',
      },
    ],
    status: PetStatus.AVAILABLE,
  };

  test('should create a new pet', async () => {
    const result = await petProtocol.create(samplePet, context);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      ...samplePet,
      id: expect.any(String),
    });
  });

  test('should read a pet by id', async () => {
    const createResult = await petProtocol.create(samplePet, context);
    const petId = createResult.data?.id;

    if (!petId) {
      throw new Error('Pet ID not found');
    }

    const result = await petProtocol.read(petId, context);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(createResult.data);
  });

  test('should update a pet', async () => {
    const createResult = await petProtocol.create(samplePet, context);
    const petId = createResult.data?.id;

    if (!petId) {
      throw new Error('Pet ID not found');
    }

    const updateData = {
      name: 'Fluffy Jr.',
      status: PetStatus.PENDING,
    };

    const result = await petProtocol.update(petId, updateData, context);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      ...createResult.data,
      ...updateData,
    });
  });

  test('should delete a pet', async () => {
    const createResult = await petProtocol.create(samplePet, context);
    const petId = createResult.data?.id;

    if (!petId) {
      throw new Error('Pet ID not found');
    }

    const deleteResult = await petProtocol.delete(petId, context);
    expect(deleteResult.success).toBe(true);

    const readResult = await petProtocol.read(petId, context);
    expect(readResult.success).toBe(false);
    expect(readResult.error).toBe('Pet not found');
  });

  test('should list pets with filters', async () => {
    await petProtocol.create(samplePet, context);
    await petProtocol.create(
      {
        ...samplePet,
        name: 'Max',
        status: PetStatus.SOLD,
      },
      context,
    );

    const result = await petProtocol.list({ status: PetStatus.AVAILABLE }, context);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]).toMatchObject({
      name: 'Fluffy',
      status: PetStatus.AVAILABLE,
    });
  });

  test('should find pets by status', async () => {
    await petProtocol.create(samplePet, context);
    await petProtocol.create(
      {
        ...samplePet,
        name: 'Max',
        status: PetStatus.SOLD,
      },
      context,
    );

    const pets = await petProtocol.findByStatus(PetStatus.SOLD, context);

    expect(pets).toHaveLength(1);
    expect(pets[0]).toMatchObject({
      name: 'Max',
      status: PetStatus.SOLD,
    });
  });

  test('should upload image to pet', async () => {
    const createResult = await petProtocol.create(samplePet, context);
    const petId = createResult.data?.id;

    if (!petId) {
      throw new Error('Pet ID not found');
    }

    const newImageUrl = 'https://example.com/fluffy2.jpg';
    const result = await petProtocol.uploadImage(petId, newImageUrl, context);

    expect(result.success).toBe(true);
    expect(result.data?.photoUrls).toContain(newImageUrl);
  });
}); 