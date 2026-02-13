import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  EntityManager,
  FindOptionsWhere,
  DataSource,
} from 'typeorm';
import { User } from './entities/user.entity';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';
import { CreateOrgUserDto } from './dto/create-org-user.dto';
import { GetOrgUsersDto } from './dto/get-org-users.dto';
import { Role } from '../roles/entities/role.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { paginateResult } from '../common/helpers';
import { IUser } from '../common/utils/interfaces';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepository: Repository<OrganizationMember>,
  ) {}

  async create(payload: Partial<User>, manager?: EntityManager) {
    try {
      const repo = manager ? manager.getRepository(User) : this.userRepository;
      const user = repo.create(payload);
      return await repo.save(user);
    } catch (error) {
      throw error;
    }
  }

  async createUserForOrg(
    org_id: string,
    payload: CreateOrgUserDto,
    dataSource: DataSource,
  ) {
    return await dataSource.transaction(async (manager) => {
      const { email, password, first_name, last_name, role_id } = payload;

      // 1. Check if user already exists
      let user = await manager.findOne(User, { where: { email } });
      if (user) {
        // Check if already a member of this org
        const existingMember = await manager.findOne(OrganizationMember, {
          where: { user: { user_id: user.user_id }, organization: { org_id } },
        });
        if (existingMember) {
          throw new ConflictException(
            'User is already a member of this organization',
          );
        }
      } else {
        // 2. Create new user
        user = manager.create(User, {
          email,
          password,
          first_name,
          last_name,
        });
        user = await manager.save(user);
      }

      // 3. Validate Role
      const role = await manager.findOne(Role, { where: { role_id } });
      if (!role) throw new NotFoundException('Role not found');

      // 4. Create Membership
      const organization = await manager.findOne(Organization, {
        where: { org_id },
      });
      if (!organization) throw new NotFoundException('Organization not found');

      const membership = manager.create(OrganizationMember, {
        user,
        organization,
        role,
      });
      await manager.save(membership);

      return user;
    });
  }

  async findAllForOrg(org_id: string, query: GetOrgUsersDto) {
    const { page = 1, limit = 20 } = query;

    const [members, total] = await this.memberRepository.findAndCount({
      where: { organization: { org_id } },
      relations: ['user', 'role'],
      take: limit,
      skip: (page - 1) * limit,
    });

    const docs = members.map((m) => {
      const user = m.user;
      (user as IUser).role = m.role;
      return user;
    });

    return {
      docs,
      pagination: paginateResult(total, page, limit),
    };
  }

  async findOneForOrg(user_id: string, org_id: string) {
    const member = await this.memberRepository.findOne({
      where: { user: { user_id }, organization: { org_id } },
      relations: ['user', 'role'],
    });

    if (!member)
      throw new NotFoundException('User not found in this organization');

    const user = member.user;
    (user as IUser).role = member.role;
    return user;
  }

  async findOne(query: FindOptionsWhere<User>): Promise<User | null> {
    try {
      return await this.userRepository.findOneBy(query);
    } catch (error) {
      throw error;
    }
  }

  async update(
    user_id: string,
    payload: Partial<User>,
    manager?: EntityManager,
  ): Promise<User> {
    try {
      const repo = manager ? manager.getRepository(User) : this.userRepository;
      const user = await repo.findOneBy({ user_id });
      if (!user) throw new NotFoundException('User not found');
      repo.merge(user, payload);
      return await repo.save(user);
    } catch (error) {
      throw error;
    }
  }

  async findMembership(user_id: string, org_id: string) {
    return await this.memberRepository.findOne({
      where: { user: { user_id }, organization: { org_id } },
      relations: ['role', 'role.permissions'],
    });
  }
}
