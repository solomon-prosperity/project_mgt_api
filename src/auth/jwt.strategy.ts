import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload } from './interfaces/auth.interfaces';
import { UserStatus } from 'src/users/enums/user.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: IJwtPayload) {
    const { user_id, org_id, env } = payload;
    if (env !== this.configService.get('NODE_ENV')) {
      throw new UnauthorizedException(
        `You cannot use ${env} tokens for ${this.configService.get('NODE_ENV')} environment`,
      );
    }

    const user = await this.usersService.findOne({ user_id });
    if (!user) throw new UnauthorizedException('Invalid Token');

    if (user.status === UserStatus.LOCKED)
      throw new UnauthorizedException(
        'Your account is currently locked, please reset your password',
      );
    if (user.status === UserStatus.SUSPENDED)
      throw new UnauthorizedException(
        'Your account has been suspended. Please contact support.',
      );
    if (user.status === UserStatus.DELETED)
      throw new UnauthorizedException(
        'Your account has been deleted. Please contact support.',
      );

    // Fetch complete membership context for RBAC
    const membership = await this.usersService.findMembership(user_id, org_id);

    return {
      ...user,
      org_id,
      role: membership?.role,
    };
  }
}
