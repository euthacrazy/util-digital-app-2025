import { Request, Response } from 'express';
import { OrderController } from '../../controllers/orderController';
import { prismaMock } from '../setup';
import { OrderStatus, UserRole } from '@prisma/client';

interface CustomRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

describe('OrderController', () => {
  let orderController: OrderController;
  let req: Partial<CustomRequest>;
  let res: Partial<Response>;

  beforeEach(() => {
    orderController = new OrderController();
    req = {
      body: {},
      user: {
        userId: '1',
        role: UserRole.CUSTOMER
      }
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('create', () => {
    it('should create a new order successfully', async () => {
      const orderData = {
        items: [
          {
            productId: '1',
            quantity: 2
          }
        ],
        paymentMethod: 'CREDIT_CARD',
        shippingAddress: {
          street: 'Test Street',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345-678',
          country: 'BR'
        }
      };

      req.body = orderData;

      const mockProduct = {
        id: '1',
        name: 'Test Product',
        price: 100,
        description: 'Test Description',
        images: ['image1.jpg'],
        storeId: 'store1',
        categoryId: 'category1',
        createdAt: new Date(),
        updatedAt: new Date(),
        store: {
          id: 'store1',
          name: 'Test Store',
          ownerId: 'owner1'
        }
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);

      prismaMock.order.create.mockResolvedValue({
        id: 'order1',
        customerId: '1',
        storeId: 'store1',
        total: 200,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeSessionId: null
      });

      await orderController.create(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: expect.arrayContaining([
            expect.objectContaining({
              id: 'order1',
              total: 200
            })
          ])
        })
      );
    });
  });

  describe('listOrders', () => {
    it('should list orders for the authenticated user', async () => {
      prismaMock.order.findMany.mockResolvedValue([
        {
          id: 'order1',
          customerId: '1',
          storeId: 'store1',
          total: 200,
          status: OrderStatus.PAID,
          createdAt: new Date(),
          updatedAt: new Date(),
          stripeSessionId: null
        }
      ]);

      prismaMock.order.count.mockResolvedValue(1);

      await orderController.listOrders(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: expect.arrayContaining([
            expect.objectContaining({
              id: 'order1',
              total: 200
            })
          ]),
          total: 1,
          pages: 1
        })
      );
    });
  });

  describe('updateStatus', () => {
    it('should update order status when authorized', async () => {
      req.params = { id: 'order1' };
      req.body = { status: OrderStatus.PROCESSING };
      req.user = {
        userId: 'owner1',
        role: UserRole.VENDOR
      };

      prismaMock.order.findUnique.mockResolvedValue({
        id: 'order1',
        customerId: '1',
        storeId: 'store1',
        total: 200,
        status: OrderStatus.PAID,
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeSessionId: null,
        store: {
          connect: {
            id: 'store1'
          }
        }
      });

      prismaMock.order.update.mockResolvedValue({
        id: 'order1',
        status: OrderStatus.PROCESSING,
        customerId: '1',
        storeId: 'store1',
        total: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeSessionId: null
      });

      await orderController.updateStatus(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'order1',
          status: OrderStatus.PROCESSING
        })
      );
    });
  });
});
