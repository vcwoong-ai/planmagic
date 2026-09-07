// 공고문 분석 결과
export interface AnnouncementAnalysis {
  title: string;
  agency: string;
  budget: string;
  deadline: string;
  evaluationCriteria: EvaluationCriterion[];
  requiredSections: string[];
  targetAudience: string;
  rawText: string;
}

export interface EvaluationCriterion {
  category: string;
  weight: number; // 배점
  description: string;
  keywords: string[];
}

// 인터뷰 답변
export interface InterviewAnswers {
  // 1. 팀/창업자
  founderBackground: string;
  teamMembers: string;
  // 2. 제품/서비스
  productDescription: string;
  problemSolving: string;
  uniqueValue: string;
  // 3. 시장
  targetMarket: string;
  marketSize: string;
  competitors: string;
  competitiveAdvantage: string;
  // 4. 비즈니스 모델
  revenueModel: string;
  pricingStrategy: string;
  // 5. 실행 계획
  currentStatus: string;
  milestones: string;
  fundUsage: string;
  // 6. 기타
  achievements: string;
  partnerships: string;
}

// 생성된 사업계획서
export interface BusinessPlan {
  id: string;
  createdAt: Date;
  announcementTitle: string;
  sections: BusinessPlanSection[];
  selfDiagnosticReport: SelfDiagnosticReport;
}

export interface BusinessPlanSection {
  title: string;
  content: string;
  evaluationCriterion?: EvaluationCriterion;
  score?: number; // 자가진단 점수
}

export interface SelfDiagnosticReport {
  totalScore: number;
  maxScore: number;
  percentage: number;
  criteriaScores: {
    category: string;
    weight: number;
    estimatedScore: number;
    feedback: string;
  }[];
  strengths: string[];
  improvements: string[];
}

// API 요청/응답 타입
export interface ParseRequest {
  fileBase64: string;
  fileName: string;
}

export interface ParseResponse {
  success: boolean;
  analysis?: AnnouncementAnalysis;
  error?: string;
}

export interface GenerateRequest {
  analysis: AnnouncementAnalysis;
  answers: InterviewAnswers;
}

export interface GenerateResponse {
  success: boolean;
  plan?: BusinessPlan;
  error?: string;
}
