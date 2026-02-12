import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationMember } from 'src/organizations/entities/organization-member.entity';
import { SigninDto } from './dto/signin-dto';
import { UserStatus } from 'src/users/enums/user.enum';
import { User } from 'src/users/entities/user.entity';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { Organization } from 'src/organizations/entities/organization.entity';
import { Role } from 'src/roles/entities/role.entity';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let rabbitmqService: RabbitmqService;
  let jwtService: JwtService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let configService: ConfigService;
  let memberRepository: Repository<OrganizationMember>;

  const mockUser = {
    user_id: 'user-123',
    email: 'test@example.com',
    password: 'hashedpassword',
    status: UserStatus.ACTIVE,
    first_name: 'John',
    last_name: 'Doe',
  } as User;

  const mockOrg = {
    org_id: 'org-123',
    name: 'Test Org',
  } as Organization;

  const mockRole = {
    role_id: 'role-123',
    name: 'Admin',
  } as Role;

  const mockMembership = {
    organization: mockOrg,
    role: mockRole,
    user: mockUser,
  } as OrganizationMember;

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockRabbitmqService = {
    publishMessage: jest.fn().mockResolvedValue({ done: true }),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock_env'),
  };

  const mockMemberRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: RabbitmqService, useValue: mockRabbitmqService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getRepositoryToken(OrganizationMember),
          useValue: mockMemberRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    rabbitmqService = module.get<RabbitmqService>(RabbitmqService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    memberRepository = module.get<Repository<OrganizationMember>>(
      getRepositoryToken(OrganizationMember),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    const payload: SigninDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockRequest = {
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
      socket: {},
    } as unknown as Request;

    it('should successfully sign in a user and return token', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockMemberRepository.findOne.mockResolvedValue(mockMembership);

      const result = await service.signIn(payload, mockRequest);

      expect(usersService.findOne).toHaveBeenCalledWith({
        email: payload.email,
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        payload.password,
        mockUser.password,
      );
      expect(memberRepository.findOne).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalled();
      expect(rabbitmqService.publishMessage).toHaveBeenCalled();
      expect(result).toEqual({
        user: mockUser,
        organization: mockOrg,
        role: mockRole,
        token: 'mock.jwt.token',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(service.signIn(payload, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.signIn(payload, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is locked', async () => {
      const lockedUser = { ...mockUser, status: UserStatus.LOCKED };
      mockUsersService.findOne.mockResolvedValue(lockedUser);

      await expect(service.signIn(payload, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user has no membership', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockMemberRepository.findOne.mockResolvedValue(null);

      await expect(service.signIn(payload, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
