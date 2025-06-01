import { z } from 'zod';

export const UserSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  password: z.string(),
  phone: z.string(),
  userStatus: z.number().int().describe('User Status'),
});

export type User = z.infer<typeof UserSchema>;

export interface UserSession {
  username: string;
  token: string;
  expiresAt: Date;
  rateLimit: number;
}
