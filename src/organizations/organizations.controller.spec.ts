import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { IUser } from '../common/utils/interfaces';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let service: OrganizationsService;

  const mockOrganizationsService = {
    create: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUser: IUser = {
    user_id: 'user-123',
    org_id: 'org-123',
  } as IUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: mockOrganizationsService,
        },
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
    service = module.get<OrganizationsService>(OrganizationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create an organization', async () => {
      const payload: CreateOrganizationDto = {
        email: 'test@example.com',
        org_name: 'Test Org',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      } as CreateOrganizationDto;

      const mockResult = { org_id: '123', name: 'Test Org', slug: 'test-org' };
      mockOrganizationsService.create.mockResolvedValue(mockResult);

      const result = await controller.create(payload);

      expect(service.create).toHaveBeenCalledWith(payload);
      expect(result).toEqual({
        response: mockResult,
        message: 'Organization created successfully!',
      });
    });
  });

  describe('findOne', () => {
    it('should return organization details', async () => {
      const orgId = 'org-123';
      const mockResult = { id: orgId, name: 'Org' };
      mockOrganizationsService.findOne.mockResolvedValue(mockResult);

      const result = await controller.findOne(orgId, mockUser);

      expect(service.findOne).toHaveBeenCalledWith(orgId, mockUser.user_id);
      expect(result).toEqual({
        response: mockResult,
        message: 'Organization details retrieved successfully!',
      });
    });
  });
});
