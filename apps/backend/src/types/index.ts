import { User, UserRole } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export type CreateUserDTO = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  referralCode?: string;
};

export type LoginDTO = {
  email: string;
  password: string;
};
