import { BaseProtocol, Context } from '../../protocols/base.ts';

describe('BaseProtocol', () => {
  class TestProtocol extends BaseProtocol<{ id: string; value: string }> {
    protected modelName = 'test';
    async handleCreate(data: { id: string; value: string }, _context: Context) {
      return { ...data };
    }
    async handleRead(id: string, _context: Context) {
      if (id === 'notfound') throw new Error('Not found');
      return { id, value: 'test' };
    }
    async handleUpdate(id: string, data: Partial<{ id: string; value: string }>, _context: Context) {
      if (id === 'notfound') throw new Error('Not found');
      return { id, value: data.value ?? 'updated' };
    }
    async handleDelete(id: string, _context: Context): Promise<void> {
      if (id === 'notfound') throw new Error('Not found');
      // no return value
    }
    async handleList(_filter: Record<string, unknown>, _context: Context) {
      return [{ id: '1', value: 'a' }, { id: '2', value: 'b' }];
    }
    async validateContext(_context: Context, _op: string) {}
  }

  const protocol = new TestProtocol();
  const context = {};

  it('should create, read, update, delete, and list', async () => {
    const created = await protocol.create({ id: '1', value: 'a' }, context);
    expect(created.success).toBe(true);
    const read = await protocol.read('1', context);
    expect(read.success).toBe(true);
    const updated = await protocol.update('1', { value: 'b' }, context);
    expect(updated.success).toBe(true);
    const deleted = await protocol.delete('1', context);
    expect(deleted.success).toBe(true);
    const list = await protocol.list({}, context);
    expect(list.success).toBe(true);
    expect(Array.isArray(list.data)).toBe(true);
  });

  it('should handle errors in read/update/delete', async () => {
    const read = await protocol.read('notfound', context);
    expect(read.success).toBe(false);
    const update = await protocol.update('notfound', { value: 'x' }, context);
    expect(update.success).toBe(false);
    const del = await protocol.delete('notfound', context);
    expect(del.success).toBe(false);
  });
});
