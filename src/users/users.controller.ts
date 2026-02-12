import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  HttpCode,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateOrgUserDto } from './dto/create-org-user.dto';
import { GetOrgUsersDto } from './dto/get-org-users.dto';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { PermissionsGuard } from '../common/guards/permission.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IUser } from '../common/utils/interfaces';
import { DataSource } from 'typeorm';
import { instanceToPlain } from 'class-transformer';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  @ApiOperation({ summary: 'Create a new user for the organization' })
  @ApiBody({ type: CreateOrgUserDto })
  @Permissions(['create_user'])
  @Post()
  async create(@Body() payload: CreateOrgUserDto, @CurrentUser() user: IUser) {
    const result = await this.usersService.createUserForOrg(
      user.org_id,
      payload,
      this.dataSource,
    );
    return {
      response: instanceToPlain(result),
      message: 'User created and added to organization successfully!',
    };
  }

  @ApiOperation({ summary: 'Get all users in the organization' })
  @ApiQuery({ type: GetOrgUsersDto })
  @Permissions(['view_user'])
  @Get()
  @HttpCode(200)
  async findAll(@Query() query: GetOrgUsersDto, @CurrentUser() user: IUser) {
    const response = await this.usersService.findAllForOrg(user.org_id, query);
    return {
      response: instanceToPlain(response),
      message: 'Users retrieved successfully!',
    };
  }

  @ApiOperation({ summary: 'Get user details' })
  @ApiParam({ name: 'id', description: 'ID of the user' })
  @Permissions(['view_user'])
  @Get(':id')
  @HttpCode(200)
  async findOne(@Param('id') id: string, @CurrentUser() user: IUser) {
    const response = await this.usersService.findOneForOrg(id, user.org_id);
    return {
      response: instanceToPlain(response),
      message: 'User details retrieved successfully!',
    };
  }
}
