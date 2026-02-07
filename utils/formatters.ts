export const formatPercentage = (value: number): string => {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
};

export const formatOdds = (odds: number): string => {
  return odds.toFixed(2);
};

export const formatProbability = (prob: number): string => {
  return `${Math.round(prob)}%`;
};

export const formatConfidence = (confidence: 'high' | 'medium' | 'low'): string => {
  return confidence.toUpperCase();
};

export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

export const getTimeSince = (timestamp: string): string => {
  const now = new Date();
  const scanTime = new Date(timestamp);
  const diffMs = now.getTime() - scanTime.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  }
  
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
};

export const isStaleData = (timestamp: string, hoursThreshold: number = 25): boolean => {
  const now = new Date();
  const scanTime = new Date(timestamp);
  const diffMs = now.getTime() - scanTime.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours > hoursThreshold;
};
