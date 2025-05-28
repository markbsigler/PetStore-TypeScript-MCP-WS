import { BaseProtocol, Context, ModelResponse } from './base';
import { z } from 'zod';

// Pet status enum
export enum PetStatus {
  AVAILABLE = 'available',
  PENDING = 'pending',
  SOLD = 'sold',
}

// Pet schema using Zod
export const PetSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  category: z.object({
    id: z.number(),
    name: z.string(),
  }),
  photoUrls: z.array(z.string().url()),
  tags: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    }),
  ),
  status: z.nativeEnum(PetStatus),
});

export type Pet = z.infer<typeof PetSchema>;

export class PetProtocol extends BaseProtocol<Pet> {
  protected modelName = 'pet';

  // In-memory storage for demonstration
  private pets: Map<string, Pet> = new Map();

  protected async handleCreate(data: Pet, context: Context): Promise<Pet> {
    // Validate data using Zod schema
    const validatedData = PetSchema.parse(data);

    // Generate ID if not provided
    const id = validatedData.id || Math.random().toString(36).substring(2, 15);
    const pet: Pet = { ...validatedData, id };

    // Store the pet
    this.pets.set(id, pet);

    return pet;
  }

  protected async handleRead(id: string, context: Context): Promise<Pet> {
    const pet = this.pets.get(id);
    if (!pet) {
      throw new Error('Pet not found');
    }
    return pet;
  }

  protected async handleUpdate(id: string, data: Partial<Pet>, context: Context): Promise<Pet> {
    const existingPet = await this.handleRead(id, context);
    
    // Validate updated data
    const updatedPet = PetSchema.parse({
      ...existingPet,
      ...data,
    });

    // Store updated pet
    this.pets.set(id, updatedPet);

    return updatedPet;
  }

  protected async handleDelete(id: string, context: Context): Promise<void> {
    const exists = this.pets.has(id);
    if (!exists) {
      throw new Error('Pet not found');
    }
    this.pets.delete(id);
  }

  protected async handleList(filter: Record<string, unknown>, context: Context): Promise<Pet[]> {
    const pets = Array.from(this.pets.values());

    // Apply filters if provided
    return pets.filter(pet => {
      for (const [key, value] of Object.entries(filter)) {
        if (pet[key as keyof Pet] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  // Additional methods specific to Pet model
  public async findByStatus(status: PetStatus, context: Context): Promise<Pet[]> {
    return this.list({ status }, context).then(response => response.data || []);
  }

  public async uploadImage(
    id: string,
    imageUrl: string,
    context: Context,
  ): Promise<ModelResponse<Pet>> {
    try {
      const pet = await this.handleRead(id, context);
      const updatedPet = await this.handleUpdate(
        id,
        {
          photoUrls: [...pet.photoUrls, imageUrl],
        },
        context,
      );
      return { success: true, data: updatedPet };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
} 