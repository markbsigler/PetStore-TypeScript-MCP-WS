import { User, UserSession } from '../models/User.js';
import { randomBytes } from 'crypto';

// In-memory storage
const users: Map<string, User> = new Map();
const sessions: Map<string, UserSession> = new Map();

export class UserController {
  async createUser(user: User): Promise<User> {
    users.set(user.username, user);
    return user;
  }

  async createUsersWithArray(userList: User[]): Promise<void> {
    userList.forEach(user => users.set(user.username, user));
  }

  async createUsersWithList(userList: User[]): Promise<void> {
    userList.forEach(user => users.set(user.username, user));
  }

  async getUserByName(username: string): Promise<User> {
    const user = users.get(username);
    if (!user) throw new Error('User not found');
    return user;
  }

  async updateUser(username: string, user: User): Promise<User> {
    if (!users.has(username)) throw new Error('User not found');
    users.set(username, user);
    return user;
  }

  async deleteUser(username: string): Promise<boolean> {
    return users.delete(username);
  }

  async login(username: string, password: string): Promise<{ token: string; expiresAfter: string }> {
    const user = users.get(username);
    if (!user || user.password !== password) throw new Error('Invalid credentials');
    const token = randomBytes(16).toString('hex');
    const expiresAfterDate = new Date(Date.now() + 3600_000);
    sessions.set(token, { username, token, expiresAt: expiresAfterDate, rateLimit: 100 });
    return { token, expiresAfter: expiresAfterDate.toISOString() };
  }

  async logout(username: string): Promise<void> {
    // Remove all sessions for this username
    for (const [token, session] of sessions.entries()) {
      if (session.username === username) {
        sessions.delete(token);
      }
    }
  }
}
