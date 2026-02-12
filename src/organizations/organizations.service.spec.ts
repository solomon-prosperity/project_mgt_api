import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationMember } from './entities/organization-member.entity';
import { Organization } from './entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let dataSource: DataSource;
  let memberRepository: Repository<OrganizationMember>;

  const mockUser = {
    user_id: 'user-123',
    email: 'test@example.com',
  } as User;

  const mockOrg = {
    org_id: 'org-123',
    name: 'Test Org',
    slug: 'test-org',
  } as Organization;

  const mockRole = {
    role_id: 'role-123',
    slug: 'account_owner',
  } as Role;

  const mockMembership = {
    organization: mockOrg,
    user: mockUser,
  } as OrganizationMember;

  const mockEntityManager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  } as unknown as EntityManager;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb) => cb(mockEntityManager)),
  } as unknown as DataSource;

  const mockMemberRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<OrganizationMember>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(OrganizationMember),
          useValue: mockMemberRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    dataSource = module.get<DataSource>(DataSource);
    memberRepository = module.get<Repository<OrganizationMember>>(
      getRepositoryToken(OrganizationMember),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const payload: CreateOrganizationDto = {
      email: 'new@example.com',
      password: 'password123',
      first_name: 'John',
      last_name: 'Doe',
      org_name: 'New Org',
    };

    it('should successfully create an organization, user and member', async () => {
      (mockEntityManager.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // User check
        .mockResolvedValueOnce(null) // Org check
        .mockResolvedValueOnce(mockRole); // Role check

      (mockEntityManager.create as jest.Mock)
        .mockReturnValueOnce(mockUser)
        .mockReturnValueOnce(mockOrg)
        .mockReturnValueOnce(mockMembership);

      (mockEntityManager.save as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockOrg)
        .mockResolvedValueOnce(mockMembership);

      const result = await service.create(payload);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result).toEqual({
        org_id: mockOrg.org_id,
        name: mockOrg.name,
        slug: mockOrg.slug,
      });
    });

    it('should throw ConflictException if user email exists', async () => {
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(mockUser);

      await expect(service.create(payload)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if org slug exists', async () => {
      (mockEntityManager.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockOrg);

      await expect(service.create(payload)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if account_owner role missing', async () => {
      (mockEntityManager.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(service.create(payload)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return org if membership exists', async () => {
      (mockMemberRepository.findOne as jest.Mock).mockResolvedValue(
        mockMembership,
      );

      const result = await service.findOne('org-123', 'user-123');

      expect(memberRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockOrg);
    });

    it('should throw ForbiddenException if no membership', async () => {
      (mockMemberRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('org-123', 'user-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
