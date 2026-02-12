import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization-member.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import slugify from 'slugify';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly memberRepository: Repository<OrganizationMember>,
    private dataSource: DataSource,
  ) {}

  async create(payload: CreateOrganizationDto) {
    return await this.dataSource.transaction(async (manager) => {
      const { email, password, first_name, last_name, org_name } = payload;

      // 1. Check/Create User
      let user = await manager.findOne(User, { where: { email } });
      if (user) {
        throw new ConflictException('User with this email already exists');
      }

      user = manager.create(User, {
        email,
        password,
        first_name,
        last_name,
      });
      user = await manager.save(user);

      // 2. Create Organization
      const slug = slugify(org_name, { lower: true });
      const existingOrg = await manager.findOne(Organization, {
        where: { slug },
      });
      if (existingOrg) {
        throw new ConflictException('Organization name already taken');
      }

      const organization = manager.create(Organization, {
        name: org_name,
        slug,
      });
      const savedOrg = await manager.save(organization);

      // 3. Assign Role (Account Owner)
      const role = await manager.findOne(Role, {
        where: { slug: 'account_owner' },
      });
      if (!role) {
        throw new NotFoundException('Default role "account_owner" not found');
      }

      const member = manager.create(OrganizationMember, {
        user,
        organization: savedOrg,
        role,
      });
      await manager.save(member);

      return {
        org_id: savedOrg.org_id,
        name: savedOrg.name,
        slug: savedOrg.slug,
      };
    });
  }

  async findOne(org_id: string, user_id: string) {
    const membership = await this.memberRepository.findOne({
      where: {
        organization: { org_id },
        user: { user_id },
      },
      relations: ['organization'],
    });

    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    return membership.organization;
  }
}
