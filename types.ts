
export interface Match {
  id: string;
  league: 'NHL' | 'SHL' | 'Allsvenskan';
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  startTimeFormatted?: string;
  marketOdd: number;
  marketProb: number;
  actualProb?: number;
  delta?: number;
  aiProbability?: number;
  reasoning?: string;
  confidence?: 'high' | 'medium' | 'low';
  expectedValue?: number;
  evTier?: {
    tier: 'STRONG' | 'ELITE' | 'SICK';
    label: string;
    emoji: string;
    color: string;
    min: number;
    max: number;
  };
  markets?: Array<{
    type: string;
    outcome: string;
    odds: number;
    impliedProb: number;
    expectedValue: number;
    aiProbability: number;
    reasoning: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
}

export interface DiscordConfig {
  webhookUrl: string;
  channelName: string;
  enabled: boolean;
}

export interface AnalysisSummary {
  bestValueMatch: Match | null;
  overallBestOddMatch: Match | null;
  timestamp: string;
}

export interface EVTier {
  tier: 'STRONG' | 'ELITE' | 'SICK';
  label: string;
  emoji: string;
  color: string;
  min: number;
  max: number;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';
