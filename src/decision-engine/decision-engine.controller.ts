import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';

import { DecisionEngineService } from './decision-engine.service';

@Controller('decision')
export class DecisionEngineController {
  constructor(
    private readonly decisionEngineService: DecisionEngineService,
  ) {}

  @Get(':userId')
  async decide(
    @Param('userId')
    userId: string,
  ) {
    return {
      status: 'ok',

      data:
        await this.decisionEngineService.decide(
          userId,
        ),
    };
  }
}
