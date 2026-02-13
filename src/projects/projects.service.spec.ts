import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { PaginationDto } from './dto/pagination.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { IUser } from 'src/common/utils/interfaces';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepository: Repository<Project>;
  let organizationRepository: Repository<Organization>;
  let rabbitmqService: RabbitmqService;

  const mockOrg = {
    org_id: 'org-123',
    name: 'Test Org',
  } as Organization;

  const mockUser = {
    user_id: 'user-123',
    org_id: 'org-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
  } as unknown as IUser;

  const mockProject = {
    project_id: 'project-123',
    name: 'Test Project',
    organization: mockOrg,
  } as Project;

  const mockProjectRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOrganizationRepository = {
    findOneBy: jest.fn(),
  };

  const mockRabbitmqService = {
    publishMessage: jest.fn().mockResolvedValue({ done: true }),
  };

  const mockRequest = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'test-agent',
    },
    socket: {},
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: RabbitmqService,
          useValue: mockRabbitmqService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    organizationRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
    rabbitmqService = module.get<RabbitmqService>(RabbitmqService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const payload: CreateProjectDto = {
      name: 'New Project',
      description: 'Test Description',
    };

    it('should successfully create a project', async () => {
      mockProjectRepository.findOne.mockResolvedValue(null);
      mockOrganizationRepository.findOneBy.mockResolvedValue(mockOrg);
      mockProjectRepository.create.mockReturnValue(mockProject);
      mockProjectRepository.save.mockResolvedValue(mockProject);

      const result = await service.create(payload, mockUser, mockRequest);

      expect(projectRepository.findOne).toHaveBeenCalled();
      expect(organizationRepository.findOneBy).toHaveBeenCalledWith({
        org_id: 'org-123',
      });
      expect(projectRepository.save).toHaveBeenCalled();
      expect(rabbitmqService.publishMessage).toHaveBeenCalled();
      expect(result).toEqual(mockProject);
    });

    it('should throw ConflictException if project name exists', async () => {
      mockProjectRepository.findOne.mockResolvedValue(mockProject);

      await expect(
        service.create(payload, mockUser, mockRequest),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockProjectRepository.findOne.mockResolvedValue(null);
      mockOrganizationRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.create(payload, mockUser, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated projects', async () => {
      const pagination: PaginationDto = { limit: 10, page: 0 };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProject], 1]),
      } as unknown as SelectQueryBuilder<Project>;

      mockProjectRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.findAll('org-123', pagination);

      expect(result.docs).toEqual([mockProject]);
      expect(result.pagination.total_count).toBe(1);
    });
  });

  describe('remove', () => {
    it('should successfully remove a project', async () => {
      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      mockProjectRepository.remove.mockResolvedValue(mockProject);

      const result = await service.remove('project-123', mockUser, mockRequest);

      expect(projectRepository.remove).toHaveBeenCalled();
      expect(rabbitmqService.publishMessage).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });
});
