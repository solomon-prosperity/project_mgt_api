import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { Permission } from './entities/permission.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In, Repository, EntityManager } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { CreateManyPermissionDto } from './dto/create-many-permissions';
import { UpdatePermissionDto } from './dto/update-permission.dto';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let permissionRepository: Repository<Permission>;

  const mockPermission = {
    permission_id: '123',
    name: 'View Users',
    slug: 'view-users',
    entity: 'User',
    action: 'view',
    description: 'Can view users',
  } as Permission;

  const mockPermissionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    findBy: jest.fn(),
    delete: jest.fn(),
  };

  const mockEntityManager = {
    save: jest.fn(),
    update: jest.fn(),
    findOneBy: jest.fn(),
  } as unknown as EntityManager;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb) => cb(mockEntityManager)),
  } as unknown as DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    permissionRepository = module.get<Repository<Permission>>(
      getRepositoryToken(Permission),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a permission', async () => {
      const payload: CreatePermissionDto = {
        name: 'View Users',
        entity: 'User',
        action: 'view',
        description: 'View users',
      };
      (mockPermissionRepository.findOneBy as jest.Mock).mockResolvedValue(null);
      (mockPermissionRepository.create as jest.Mock).mockReturnValue(
        mockPermission,
      );
      (mockEntityManager.save as jest.Mock).mockResolvedValue(mockPermission);

      const result = await service.create(payload);

      expect(permissionRepository.findOneBy).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(result).toEqual(mockPermission);
    });

    it('should throw ConflictException if permission already exists', async () => {
      (mockPermissionRepository.findOneBy as jest.Mock).mockResolvedValue(
        mockPermission,
      );
      const payload: CreatePermissionDto = {
        name: 'View Users',
        entity: 'User',
        action: 'view',
        description: 'View users',
      };
      await expect(service.create(payload)).rejects.toThrow(ConflictException);
    });
  });

  describe('createMany', () => {
    it('should successfully create multiple permissions', async () => {
      const payload: CreateManyPermissionDto = {
        permissions: [
          { name: 'P1', entity: 'E1', action: 'A1', description: 'D1' },
          { name: 'P2', entity: 'E2', action: 'A2', description: 'D2' },
        ],
      };
      (mockPermissionRepository.findBy as jest.Mock).mockResolvedValue([]);
      (mockPermissionRepository.create as jest.Mock).mockImplementation(
        (p: Partial<Permission>) => p,
      );
      (mockEntityManager.save as jest.Mock).mockResolvedValue([
        { name: 'p1' },
        { name: 'p2' },
      ]);

      const result = await service.createMany(payload);

      expect(permissionRepository.findBy).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('findAll', () => {
    it('should return paginated permissions', async () => {
      (mockPermissionRepository.findAndCount as jest.Mock).mockResolvedValue([
        [mockPermission],
        1,
      ]);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.docs).toHaveLength(1);
      expect(result.pagination.total_count).toBe(1);
    });
  });

  describe('findMany', () => {
    it('should return permissions by ids', async () => {
      (mockPermissionRepository.findBy as jest.Mock).mockResolvedValue([
        mockPermission,
      ]);
      const result = await service.findMany(['123']);
      expect(result).toHaveLength(1);
      expect(permissionRepository.findBy).toHaveBeenCalledWith({
        permission_id: In(['123']),
      });
    });
  });

  describe('findOne', () => {
    it('should return a permission', async () => {
      (mockPermissionRepository.findOneBy as jest.Mock).mockResolvedValue(
        mockPermission,
      );
      const result = await service.findOne('123');
      expect(result).toEqual(mockPermission);
    });

    it('should throw NotFoundException if not found', async () => {
      (mockPermissionRepository.findOneBy as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a permission', async () => {
      (mockPermissionRepository.findOneBy as jest.Mock).mockResolvedValue(
        mockPermission,
      );
      (mockEntityManager.update as jest.Mock).mockResolvedValue({});
      (mockEntityManager.findOneBy as jest.Mock).mockResolvedValue({
        ...mockPermission,
        name: 'Updated',
      });

      const result = await service.update('123', {
        name: 'Updated',
      } as UpdatePermissionDto);

      expect(mockEntityManager.update).toHaveBeenCalled();
      expect(result!.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should remove a permission', async () => {
      (mockPermissionRepository.delete as jest.Mock).mockResolvedValue({
        affected: 1,
      });
      const result = await service.remove('123');
      expect(result).toBe(1);
    });
  });
});
