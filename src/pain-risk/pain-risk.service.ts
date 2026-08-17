import { Injectable } from '@nestjs/common';

export interface PainRiskResult {
  risk: 'HIGH' | 'LOW';
  blocked: boolean;
  reason: string;
}

@Injectable()
export class PainRiskService {
  checkExercisePainRisk(
    exerciseName: string,
    painAreas: string[],
  ): PainRiskResult {
    const rules = [
      {
        keywords: ['肩', '胸', '推'],
        painKeywords: ['肩'],
      },
      {
        keywords: ['腰', '下背', '硬拉', '划船'],
        painKeywords: ['腰', '下背'],
      },
      {
        keywords: ['腿', '深蹲', '蹬'],
        painKeywords: ['膝'],
      },
    ];

    for (const rule of rules) {
      const exerciseMatch = rule.keywords.some((keyword) =>
        exerciseName.includes(keyword),
      );

      const painMatch = rule.painKeywords.some((keyword) =>
        painAreas.some((area) => area.includes(keyword)),
      );

      if (exerciseMatch && painMatch) {
        return {
          risk: 'HIGH',
          blocked: true,
          reason: '动作涉及当前疼痛区域，不建议增加负荷',
        };
      }
    }

    return {
      risk: 'LOW',
      blocked: false,
      reason: '未检测到明显动作风险',
    };
  }
}
