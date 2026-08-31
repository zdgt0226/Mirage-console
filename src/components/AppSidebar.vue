<script setup lang="ts">
import { computed, watch } from 'vue'
import { useAppState, type ViewId } from '@/composables/useAppState'
import { useI18n } from '@/composables/useI18n'
import { useTheme } from '@/composables/useTheme'
import type { RunMode } from '@/api/types'

const emit = defineEmits<{ openSettings: [] }>()

const { t, otherLangLabel, toggleLang } = useI18n()
const { isDark, toggleTheme } = useTheme()
const { view, mode, connections, setView } = useAppState()

type NavItem = { id: ViewId; icon: string; mode?: RunMode; badge?: boolean }
type NavSection = { label: string; mode?: RunMode; items: NavItem[] }

const ICONS = {
  overview:
    '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  connections: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  logs: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  routing:
    '<circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="12" r="2.4"/><path d="M8 6h5a3 3 0 013 3M8 18h5a3 3 0 003-3"/>',
  devices: '<rect x="4" y="4" width="16" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  clients: '<circle cx="9" cy="8" r="3"/><path d="M4 20a5 5 0 0110 0M16 6a3 3 0 010 6M15 20a5 5 0 00-1-3.2"/>',
}

const SECTIONS: NavSection[] = [
  {
    label: 'nav.monitor',
    items: [
      { id: 'overview', icon: ICONS.overview },
      { id: 'connections', icon: ICONS.connections, badge: true },
      { id: 'logs', icon: ICONS.logs },
    ],
  },
  { label: 'nav.control', mode: 'client', items: [{ id: 'routing', icon: ICONS.routing, mode: 'client' }] },
  {
    label: 'nav.admin',
    items: [
      { id: 'devices', icon: ICONS.devices, mode: 'client' },
      { id: 'clients', icon: ICONS.clients, mode: 'server' },
    ],
  },
]

/** 后端还没报模式前不隐藏任何入口 (与旧版 data-mode 默认可见一致)。 */
const visible = (m?: RunMode) => !m || !mode.value || m === mode.value

const sections = computed(() =>
  SECTIONS.filter((s) => visible(s.mode))
    .map((s) => ({ ...s, items: s.items.filter((i) => visible(i.mode)) }))
    .filter((s) => s.items.length),
)

// 模式切换后当前视图可能已隐藏，退回概览。
watch(sections, (list) => {
  if (!list.some((s) => s.items.some((i) => i.id === view.value))) setView('overview')
})

const brandSub = computed(() => (mode.value === 'server' ? t('brand.sub.server') : t('brand.sub')))

const SUN =
  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>'
const MOON = '<path d="M21 12.8A8.5 8.5 0 1111.2 3a6.5 6.5 0 009.8 9.8z"/>'
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M3 12h4l2 6 4-14 2 8h6" />
        </svg>
      </div>
      <div>
        <div class="brand-name">Mirage</div>
        <div class="brand-sub">{{ brandSub }}</div>
      </div>
    </div>

    <nav class="nav">
      <template v-for="s in sections" :key="s.label">
        <div class="nav-label">{{ t(s.label) }}</div>
        <button
          v-for="item in s.items"
          :key="item.id"
          class="nav-item"
          :class="{ active: view === item.id }"
          @click="setView(item.id)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="item.icon"></svg>
          <span>{{ t('nav.' + item.id) }}</span>
          <span v-if="item.badge" class="count num">{{ connections }}</span>
        </button>
      </template>
    </nav>

    <div class="sidebar-foot">
      <span class="ver mono">v0.10.1</span>
      <div class="foot-actions">
        <button class="icon-btn lang" :title="t('set.open')" @click="emit('openSettings')">⚙</button>
        <button class="icon-btn lang" title="Language" aria-label="Language" @click="toggleLang">
          {{ otherLangLabel }}
        </button>
        <button class="icon-btn" title="Toggle theme" aria-label="Toggle theme" @click="toggleTheme">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="isDark ? SUN : MOON"></svg>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 20px 16px;
}
.brand-mark {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: linear-gradient(150deg, var(--accent), var(--down));
  color: #fff;
  flex: none;
}
.brand-mark svg {
  width: 17px;
  height: 17px;
}
.brand-name {
  font-weight: 700;
  letter-spacing: -0.2px;
  font-size: 15px;
}
.brand-sub {
  font-size: 11px;
  color: var(--faint);
  margin-top: -2px;
}
.nav {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--faint);
  padding: 12px 10px 6px;
  font-weight: 600;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 8px 10px;
  border-radius: 8px;
  color: var(--muted);
  cursor: pointer;
  font-weight: 500;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  font-family: inherit;
  font-size: 14px;
  transition:
    background 0.12s,
    color 0.12s;
}
.nav-item svg {
  width: 17px;
  height: 17px;
  flex: none;
  opacity: 0.85;
}
.nav-item:hover {
  background: var(--surface-2);
  color: var(--text);
}
.nav-item.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.nav-item .count {
  margin-left: auto;
  font-size: 11px;
  color: var(--faint);
}
.nav-item.active .count {
  color: var(--accent);
}
.sidebar-foot {
  margin-top: auto;
  padding: 14px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ver {
  font-size: 11px;
  color: var(--faint);
}
.foot-actions {
  display: flex;
  gap: 6px;
}
.icon-btn.lang {
  width: auto;
  padding: 0 9px;
  font-weight: 600;
  font-size: 12px;
}
</style>
