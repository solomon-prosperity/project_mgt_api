import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RabbitmqService } from '../src/rabbitmq/rabbitmq.service';
import { CreateOrganizationDto } from '../src/organizations/dto/create-organization.dto';
import { SigninDto } from '../src/auth/dto/signin-dto';
import { CreateProjectDto } from '../src/projects/dto/create-project.dto';

describe('Projects (e2e)', () => {
  let app: INestApplication;
  let accessTokenOrgA: string;
  let accessTokenOrgB: string;
  let projectAId: string;

  const mockRabbitmqService = {
    publishMessage: jest.fn().mockResolvedValue({ done: true }),
  };

  const timestamp = Date.now();
  const users = {
    orgA: {
      email: `user-a-${timestamp}@example.com`,
      password: 'Password123!',
      orgName: `Org A ${timestamp}`,
    },
    orgB: {
      email: `user-b-${timestamp}@example.com`,
      password: 'Password123!',
      orgName: `Org B ${timestamp}`,
    },
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

    // Setup Org A
    const orgAPayload: CreateOrganizationDto = {
      email: users.orgA.email,
      password: users.orgA.password,
      first_name: 'User',
      last_name: 'A',
      org_name: users.orgA.orgName,
    };
    const orgARes = await request(app.getHttpServer())
      .post('/orgs')
      .send(orgAPayload);
    if (orgARes.status !== 201) {
      console.error('Org A creation failed:', orgARes.status, orgARes.body);
    }

    const loginARes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: users.orgA.email,
        password: users.orgA.password,
      } as SigninDto);

    if (!loginARes.body.response) {
      console.error('Login A failed:', loginARes.status, loginARes.body);
    } else {
      accessTokenOrgA = loginARes.body.response.token;
    }

    // Setup Org B
    const orgBPayload: CreateOrganizationDto = {
      email: users.orgB.email,
      password: users.orgB.password,
      first_name: 'User',
      last_name: 'B',
      org_name: users.orgB.orgName,
    };
    const orgBRes = await request(app.getHttpServer())
      .post('/orgs')
      .send(orgBPayload);
    if (orgBRes.status !== 201) {
      console.error('Org B creation failed:', orgBRes.status, orgBRes.body);
    }

    const loginBRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: users.orgB.email,
        password: users.orgB.password,
      } as SigninDto);

    if (!loginBRes.body.response) {
      console.error('Login B failed:', loginBRes.status, loginBRes.body);
    } else {
      accessTokenOrgB = loginBRes.body.response.token;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Project Lifecycle & Multi-Tenancy', () => {
    it('should successfully create a project in Org A', async () => {
      const payload: CreateProjectDto = {
        name: `Project Alpha ${timestamp}`,
        description: 'Org A Project',
      };

      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${accessTokenOrgA}`)
        .send(payload)
        .expect(201);

      projectAId = response.body.response.project_id;
      expect(response.body.message).toBe('Project created successfully!');
      expect(response.body.response.name).toBe(payload.name);
    });

    it('should successfully retrieve projects for Org A', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${accessTokenOrgA}`)
        .expect(200);

      expect(response.body.response.docs.length).toBeGreaterThan(0);
    });

    it('should NOT see Org A projects when logged into Org B (Isolation)', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${accessTokenOrgB}`)
        .expect(200);

      const orgAProjectInB = response.body.response.docs.find(
        (p: { project_id: string }) => p.project_id === projectAId,
      );
      expect(orgAProjectInB).toBeUndefined();
    });

    it('should fail to delete Org A project using Org B token (Cross-Tenant Security)', async () => {
      await request(app.getHttpServer())
        .delete(`/projects/${projectAId}`)
        .set('Authorization', `Bearer ${accessTokenOrgB}`)
        .expect(404);
    });

    it('should successfully delete its own project in Org A', async () => {
      await request(app.getHttpServer())
        .delete(`/projects/${projectAId}`)
        .set('Authorization', `Bearer ${accessTokenOrgA}`)
        .expect(200);
    });
  });
});
