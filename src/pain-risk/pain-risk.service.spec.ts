import { PainRiskService } from './pain-risk.service';

describe('PainRiskService', () => {
  let service: PainRiskService;

  beforeEach(() => {
    service = new PainRiskService();
  });

  it('blocks an exercise that affects a painful area', () => {
    expect(
      service.checkExercisePainRisk('杠铃深蹲', ['左膝疼痛']),
    ).toEqual({
      risk: 'HIGH',
      blocked: true,
      reason: '动作涉及当前疼痛区域，不建议增加负荷',
    });
  });

  it('allows an exercise unrelated to the painful area', () => {
    expect(
      service.checkExercisePainRisk('二头弯举', ['左膝疼痛']),
    ).toEqual({
      risk: 'LOW',
      blocked: false,
      reason: '未检测到明显动作风险',
    });
  });
});
