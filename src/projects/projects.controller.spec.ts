import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { PaginationDto } from './dto/pagination.dto';
import { IUser } from '../common/utils/interfaces';
import { Request } from 'express';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: ProjectsService;

  const mockProjectsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser: IUser = {
    user_id: 'user-123',
    org_id: 'org-123',
  } as IUser;

  const mockRequest = {
    ip: '127.0.0.1',
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get<ProjectsService>(ProjectsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with correct parameters', async () => {
      const payload: CreateProjectDto = { name: 'Test' } as CreateProjectDto;
      mockProjectsService.create.mockResolvedValue({ id: '1' });

      const result = await controller.create(payload, mockRequest, mockUser);

      expect(service.create).toHaveBeenCalledWith(
        payload,
        mockUser,
        mockRequest,
      );
      expect(result.message).toBe('Project created successfully!');
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with correct parameters', async () => {
      const pagination: PaginationDto = { limit: 10, offset: 0 };
      mockProjectsService.findAll.mockResolvedValue({ data: [], meta: {} });

      const result = await controller.findAll(pagination, mockUser);

      expect(service.findAll).toHaveBeenCalledWith(mockUser.org_id, pagination);
      expect(result.message).toBe('Projects retrieved successfully!');
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with correct parameters', async () => {
      mockProjectsService.findOne.mockResolvedValue({ id: '1' });

      const result = await controller.findOne('1', mockUser);

      expect(service.findOne).toHaveBeenCalledWith('1', mockUser.org_id);
      expect(result.message).toBe('Project retrieved successfully!');
    });
  });

  describe('remove', () => {
    it('should call service.remove with correct parameters', async () => {
      mockProjectsService.remove.mockResolvedValue({ message: 'Success' });

      const result = await controller.remove('1', mockUser, mockRequest);

      expect(service.remove).toHaveBeenCalledWith('1', mockUser, mockRequest);
      expect(result.message).toBe('Project deleted successfully!');
    });
  });
});
