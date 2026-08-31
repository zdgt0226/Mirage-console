<script setup lang="ts">
import { onMounted, ref } from 'vue'
import RuleCard from './RuleCard.vue'
import { api } from '@/api/client'
import type { Rule } from '@/api/types'
import { RULE_FIELDS } from '@/constants/ruleFields'
import { useI18n } from '@/composables/useI18n'
import { useSaveFlow } from '@/composables/useSaveFlow'

const { t } = useI18n()
const { flash, run } = useSaveFlow()

const rules = ref<Rule[]>([])
const outbounds = ref<string[]>([])
const loaded = ref(false)

async function load() {
  try {
    const d = await api.rules()
    if (d.status !== 'success') return
    rules.value = d.rules ?? []
    outbounds.value = d.outbounds ?? []
  } catch {
    // 后端不可达时保持上一次内容，不要清空正在编辑的规则。
  } finally {
    loaded.value = true
  }
}
onMounted(load)

// 新规则插在最前: 首命中即用，新加的通常要优先。
const addRule = () => rules.value.unshift({ outbound: 'direct' })
const removeRule = (i: number) => rules.value.splice(i, 1)
function moveRule(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= rules.value.length) return
  const list = rules.value
  ;[list[i], list[j]] = [list[j], list[i]]
}

const save = () => run((dry) => api.saveRules(rules.value, dry), load)
</script>

<template>
  <div class="card">
    <div class="card-head">
      <div class="card-title">
        <span>{{ t('card.routingRules') }}</span><span class="hint">{{ t('card.firstMatch') }}</span>
      </div>
      <div class="head-actions">
        <button class="btn" @click="addRule">{{ t('btn.addRule') }}</button>
        <button class="btn primary" @click="save">{{ flash ? t('saved') : t('btn.save') }}</button>
      </div>
    </div>

    <div class="card-pad">
      <datalist id="outboundOptions">
        <option v-for="o in outbounds" :key="o" :value="o"></option>
      </datalist>

      <div v-if="!loaded" class="empty">{{ t('empty.loading') }}</div>
      <div v-else-if="!rules.length" class="empty">{{ t('empty.noRules') }}</div>
      <RuleCard
        v-for="(rule, i) in rules"
        v-else
        :key="i"
        :rule="rule"
        :index="i + 1"
        :fields="RULE_FIELDS"
        list-id="outboundOptions"
        :can-move-up="i > 0"
        :can-move-down="i < rules.length - 1"
        @remove="removeRule(i)"
        @move="(dir) => moveRule(i, dir)"
      />
    </div>
  </div>
</template>

<style scoped>
.head-actions {
  display: flex;
  gap: 8px;
}
</style>
