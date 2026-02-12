import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PassportModule } from '@nestjs/passport';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

describe('RolesController', () => {
  let controller: RolesController;

  const mockRole = {
    role_id: 'role_123',
    name: 'Admin',
    slug: 'admin',
    members: [],
  };

  const mockRolesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    getRoleUsers: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a role', async () => {
      const payload: CreateRoleDto = {
        name: 'Admin',
        permissions: [],
        description: 'desc',
      };
      mockRolesService.create.mockResolvedValue(mockRole);
      const result = await controller.create(payload);
      expect(result.response).toEqual(mockRole);
      expect(result.message).toBe('Role created successfully!');
    });
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      const mockResult = {
        docs: [mockRole],
        pagination: {},
      };
      mockRolesService.findAll.mockResolvedValue(mockResult);
      const result = await controller.findAll({ page: 1, limit: 10 });
      expect(result.response).toEqual(mockResult);
    });
  });

  describe('getRoleUsers', () => {
    it('should return role users (members)', async () => {
      const mockResult = {
        ...mockRole,
        members: [],
      };
      mockRolesService.getRoleUsers.mockResolvedValue(mockResult);
      const result = await controller.getRoleUsers('123');
      expect(result.response.members).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return a role', async () => {
      mockRolesService.findOne.mockResolvedValue(mockRole);
      const result = await controller.findOne('123');
      expect(result.response).toEqual(mockRole);
    });
  });

  describe('update', () => {
    it('should update a role', async () => {
      const payload: UpdateRoleDto = { name: 'New Admin' };
      mockRolesService.update.mockResolvedValue(mockRole);
      const result = await controller.update('123', payload);
      expect(result.response).toEqual(mockRole);
    });
  });

  describe('remove', () => {
    it('should remove a role', async () => {
      mockRolesService.remove.mockResolvedValue(1);
      const result = await controller.remove('123');
      expect(result.response).toBe(1);
    });
  });
});
