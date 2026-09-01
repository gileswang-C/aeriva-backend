import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BodyMetricsController } from './body-metrics.controller';
import { BodyMetricsService } from './body-metrics.service';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    BodyMetricsController,
  ],
  providers: [
    BodyMetricsService,
  ],
  exports: [
    BodyMetricsService,
  ],
})
export class BodyMetricsModule {}
