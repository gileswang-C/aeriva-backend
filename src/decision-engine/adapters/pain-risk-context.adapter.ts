import { Injectable } from '@nestjs/common';

import {
  BodyStateService,
} from '../../body-state/body-state.service';


@Injectable()
export class PainRiskContextAdapter {

  constructor(
    private readonly bodyStateService: BodyStateService,
  ) {}


  async build(
    userId: string,
  ) {

    const bodyState =
      await this.bodyStateService.getTodayReadiness(
        userId,
      );


    if (
      !bodyState ||
      !bodyState.painAreas
    ) {
      return {
        hasPain: false,

        painAreas: [],
      };
    }


    return {
      hasPain:
        bodyState.painAreas.length > 0,

      painAreas:
        bodyState.painAreas,
    };
  }
}
