import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationMember } from 'src/organizations/entities/organization-member.entity';
import { SigninDto } from './dto/signin-dto';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserStatus } from 'src/users/enums/user.enum';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly rabitmqService: RabbitmqService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(OrganizationMember)
    private readonly memberRepository: Repository<OrganizationMember>,
  ) {}

  async signIn(payload: SigninDto, request: Request) {
    try {
      const { email, password } = payload;
      const user = await this.usersService.findOne({ email });

      if (!user) throw new UnauthorizedException('Invalid credentials');
      if (user.status === UserStatus.LOCKED)
        throw new UnauthorizedException(
          'Your account is currently locked, please reset your password',
        );

      const match = await bcrypt.compare(password, user.password as string);
      if (!match) throw new UnauthorizedException('Invalid credentials');

      if (user.status === UserStatus.SUSPENDED)
        throw new UnauthorizedException(
          'Your account has been suspended. Please contact support.',
        );
      if (user.status === UserStatus.INACTIVE) {
        throw new UnauthorizedException(
          'Your account has been deactivated. Please contact support.',
        );
      }
      if (user.status === UserStatus.DELETED) {
        throw new UnauthorizedException(
          'Your account has been deleted. Please contact support.',
        );
      }

      // Fetch the user's membership
      const membership = await this.memberRepository.findOne({
        where: { user: { user_id: user.user_id } },
        relations: ['organization', 'role'],
      });

      if (!membership) {
        throw new UnauthorizedException(
          'User is not associated with any organization',
        );
      }

      const token = this.jwtService.sign({
        user_id: user.user_id,
        org_id: membership.organization.org_id,
        role_id: membership.role.role_id,
        role_name: membership.role.name,
        env: this.configService.get('NODE_ENV'),
        iat: Math.floor(new Date().getTime() / 1000),
      });

      const request_meta = {
        ip:
          request.ip ||
          request.headers['x-forwarded-for'] ||
          request.socket.remoteAddress,
        user_agent: request.headers['user-agent'],
      };

      await this.rabitmqService.publishMessage([
        {
          worker: 'activity',
          message: {
            action: 'log',
            type: 'activity',
            data: {
              entity_id: user.user_id,
              org_id: membership.organization.org_id,
              activity: `${user.first_name} logged in`,
              entity: 'user',
              resource: 'Auth',
              event: 'Login',
              event_date: new Date(),
              request: request_meta,
            },
          },
        },
      ]);
      return {
        user,
        organization: membership.organization,
        role: membership.role,
        token,
      };
    } catch (error) {
      throw error;
    }
  }
}
