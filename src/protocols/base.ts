import { EventEmitter } from 'events';

export interface Context {
  userId?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface ModelOperation<T> {
  type: 'create' | 'read' | 'update' | 'delete' | 'list';
  data?: T;
  id?: string;
  filter?: Record<string, unknown>;
  context: Context;
}

export interface ModelResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

export abstract class BaseProtocol<T> extends EventEmitter {
  protected abstract modelName: string;

  // Create operation
  public async create(data: T, context: Context): Promise<ModelResponse<T>> {
    try {
      await this.validateContext(context, 'create');
      const result = await this.handleCreate(data, context);
      this.emit(`${this.modelName}:created`, { data: result, context });
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Read operation
  public async read(id: string, context: Context): Promise<ModelResponse<T>> {
    try {
      await this.validateContext(context, 'read');
      const result = await this.handleRead(id, context);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Update operation
  public async update(id: string, data: Partial<T>, context: Context): Promise<ModelResponse<T>> {
    try {
      await this.validateContext(context, 'update');
      const result = await this.handleUpdate(id, data, context);
      this.emit(`${this.modelName}:updated`, { id, data: result, context });
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Delete operation
  public async delete(id: string, context: Context): Promise<ModelResponse<void>> {
    try {
      await this.validateContext(context, 'delete');
      await this.handleDelete(id, context);
      this.emit(`${this.modelName}:deleted`, { id, context });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // List operation
  public async list(
    filter: Record<string, unknown>,
    context: Context,
  ): Promise<ModelResponse<T[]>> {
    try {
      await this.validateContext(context, 'list');
      const result = await this.handleList(filter, context);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Abstract methods to be implemented by specific protocols
  protected abstract handleCreate(data: T, context: Context): Promise<T>;
  protected abstract handleRead(id: string, context: Context): Promise<T>;
  protected abstract handleUpdate(id: string, data: Partial<T>, context: Context): Promise<T>;
  protected abstract handleDelete(id: string, context: Context): Promise<void>;
  protected abstract handleList(filter: Record<string, unknown>, context: Context): Promise<T[]>;

  // Context validation method
  protected async validateContext(
    context: Context,
    _operation: ModelOperation<T>['type'],
  ): Promise<void> {
    if (!context.userId) {
      throw new Error('User not authenticated');
    }

    // Implement additional context validation logic here
    // For example, checking roles, permissions, etc.
  }

  async validateRequest(_operation: string): Promise<void> {
    // ... existing code ...
  }
}
