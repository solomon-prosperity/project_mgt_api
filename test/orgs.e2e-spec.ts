import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RabbitmqService } from '../src/rabbitmq/rabbitmq.service';
import { CreateOrganizationDto } from '../src/organizations/dto/create-organization.dto';

describe('Organizations (e2e)', () => {
  let app: INestApplication;

  const mockRabbitmqService = {
    publishMessage: jest.fn().mockResolvedValue({ done: true }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RabbitmqService)
      .useValue(mockRabbitmqService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/orgs (POST)', () => {
    it('should successfully create an organization and user', async () => {
      const payload: CreateOrganizationDto = {
        email: `test-${Date.now()}@example.com`,
        password: 'Password123!',
        first_name: 'Test',
        last_name: 'User',
        org_name: `Test Org ${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/orgs') // Fixed path
        .send(payload)
        .expect(201);

      expect(response.body.response.org_id).toBeDefined(); // Standardized response
      expect(response.body.response.name).toBe(payload.org_name);
    });

    it('should fail if email is invalid', async () => {
      const payload: Partial<CreateOrganizationDto> = {
        email: 'invalid-email',
      };

      await request(app.getHttpServer())
        .post('/orgs') // Fixed path
        .send(payload)
        .expect(400);
    });
  });

  describe('/orgs/:id (GET)', () => {
    it('should fail if unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/orgs/some-org-id') // Fixed path
        .expect(401);
    });
  });
});
