import cloudbase from '@cloudbase/js-sdk'

const DEFAULT_ENV_ID = 'liveops-prod-d7gcjjnv6edbeedb9'
const DEFAULT_REGION = 'ap-shanghai'

export interface CloudBaseConfig {
  envId: string
  region: string
  enabled: boolean
}

type CloudBaseApp = ReturnType<typeof cloudbase.init>

let appPromise: Promise<CloudBaseApp | null> | null = null

export function getCloudBaseConfig(): CloudBaseConfig {
  const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID || DEFAULT_ENV_ID
  const region = import.meta.env.VITE_CLOUDBASE_REGION || DEFAULT_REGION

  return {
    envId,
    region,
    enabled: Boolean(envId),
  }
}

export async function getCloudBaseApp(): Promise<CloudBaseApp | null> {
  const config = getCloudBaseConfig()
  if (!config.enabled) return null

  appPromise ??= createCloudBaseApp(config)
  return appPromise
}

async function createCloudBaseApp(config: CloudBaseConfig): Promise<CloudBaseApp> {
  const app = cloudbase.init({
    env: config.envId,
    region: config.region,
  })

  const auth = app.auth({ persistence: 'local' })
  const loginState = await withTimeout(auth.getLoginState(), 8000, 'CloudBase 登录态检查超时')
  if (!loginState) {
    const result = await withTimeout(auth.signInAnonymously(), 12000, 'CloudBase 匿名登录超时')
    if (result.error) {
      throw new Error(result.error.message || 'CloudBase 匿名登录失败')
    }
  }

  return app
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs)

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timer))
  })
}
