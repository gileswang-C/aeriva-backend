import { Module } from '@nestjs/common';
import { PainRiskService } from './pain-risk.service';

@Module({
  providers: [PainRiskService],
  exports: [PainRiskService],
})
export class PainRiskModule {}
