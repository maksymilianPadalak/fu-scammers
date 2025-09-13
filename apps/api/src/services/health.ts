export type HealthStatus = {
  status: 'OK'
  timestamp: string
  env?: string
}

export const getHealthStatus = (): HealthStatus => {
  return {
    status: 'OK',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  }
}
