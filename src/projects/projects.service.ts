import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Organization } from '../organizations/entities/organization.entity';
import { PaginationDto } from './dto/pagination.dto';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { Request } from 'express';
import { IUser } from 'src/common/utils/interfaces';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  async create(payload: CreateProjectDto, user: IUser, request: Request) {
    try {
      const { name, description } = payload;
      const { org_id, first_name, last_name, user_id } = user;
      const existingProject = await this.projectRepository.findOne({
        where: { name, organization: { org_id } },
      });

      if (existingProject) {
        throw new ConflictException(
          'Project with this name already exists in this organization',
        );
      }

      const organization = await this.organizationRepository.findOneBy({
        org_id,
      });
      if (!organization) throw new NotFoundException('Organization not found');

      const project = this.projectRepository.create({
        name,
        description,
        organization,
      });

      const savedProject = await this.projectRepository.save(project);

      // Log activity
      const request_meta = {
        ip:
          request.ip ||
          request.headers['x-forwarded-for'] ||
          request.socket.remoteAddress,
        user_agent: request.headers['user-agent'],
      };

      await this.rabbitmqService.publishMessage([
        {
          worker: 'activity',
          message: {
            action: 'log',
            type: 'activity',
            data: {
              entity_id: user_id,
              org_id: savedProject.organization.org_id,
              activity: `${first_name} ${last_name} created project "${name}"`,
              entity: 'user',
              resource: 'Project',
              event: 'Create',
              event_date: new Date(),
              request: request_meta,
            },
          },
        },
      ]);

      return savedProject;
    } catch (error) {
      throw error;
    }
  }

  async findAll(org_id: string, pagination: PaginationDto) {
    const { limit = 20, offset = 0 } = pagination;

    const [projects, total] = await this.projectRepository
      .createQueryBuilder('project')
      .where('project.org_id = :org_id', { org_id })
      .select([
        'project.project_id',
        'project.name',
        'project.status',
        'project.created_at',
      ])
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return {
      data: projects,
      meta: {
        total,
        limit,
        offset,
      },
    };
  }

  async findOne(project_id: string, org_id: string) {
    const project = await this.projectRepository.findOne({
      where: { project_id, organization: { org_id } },
    });

    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(
    project_id: string,
    user: IUser,
    payload: UpdateProjectDto,
    request: Request,
  ) {
    const project = await this.findOne(project_id, user.org_id);
    const { first_name, last_name, user_id, org_id } = user;
    if (payload.name && payload.name !== project.name) {
      const existingProject = await this.projectRepository.findOne({
        where: { name: payload.name, organization: { org_id } },
      });
      if (existingProject) {
        throw new ConflictException(
          'Project with this name already exists in this organization',
        );
      }
    }

    this.projectRepository.merge(project, payload);
    const updatedProject = await this.projectRepository.save(project);

    // Log activity
    const request_meta = {
      ip:
        request.ip ||
        request.headers['x-forwarded-for'] ||
        request.socket.remoteAddress,
      user_agent: request.headers['user-agent'],
    };

    await this.rabbitmqService.publishMessage([
      {
        worker: 'activity',
        message: {
          action: 'log',
          type: 'activity',
          data: {
            entity_id: user_id,
            org_id,
            activity: `${first_name} ${last_name} updated project "${updatedProject.name}"`,
            entity: 'user',
            resource: 'Project',
            event: 'Update',
            event_date: new Date(),
            request: request_meta,
          },
        },
      },
    ]);

    return updatedProject;
  }

  async remove(project_id: string, user: IUser, request: Request) {
    const project = await this.findOne(project_id, user.org_id);
    const { first_name, last_name, user_id, org_id } = user;
    const projectName = project.name;

    await this.projectRepository.remove(project);

    // Log activity
    const request_meta = {
      ip:
        request.ip ||
        request.headers['x-forwarded-for'] ||
        request.socket.remoteAddress,
      user_agent: request.headers['user-agent'],
    };

    await this.rabbitmqService.publishMessage([
      {
        worker: 'activity',
        message: {
          action: 'log',
          type: 'activity',
          data: {
            entity_id: user_id,
            org_id,
            activity: `${first_name} ${last_name} deleted project "${projectName}"`,
            entity: 'user',
            resource: 'Project',
            event: 'Delete',
            event_date: new Date(),
            request: request_meta,
          },
        },
      },
    ]);

    return;
  }
}
