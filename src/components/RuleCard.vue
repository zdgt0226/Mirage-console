<script setup lang="ts">
import { reactive } from 'vue'
import StatBadge from './StatBadge.vue'
import type { Rule, RuleField } from '@/api/types'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  rule: Rule
  /** 卡片左上角序号 (1 基)。 */
  index: number
  fields: ReadonlyArray<readonly [RuleField, string]>
  /** outbound 输入框绑定的 datalist id。 */
  listId: string
  canMoveUp?: boolean
  canMoveDown?: boolean
}>()

const emit = defineEmits<{ remove: []; move: [dir: -1 | 1] }>()
const { t } = useI18n()

/** 每个字段一个待添加值的输入缓冲。 */
const draft = reactive<Record<string, string>>({})

function values(key: RuleField): (string | number)[] {
  return (props.rule[key] as (string | number)[] | undefined) ?? []
}

function addItem(key: RuleField) {
  const raw = (draft[key] ?? '').trim()
  if (!raw) return
  let value: string | number = raw
  if (key === 'port') {
    const n = parseInt(raw, 10)
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      alert(t('save.portErr'))
      return
    }
    value = n
  }
  const list = (props.rule[key] as (string | number)[] | undefined) ?? []
  ;(props.rule as Record<string, unknown>)[key] = [...list, value]
  draft[key] = ''
}

function removeItem(key: RuleField, i: number) {
  const list = [...values(key)]
  list.splice(i, 1)
  if (list.length) (props.rule as Record<string, unknown>)[key] = list
  // 空数组要删掉，否则后端会当成"匹配空集"。
  else delete (props.rule as Record<string, unknown>)[key]
}
</script>

<template>
  <div class="rule-card">
    <div class="rule-top">
      <span class="rule-n">{{ String(index).padStart(2, '0') }}</span>
      <StatBadge :tag="rule.outbound || 'direct'" />
      <div class="row-actions">
        <button v-if="canMoveUp" class="btn-add" title="Up" @click="emit('move', -1)">↑</button>
        <button v-if="canMoveDown" class="btn-add" title="Down" @click="emit('move', 1)">↓</button>
        <button class="btn-remove" @click="emit('remove')">{{ t('btn.delete') }}</button>
      </div>
    </div>

    <div class="rule-fields">
      <div class="rule-field">
        <label>Outbound</label>
        <input v-model="rule.outbound" :list="listId" placeholder="e.g. proxy, direct" />
      </div>

      <div v-for="[key, label] in fields" :key="key" class="rule-field">
        <label>{{ label }}</label>
        <div class="field-input">
          <input v-model="draft[key]" :placeholder="t('fld.add')" @keypress.enter="addItem(key)" />
          <button class="btn-add" @click="addItem(key)">+</button>
        </div>
        <div class="rule-tags-container">
          <div v-for="(v, vi) in values(key)" :key="String(v) + vi" class="rule-tag">
            {{ v }} <span @click="removeItem(key, vi)">×</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.field-input {
  display: flex;
  gap: 6px;
}
</style>
