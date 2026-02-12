import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Permission } from '../permissions/entities/permission.entity';
import { ConflictException, ForbiddenException } from '@nestjs/common';

const mockSlugify = jest.fn((name) => name.toLowerCase().replace(/ /g, '-'));
jest.mock('slugify', () => ({
  __esModule: true,
  default: (name: string) => mockSlugify(name),
}));

describe('RolesService', () => {
  let service: RolesService;
  let permissionsService: PermissionsService;
  let dataSource: DataSource;

  const mockPermission = { permission_id: 'p1', name: 'Perm 1' } as Permission;
  const mockRole = {
    role_id: '123',
    name: 'Admin',
    slug: 'admin',
    description: 'Admin role',
    is_default: false,
    permissions: [mockPermission],
    members: [],
  } as unknown as Role;

  const mockRoleRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockPermissionsService = {
    findMany: jest.fn(),
  };

  const mockEntityManager = {
    save: jest.fn(),
    merge: jest.fn(),
  } as unknown as EntityManager;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb) => cb(mockEntityManager)),
  } as unknown as DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    permissionsService = module.get<PermissionsService>(PermissionsService);
    dataSource = module.get<DataSource>(DataSource);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a role with permissions', async () => {
      const payload: CreateRoleDto = {
        name: 'Admin',
        permissions: ['p1'],
        description: 'Admin role',
      };
      (mockRoleRepository.findOneBy as jest.Mock).mockResolvedValue(null);
      (mockPermissionsService.findMany as jest.Mock).mockResolvedValue([
        mockPermission,
      ]);
      (mockRoleRepository.create as jest.Mock).mockReturnValue(mockRole);
      (mockEntityManager.save as jest.Mock).mockResolvedValue(mockRole);

      const result = await service.create(payload);

      expect(permissionsService.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockRole);
    });

    it('should throw ConflictException if role slug exists', async () => {
      (mockRoleRepository.findOneBy as jest.Mock).mockResolvedValue(mockRole);
      const payload: CreateRoleDto = {
        name: 'Admin',
        permissions: [],
        description: 'desc',
      };
      await expect(service.create(payload)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated roles', async () => {
      (mockRoleRepository.findAndCount as jest.Mock).mockResolvedValue([
        [mockRole],
        1,
      ]);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.docs).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a role', async () => {
      (mockRoleRepository.findOneBy as jest.Mock).mockResolvedValue(mockRole);
      const result = await service.findOne('123');
      expect(result).toEqual(mockRole);
    });
  });

  describe('update', () => {
    it('should update a role', async () => {
      const payload: UpdateRoleDto = { name: 'New Admin' };
      (mockRoleRepository.findOneBy as jest.Mock).mockResolvedValue(mockRole);
      (mockEntityManager.save as jest.Mock).mockResolvedValue({
        ...mockRole,
        name: 'New Admin',
      });

      const result = await service.update('123', payload);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result!.name).toBe('New Admin');
    });
  });

  describe('remove', () => {
    it('should remove a role', async () => {
      (mockRoleRepository.findOne as jest.Mock).mockResolvedValue(mockRole);
      (mockRoleRepository.delete as jest.Mock).mockResolvedValue({
        affected: 1,
      });
      const result = await service.remove('123');
      expect(result).toBe(1);
    });

    it('should throw ForbiddenException if role has members', async () => {
      (mockRoleRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockRole,
        members: [{}, {}],
      } as Role);
      await expect(service.remove('123')).rejects.toThrow(ForbiddenException);
    });
  });
});
