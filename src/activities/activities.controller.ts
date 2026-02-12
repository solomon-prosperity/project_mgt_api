import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivitiesServices } from './activities.service';
import { GetOwnActivitiesDto } from './dto/get-own-activities.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { IUser } from 'src/common/utils/interfaces';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { PermissionsGuard } from 'src/common/guards/permission.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@ApiTags('Activities')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard, PermissionsGuard)
@Controller('/activities')
export class ActivityController {
  constructor(private readonly activitiesService: ActivitiesServices) {}

  @ApiOperation({ summary: 'Get User Own Activities' })
  @Permissions(['view_own_activity'])
  @Get()
  async findAll(
    @Query() query: GetOwnActivitiesDto,
    @CurrentUser() user: IUser,
  ) {
    const response = await this.activitiesService.findAll({
      ...query,
      entity_id: query.entity_id || user.user_id,
      entity: query.entity,
      org_id: user.org_id,
    });
    return {
      response,
      message: 'Activities retrieved successfully',
    };
  }
}
