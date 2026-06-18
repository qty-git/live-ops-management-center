import { getCloudBaseApp } from '../../shared/storage/cloudbase'
import type { TimelineStore } from './types'
import { normalizeStore } from './storage'

const COLLECTION_NAME = import.meta.env.VITE_CLOUDBASE_TIMELINE_COLLECTION || 'timeline_stores'
const DOCUMENT_ID = import.meta.env.VITE_CLOUDBASE_TIMELINE_DOCUMENT_ID || 'main'

interface CloudTimelineDocument {
  store?: TimelineStore
  updatedAt?: number
  updatedAtText?: string
  appName?: string
}

export async function loadTimelineStoreFromCloud(): Promise<TimelineStore | null> {
  const app = await getCloudBaseApp()
  if (!app) return null

  const db = app.database()
  const result = await withTimeout(db.collection(COLLECTION_NAME).doc(DOCUMENT_ID).get(), 12000, 'CloudBase 数据读取超时')
  const doc = extractCloudDocument(result)
  if (!doc?.store || doc.store.version !== 1) return null

  return normalizeStore(doc.store)
}

export async function saveTimelineStoreToCloud(store: TimelineStore): Promise<void> {
  const app = await getCloudBaseApp()
  if (!app) return

  const db = app.database()
  await withTimeout(db.collection(COLLECTION_NAME).doc(DOCUMENT_ID).set({
    appName: 'live-ops-management-center',
    store,
    updatedAt: Date.now(),
    updatedAtText: new Date().toISOString(),
  } satisfies CloudTimelineDocument), 12000, 'CloudBase 数据保存超时')
}

function extractCloudDocument(result: { data?: unknown }): CloudTimelineDocument | null {
  const data = result.data
  if (Array.isArray(data)) {
    return (data[0] as CloudTimelineDocument | undefined) ?? null
  }

  return (data as CloudTimelineDocument | null) ?? null
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
