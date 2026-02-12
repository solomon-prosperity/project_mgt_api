import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  HttpCode,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
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
import { PaginationDto } from './dto/pagination.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IUser } from '../common/utils/interfaces';

@ApiTags('Projects')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard, PermissionsGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @ApiOperation({ summary: 'Create a new project' })
  @ApiBody({ type: CreateProjectDto })
  @Permissions(['create_project'])
  @Post()
  async create(
    @Body() payload: CreateProjectDto,
    @Request() request: ExpressRequest,
    @CurrentUser() user: IUser,
  ) {
    const response = await this.projectsService.create(payload, user, request);
    return {
      response,
      message: 'Project created successfully!',
    };
  }

  @ApiOperation({ summary: 'Get all projects for the organization' })
  @ApiQuery({ type: PaginationDto })
  @Permissions(['view_project'])
  @Get()
  @HttpCode(200)
  async findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: IUser,
  ) {
    const response = await this.projectsService.findAll(
      user.org_id,
      pagination,
    );
    return {
      response,
      message: 'Projects retrieved successfully!',
    };
  }

  @ApiOperation({ summary: 'Get project details' })
  @ApiParam({ name: 'id', description: 'ID of the project' })
  @Permissions(['view_project'])
  @Get(':id')
  @HttpCode(200)
  async findOne(@Param('id') id: string, @CurrentUser() user: IUser) {
    const response = await this.projectsService.findOne(id, user.org_id);
    return {
      response,
      message: 'Project retrieved successfully!',
    };
  }

  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', description: 'ID of the project' })
  @ApiBody({ type: UpdateProjectDto })
  @Permissions(['update_project'])
  @HttpCode(200)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateProjectDto,
    @CurrentUser() user: IUser,
    @Request() request: ExpressRequest,
  ) {
    const response = await this.projectsService.update(
      id,
      user,
      payload,
      request,
    );
    return {
      response,
      message: 'Project updated successfully!',
    };
  }

  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'id', description: 'ID of the project' })
  @Permissions(['delete_project'])
  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Request() request: ExpressRequest,
  ) {
    const response = await this.projectsService.remove(id, user, request);
    return {
      response,
      message: 'Project deleted successfully!',
    };
  }
}
