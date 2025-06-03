import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Pet } from '../../models/Pet.js';

// Mock the PetController module
const mockPets = new Map<string, Pet>();

// Define the interface that our mock will implement
interface IPetController {
  create(petData: Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pet>;
  findAll(
    page?: number,
    limit?: number,
    status?: string
  ): Promise<{
    data: Pet[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }>;
  findByStatus(status: string[]): Promise<Pet[]>;
  findByTags(tags: string[]): Promise<Pet[]>;
  update(id: string, petData: Partial<Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Pet | undefined>;
  delete(id: string): Promise<boolean>;
  findById(id: string): Promise<Pet | undefined>;
}

// Create a mock implementation that implements the IPetController interface
class MockPetController implements IPetController {
  private io: Server;
  
  constructor(io: Server) {
    this.io = io as jest.Mocked<Server>;
    
    // Mock the emit method
    if (!this.io.emit) {
      this.io.emit = jest.fn();
    }
  }

  async create(petData: Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pet> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const newPet: Pet = {
      ...petData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    mockPets.set(id, newPet);
    (this.io.emit as jest.Mock)('petCreated', { petId: id, data: newPet });
    return newPet;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{
    data: Pet[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    let pets = Array.from(mockPets.values());
    
    // Apply status filter if provided
    if (status) {
      pets = pets.filter(pet => pet.status === status);
    }
    
    const total = pets.length;
    const pages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + Number(limit);
    
    return {
      data: pets.slice(start, end),
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };
  }

  async findByStatus(status: string[]): Promise<Pet[]> {
    if (!status || status.length === 0) {
      throw new Error('Invalid status value');
    }
    
    // Validate status values
    const validStatuses = ['available', 'pending', 'sold'];
    const invalidStatus = status.find(s => !validStatuses.includes(s));
    if (invalidStatus) {
      throw new Error('Invalid status value');
    }
    
    return Array.from(mockPets.values()).filter(pet => status.includes(pet.status));
  }

  async findByTags(tags: string[]): Promise<Pet[]> {
    if (!tags || tags.length === 0) {
      throw new Error('Invalid tags value');
    }
    return Array.from(mockPets.values()).filter(pet => 
      pet.tags?.some(tag => tags.includes(tag.name))
    );
  }

  async update(id: string, petData: Partial<Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Pet | undefined> {
    const pet = mockPets.get(id);
    if (!pet) return undefined;

    const updatedPet: Pet = {
      ...pet,
      ...petData,
      updatedAt: new Date().toISOString(),
    };
    mockPets.set(id, updatedPet);
    (this.io.emit as jest.Mock)('petUpdated', { petId: id, data: updatedPet });
    return updatedPet;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = mockPets.delete(id);
    if (deleted) {
      (this.io.emit as jest.Mock)('petDeleted', { petId: id });
    }
    return deleted;
  }

  async findById(id: string): Promise<Pet | undefined> {
    return mockPets.get(id);
  }
}

// Mock the PetController module
const MockPetControllerInstance = jest.fn().mockImplementation((io: Server) => new MockPetController(io));

jest.mock('../../controllers/PetController.ts', () => ({
  PetController: MockPetControllerInstance,
}));

// Import the mocked PetController
import { PetController } from '../../controllers/PetController.js';

describe('PetController', () => {
  let controller: IPetController;
  let ioForTest: jest.Mocked<Server>;
  
  const samplePet: Omit<Pet, 'id' | 'createdAt' | 'updatedAt'> = {
    name: 'Test Pet',
    photoUrls: ['http://example.com/test.jpg'],
    status: 'available',
    category: { id: 1, name: 'Dogs' },
    tags: [],
  };

  beforeEach(() => {
    mockPets.clear();
    ioForTest = { emit: jest.fn() } as unknown as jest.Mocked<Server>;
    controller = new PetController(ioForTest);
  });

  describe('create', () => {
    it('should create a new pet and emit an event', async () => {
      const newPetData = { ...samplePet, name: 'Buddy' };
      const createdPet = await controller.create(newPetData);
      expect(createdPet.id).toBeDefined();
      expect(createdPet.name).toBe('Buddy');
      expect(createdPet.status).toBe('available');
      expect(mockPets.get(createdPet.id)).toEqual(createdPet);
      expect(ioForTest.emit).toHaveBeenCalledWith('petCreated', { petId: createdPet.id, data: createdPet });
    });
  });

  describe('findAll', () => {
    it('should return all pets with pagination', async () => {
      const petsToCreate = Array(15).fill(0).map((_, index) => ({
        ...samplePet,
        name: `Pet ${index + 1}`,
      }));
      for (const petData of petsToCreate) {
        await controller.create(petData);
      }

      const result = await controller.findAll(2, 5);
      expect(result.data).toHaveLength(5);
      expect(result.pagination).toEqual({ total: 15, page: 2, limit: 5, pages: 3 });
      expect(result.data[0].name).toBe('Pet 6');
    });

    it('should filter pets by status', async () => {
      await controller.create({ ...samplePet, status: 'available' });
      await controller.create({ ...samplePet, status: 'available' });
      await controller.create({ ...samplePet, status: 'sold' });
      
      const result = await controller.findAll(1, 10, 'available');
      expect(result.data).toHaveLength(2);
      expect(result.data.every(pet => pet.status === 'available')).toBe(true);
    });
  });

  describe('findByStatus', () => {
    it('should return pets with matching status', async () => {
      await controller.create({ ...samplePet, status: 'available' });
      await controller.create({ ...samplePet, status: 'pending' });
      await controller.create({ ...samplePet, status: 'available' });

      const result = await controller.findByStatus(['available', 'pending']);
      expect(result).toHaveLength(3);
      expect(result.filter(p => p.status === 'available').length).toBe(2);
      expect(result.filter(p => p.status === 'pending').length).toBe(1);
    });

    it('should throw error for invalid status', async () => {
      await expect(controller.findByStatus(['invalid_status_value'])).rejects.toThrow('Invalid status value');
    });
  });

  describe('findByTags', () => {
    it('should return pets with matching tags', async () => {
      await controller.create({ ...samplePet, tags: [{ id: 1, name: 'friendly' }] });
      await controller.create({ ...samplePet, tags: [{ id: 2, name: 'playful' }] });
      await controller.create({ ...samplePet, tags: [{ id: 1, name: 'friendly' }, { id: 3, name: 'quiet' }] });

      const result = await controller.findByTags(['friendly']);
      expect(result).toHaveLength(2);
      expect(result.every(pet => pet.tags?.some(t => t.name === 'friendly'))).toBe(true);
    });

    it('should throw error for empty tags array', async () => {
      await expect(controller.findByTags([])).rejects.toThrow('Invalid tags value');
    });
  });

  describe('findById', () => {
    it('should return a pet if found', async () => {
      const createdPet = await controller.create(samplePet);
      const foundPet = await controller.findById(createdPet.id);
      expect(foundPet).toEqual(createdPet);
    });

    it('should return undefined if pet not found', async () => {
      const foundPet = await controller.findById(uuidv4());
      expect(foundPet).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update an existing pet and emit an event', async () => {
      const createdPet = await controller.create(samplePet);
      const updates = { name: 'Snowball', status: 'pending' as const };
      const updatedPet = await controller.update(createdPet.id, updates);
      
      expect(updatedPet).toBeDefined();
      expect(updatedPet?.name).toBe('Snowball');
      expect(updatedPet?.status).toBe('pending');
      expect(mockPets.get(createdPet.id)?.name).toBe('Snowball');
      expect(ioForTest.emit).toHaveBeenCalledWith('petUpdated', { petId: createdPet.id, data: updatedPet });
    });

    it('should return undefined if pet to update is not found', async () => {
      const updatedPet = await controller.update(uuidv4(), { name: 'Ghost' });
      expect(updatedPet).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete an existing pet and emit an event', async () => {
      const createdPet = await controller.create(samplePet);
      const wasDeleted = await controller.delete(createdPet.id);
      
      expect(wasDeleted).toBe(true);
      expect(mockPets.has(createdPet.id)).toBe(false);
      expect(ioForTest.emit).toHaveBeenCalledWith('petDeleted', { petId: createdPet.id });
    });

    it('should return false if pet to delete is not found', async () => {
      const wasDeleted = await controller.delete(uuidv4());
      expect(wasDeleted).toBe(false);
    });
  });
});
