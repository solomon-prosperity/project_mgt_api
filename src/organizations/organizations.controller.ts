import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IUser } from '../common/utils/interfaces';

@ApiTags('Organizations')
@Controller('orgs')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization and owner' })
  async create(@Body() payload: CreateOrganizationDto) {
    const result = await this.organizationsService.create(payload);
    return {
      message: 'Organization created successfully!',
      response: result,
    };
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get organization details' })
  async findOne(@Param('id') id: string, @CurrentUser() user: IUser) {
    const result = await this.organizationsService.findOne(id, user.user_id);
    return {
      message: 'Organization details retrieved successfully!',
      response: result,
    };
  }
}
