import { Module, Global } from '@nestjs/common';
import { ActivitiesModule } from './activities/actvities.module';

@Global()
@Module({
  imports: [ActivitiesModule],
  providers: [],
  exports: [],
})
export class ConsumersModule {}
