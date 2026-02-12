import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SigninDto } from './dto/signin-dto';
import { PassportModule } from '@nestjs/passport';
import { Request } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    signIn: jest.fn(),
  };

  const mockRequest = {
    ip: '127.0.0.1',
    headers: {},
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      const payload: SigninDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const mockResult = {
        user: { user_id: '123' },
        token: 'jwt.token',
      };

      mockAuthService.signIn.mockResolvedValue(mockResult);

      const result = await controller.signIn(payload, mockRequest);

      expect(authService.signIn).toHaveBeenCalledWith(payload, mockRequest);
      expect(result).toEqual({
        response: mockResult,
        message: 'Signed in successfully!',
      });
    });
  });
});
