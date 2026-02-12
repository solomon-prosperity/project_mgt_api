import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RabbitmqService } from '../src/rabbitmq/rabbitmq.service';
import { CreateOrganizationDto } from '../src/organizations/dto/create-organization.dto';
import { SigninDto } from '../src/auth/dto/signin-dto';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  const mockRabbitmqService = {
    publishMessage: jest.fn().mockResolvedValue({ done: true }),
  };

  const testUser = {
    email: `auth-test-${Date.now()}@example.com`,
    password: 'Password123!',
    firstName: 'Auth',
    lastName: 'Tester',
    orgName: `Auth Test Org ${Date.now()}`,
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

    // Create a user for testing sign-in
    const orgPayload: CreateOrganizationDto = {
      email: testUser.email,
      password: testUser.password,
      first_name: testUser.firstName,
      last_name: testUser.lastName,
      org_name: testUser.orgName,
    };
    await request(app.getHttpServer()).post('/orgs').send(orgPayload); // Fixed path
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should successfully sign in and return a JWT token', async () => {
      const payload: SigninDto = {
        email: testUser.email,
        password: testUser.password,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(payload)
        .expect(200); // Fixed expected status (200 OK)

      expect(response.body.message).toBe('Signed in successfully!');
      expect(response.body.response).toHaveProperty('token');
      expect(response.body.response.user.email).toBe(testUser.email);
    });

    it('should fail with invalid credentials', async () => {
      const payload: SigninDto = {
        email: testUser.email,
        password: 'WrongPassword!',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(payload)
        .expect(401);
    });
  });
});
