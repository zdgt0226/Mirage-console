<script setup lang="ts">
import { ref, watch } from 'vue'
import { saveSettings, settings } from '@/api/settings'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const base = ref(settings.base)
const token = ref(settings.token)

// 每次打开都从当前配置回填，避免留着上次没保存的编辑。
watch(
  () => props.open,
  (open) => {
    if (!open) return
    base.value = settings.base
    token.value = settings.token
  },
)

function save() {
  saveSettings(base.value, token.value)
  emit('close')
  // 重载最省事: 所有轮询与缓存都从新后端重新起。
  location.reload()
}
</script>

<template>
  <div v-if="open" class="backdrop" @click.self="emit('close')">
    <div class="panel">
      <h3>{{ t('set.title') }}</h3>

      <label>{{ t('set.base') }}</label>
      <input v-model="base" placeholder="https://gw.example.com:9090" />

      <label>{{ t('set.token') }}</label>
      <input v-model="token" type="password" placeholder="Bearer token" @keyup.enter="save" />

      <div class="actions">
        <button class="btn" @click="emit('close')">{{ t('set.close') }}</button>
        <button class="btn primary" @click="save">{{ t('set.save') }}</button>
      </div>

      <p class="note">{{ t('set.note') }}</p>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.panel {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 22px;
  border-radius: 12px;
  width: min(420px, 92vw);
  box-shadow: var(--shadow);
}
h3 {
  margin: 0 0 12px;
  font-size: 15px;
}
label {
  display: block;
  margin: 12px 0 5px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--faint);
  font-weight: 600;
}
input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  font-family: inherit;
  font-size: 13px;
  outline: none;
}
input:focus {
  border-color: var(--accent);
}
.actions {
  margin-top: 18px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.note {
  margin: 14px 0 0;
  color: var(--faint);
  font-size: 12px;
  line-height: 1.5;
}
</style>
