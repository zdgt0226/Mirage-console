<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import ClientsView from '@/views/ClientsView.vue'
import ConnectionsView from '@/views/ConnectionsView.vue'
import DevicesView from '@/views/DevicesView.vue'
import LogsView from '@/views/LogsView.vue'
import OverviewView from '@/views/OverviewView.vue'
import RoutingView from '@/views/RoutingView.vue'
import { isConfigured } from '@/api/settings'
import { useAppState, type ViewId } from '@/composables/useAppState'
import { usePolling } from '@/composables/usePolling'

const { view, pollOverview } = useAppState()

// 概览轮询挂在 App 上: 顶栏速率、导航连接数、模式判定与图表历史都依赖它，切视图不能断。
usePolling(pollOverview, 1000)

const VIEWS: Record<ViewId, unknown> = {
  overview: OverviewView,
  connections: ConnectionsView,
  routing: RoutingView,
  logs: LogsView,
  devices: DevicesView,
  clients: ClientsView,
}

const settingsOpen = ref(false)
// 没配过后端地址就先弹设置，否则所有请求必然失败。
onMounted(() => {
  if (!isConfigured()) settingsOpen.value = true
})
</script>

<template>
  <div class="app">
    <AppSidebar @open-settings="settingsOpen = true" />
    <main class="main">
      <AppTopbar />
      <div class="content">
        <!-- v-if 切换: 离开的视图卸载，它的轮询也随之停掉。 -->
        <component :is="VIEWS[view]" :key="view" />
      </div>
    </main>
  </div>
  <SettingsModal :open="settingsOpen" @close="settingsOpen = false" />
</template>
