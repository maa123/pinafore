import { cleanupOldStatuses } from './cleanup'
import { OBJECT_STORE, getDatabase } from './shared'
import { toReversePaddedBigInt, transformStatusForStorage } from './utils'

export async function getTimeline(instanceName, timeline, maxId = null, limit = 20) {
  const db = await getDatabase(instanceName, timeline)
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(OBJECT_STORE, 'readonly')
    const store = tx.objectStore(OBJECT_STORE)
    const index = store.index('pinafore_id_as_negative_big_int')
    let sinceAsNegativeBigInt = maxId ? toReversePaddedBigInt(maxId) : null
    let query = sinceAsNegativeBigInt ? IDBKeyRange.lowerBound(sinceAsNegativeBigInt, false) : null

    let res
    index.getAll(query, limit).onsuccess = (e) => {
      res = e.target.result
    }

    tx.oncomplete = () => resolve(res)
    tx.onerror = () => reject(tx.error.name + ' ' + tx.error.message)
  })
}

export async function insertStatuses(instanceName, timeline, statuses) {
  cleanupOldStatuses()
  const db = await getDatabase(instanceName, timeline)
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(OBJECT_STORE, 'readwrite')
    const store = tx.objectStore(OBJECT_STORE)
    for (let status of statuses) {
      store.put(transformStatusForStorage(status))
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error.name + ' ' + tx.error.message)
  })
}