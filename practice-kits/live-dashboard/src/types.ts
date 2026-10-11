export type Range = '1h' | '24h'
export type Metrics = { range: Range; ts: string; activeUsers: number; rps: number; errorRate: number; requests: number }
