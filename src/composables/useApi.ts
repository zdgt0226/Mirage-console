import { ref, shallowRef, type Ref } from 'vue'

/**
 * 一个接口一份状态: data / error / load()。
 * 后端不可达时保留上一次数据 (仪表盘不闪空)，只置 error。
 */
export function useApi<T>(fetcher: () => Promise<T>, initial: T) {
  const data = shallowRef(initial) as Ref<T>
  const error = ref<string | null>(null)
  const loaded = ref(false)

  const load = async () => {
    try {
      data.value = await fetcher()
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loaded.value = true
    }
  }

  return { data, error, loaded, load }
}
