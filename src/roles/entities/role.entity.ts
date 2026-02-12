import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  JoinTable,
} from 'typeorm';
import { Permission } from '../../permissions/entities/permission.entity';
import { OrganizationMember } from '../../organizations/entities/organization-member.entity';

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  role_id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ default: false })
  is_default: boolean;

  @Column()
  description: string;

  @ManyToMany(() => Permission, (permission) => permission.roles, {
    eager: true,
  })
  @JoinTable({ name: 'role_permissions' })
  permissions: Permission[];

  @OneToMany(() => OrganizationMember, (member) => member.role)
  members: OrganizationMember[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
