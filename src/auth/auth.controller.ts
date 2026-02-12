import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SigninDto } from './dto/signin-dto';
import { instanceToPlain } from 'class-transformer';
import { Request as ExpressRequest } from 'express';

@ApiTags('Auth')
@Controller('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Sign In' })
  @ApiBody({ type: SigninDto })
  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() payload: SigninDto, @Request() request: ExpressRequest) {
    const response = await this.authService.signIn(payload, request);
    return {
      response: instanceToPlain(response),
      message: 'Signed in successfully!',
    };
  }
}
