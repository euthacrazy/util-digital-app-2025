jest.mock('./apps/backend/src/prisma/client', () => ({
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    store: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    wallet: {
      create: jest.fn()
    }
  }
}));
