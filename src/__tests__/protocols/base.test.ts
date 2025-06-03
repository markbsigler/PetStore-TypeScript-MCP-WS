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
    async handleDelete(_id: string, _context: Context): Promise<void> {
      if (_id === 'notfound') throw new Error('Not found');
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

  it('should return error if context validation fails', async () => {
    class FailingContextProtocol extends TestProtocol {
      async validateContext(_context: Context, _op: string) {
        throw new Error('Context invalid');
      }
    }
    const failingProtocol = new FailingContextProtocol();
    const ctx = {};
    const create = await failingProtocol.create({ id: '1', value: 'a' }, ctx);
    expect(create.success).toBe(false);
    expect(create.error).toBe('Context invalid');
    const read = await failingProtocol.read('1', ctx);
    expect(read.success).toBe(false);
    expect(read.error).toBe('Context invalid');
    const update = await failingProtocol.update('1', { value: 'b' }, ctx);
    expect(update.success).toBe(false);
    expect(update.error).toBe('Context invalid');
    const del = await failingProtocol.delete('1', ctx);
    expect(del.success).toBe(false);
    expect(del.error).toBe('Context invalid');
    const list = await failingProtocol.list({}, ctx);
    expect(list.success).toBe(false);
    expect(list.error).toBe('Context invalid');
  });

  it('should emit events for create, update, and delete', async () => {
    const events: string[] = [];
    protocol.on('test:created', () => events.push('created'));
    protocol.on('test:updated', () => events.push('updated'));
    protocol.on('test:deleted', () => events.push('deleted'));
    await protocol.create({ id: '2', value: 'b' }, context);
    await protocol.update('2', { value: 'c' }, context);
    await protocol.delete('2', context);
    expect(events).toEqual(['created', 'updated', 'deleted']);
  });

  it('should propagate meta field if returned by handler', async () => {
    class MetaReturnProtocol extends TestProtocol {
      async handleCreate(data: { id: string; value: string }, _context: Context) {
        return Object.assign({}, data, { meta: { foo: 'bar' } });
      }
    }
    const metaProto = new MetaReturnProtocol();
    const res = await metaProto.create({ id: '3', value: 'c' }, context);
    expect(res.success).toBe(true);
    // meta should be present in data
    expect(res.data && typeof res.data === 'object' && 'meta' in res.data).toBe(true);
  });

  it('should return unknown error for thrown non-Error in all operations', async () => {
    class NonErrorProtocol extends TestProtocol {
      async handleCreate(data: { id: string; value: string }, _context: Context) {
        throw 'fail';
        return data;
      }
      async handleRead(id: string, _context: Context) {
        throw 'fail';
        return { id, value: 'x' };
      }
      async handleUpdate(id: string, data: Partial<{ id: string; value: string }>, _context: Context) {
        throw 'fail';
        return { id, value: data.value ?? 'x' };
      }
      async handleDelete(_id: string, _context: Context): Promise<void> {
        throw 'fail';
      }
      async handleList(_filter: Record<string, unknown>, _context: Context) {
        throw 'fail';
        return [];
      }
    }
    const p = new NonErrorProtocol();
    for (const op of [
      () => p.create({ id: 'x', value: 'y' }, context),
      () => p.read('x', context),
      () => p.update('x', { value: 'y' }, context),
      () => p.delete('x', context),
      () => p.list({}, context),
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const result = await op();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    }
  });
});
