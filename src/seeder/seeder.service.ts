import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Role } from 'src/roles/entities/role.entity';
import { Permission } from 'src/permissions/entities/permission.entity';
import { ConfigService } from '@nestjs/config';
import { defaultPermissions } from 'src/seeder/constants/permission.constants';
import { rolesSeeds } from 'src/seeder/constants/role.constants';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.seed();
    } catch (error) {
      this.logger.error(
        'Seeding failed. Application will not start:',
        error.message,
      );
      process.exit(1);
    }
  }

  async seedDefaultSuperAdminRole(manager: EntityManager): Promise<Role> {
    try {
      const role_exists = await manager.findOne(Role, {
        where: { slug: 'super-admin' },
      });
      const permissions = await manager.find(Permission, {});
      if (!role_exists) {
        if (permissions.length === 0) throw new Error('Permissions missing');
        const role = manager.create(Role, {
          name: 'Super Admin',
          slug: 'super-admin',
          description: 'Default Super Admin',
          permissions,
          is_default: true,
        });

        const new_role = await manager.save(role);
        this.logger.log('role created successfully.');
        return new_role;
      } else {
        if (permissions.length > 0) {
          role_exists.permissions = permissions;
          await manager.save(role_exists);
        }
        this.logger.log('role already exists.');
        return role_exists;
      }
    } catch (error) {
      throw error;
    }
  }
  async seedPermissions(manager: EntityManager) {
    try {
      await manager.upsert(Permission, defaultPermissions, ['slug']);
      this.logger.log('✅ Permissions seeded/updated successfully');
    } catch (error) {
      this.logger.error('Failed to seed permissions:', error.message);
      throw error;
    }
  }

  async seedRoles(manager: EntityManager) {
    try {
      const allPermissions = await manager.find(Permission);

      for (const roleSeed of rolesSeeds) {
        let role = await manager.findOne(Role, {
          where: { slug: roleSeed.slug },
          relations: ['permissions'],
        });

        let rolePermissions: Permission[] = [];

        if (roleSeed.slug === 'account_owner') {
          rolePermissions = allPermissions;
        } else if (roleSeed.slug === 'admin') {
          // Admin: Manage data and users.
          // Specifically per table: Create project: Yes, View projects: Yes, Delete project: No
          rolePermissions = allPermissions.filter((p) => {
            if (p.slug === 'delete_project') return false;
            // Admins can manage users and projects otherwise
            return true;
          });
        } else if (roleSeed.slug === 'member') {
          // Member: Create project: No, View projects: Yes, Delete project: No
          const memberAllowedSlugs = [
            'view_project',
            'view_client',
            'view_user',
            'view_own_activity',
          ];
          rolePermissions = allPermissions.filter((p) =>
            memberAllowedSlugs.includes(p.slug),
          );
        }

        if (!role) {
          role = manager.create(Role, {
            ...roleSeed,
            permissions: rolePermissions,
            is_default: true,
          });
        } else {
          role.name = roleSeed.name;
          role.description = roleSeed.description;
          role.permissions = rolePermissions;
        }

        await manager.save(role);
      }
      this.logger.log('✅ Roles seeded/updated successfully');
    } catch (error) {
      this.logger.error('Failed to seed roles:', error.message);
      throw error;
    }
  }

  async seed() {
    try {
      await this.dataSource.transaction(async (manager) => {
        await this.seedPermissions(manager);
        await this.seedRoles(manager);
      });
    } catch (error) {
      throw error;
    }
  }
}
