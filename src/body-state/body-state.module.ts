import { Module } from '@nestjs/common';
import { BodyStateController } from './body-state.controller';
import { BodyStateService } from './body-state.service';

@Module({
  controllers: [
    BodyStateController,
  ],
  providers: [
    BodyStateService,
  ],
  exports: [
    BodyStateService,
  ],
})
export class BodyStateModule {}
