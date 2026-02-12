import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';
import { Repository, EntityManager } from 'typeorm';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let memberRepository: Repository<OrganizationMember>;

  const mockUser = {
    user_id: 'user_123',
    email: 'john@example.com',
  } as User;

  const mockMembership = {
    user: mockUser,
    organization: { org_id: 'org_123' },
    role: { name: 'Owner', permissions: [] },
  } as unknown as OrganizationMember;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    merge: jest.fn(),
  };

  const mockMemberRepository = {
    findOne: jest.fn(),
  };

  const mockEntityManager = {
    getRepository: jest.fn().mockReturnThis(),
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    merge: jest.fn(),
  } as unknown as EntityManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(OrganizationMember),
          useValue: mockMemberRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    memberRepository = module.get<Repository<OrganizationMember>>(
      getRepositoryToken(OrganizationMember),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user using repository', async () => {
      const payload: Partial<User> = { email: 'test@example.com' };
      (mockUserRepository.create as jest.Mock).mockReturnValue(mockUser);
      (mockUserRepository.save as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.create(payload);

      expect(userRepository.create).toHaveBeenCalledWith(payload);
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should create a user using manager if provided', async () => {
      const payload: Partial<User> = { email: 'test@example.com' };
      const managerRepo = {
        create: jest.fn().mockReturnValue(mockUser),
        save: jest.fn().mockResolvedValue(mockUser),
      };
      (mockEntityManager.getRepository as jest.Mock).mockReturnValue(
        managerRepo,
      );

      const result = await service.create(payload, mockEntityManager);

      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(User);
      expect(managerRepo.create).toHaveBeenCalledWith(payload);
      expect(managerRepo.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOne', () => {
    it('should return a user if found', async () => {
      (mockUserRepository.findOneBy as jest.Mock).mockResolvedValue(mockUser);
      const result = await service.findOne({ email: 'test@example.com' });
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const payload: Partial<User> = { first_name: 'Updated' };
      (mockUserRepository.findOneBy as jest.Mock).mockResolvedValue(mockUser);
      (mockUserRepository.save as jest.Mock).mockResolvedValue({
        ...mockUser,
        ...payload,
      });

      const result = await service.update('user_123', payload);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        user_id: 'user_123',
      });
      expect(userRepository.merge).toHaveBeenCalled();
      expect(result.first_name).toBe('Updated');
    });
  });

  describe('findMembership', () => {
    it('should return membership with role and permissions', async () => {
      (mockMemberRepository.findOne as jest.Mock).mockResolvedValue(
        mockMembership,
      );

      const result = await service.findMembership('user_123', 'org_123');

      expect(memberRepository.findOne).toHaveBeenCalledWith({
        where: {
          user: { user_id: 'user_123' },
          organization: { org_id: 'org_123' },
        },
        relations: ['role', 'role.permissions'],
      });
      expect(result).toEqual(mockMembership);
    });
  });
});
