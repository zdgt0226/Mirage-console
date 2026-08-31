<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import RuleCard from './RuleCard.vue'
import { api } from '@/api/client'
import type { DeviceProfile, Rule } from '@/api/types'
import { PROFILE_FIELDS } from '@/constants/ruleFields'
import { useI18n } from '@/composables/useI18n'
import { useSaveFlow } from '@/composables/useSaveFlow'

const { t } = useI18n()
const { flash, run } = useSaveFlow()

const profiles = ref<Record<string, Rule[]>>({})
const deviceProfiles = ref<DeviceProfile[]>([])
const outbounds = ref<string[]>([])
const loaded = ref(false)

const names = computed(() => Object.keys(profiles.value))

async function load() {
  try {
    const d = await api.profiles()
    if (d.status !== 'success') return
    profiles.value = d.profiles ?? {}
    deviceProfiles.value = d.device_profiles ?? []
    outbounds.value = d.outbounds ?? []
  } catch {
    // 同 RulesEditor: 拉不到就保留当前编辑内容。
  } finally {
    loaded.value = true
  }
}
onMounted(load)

function addProfile() {
  let n = 'profile' + (names.value.length + 1)
  while (profiles.value[n]) n += '_'
  profiles.value[n] = [{ outbound: 'direct' }]
}

function removeProfile(name: string) {
  delete profiles.value[name]
  deviceProfiles.value = deviceProfiles.value.filter((d) => d.profile !== name)
}

function renameProfile(oldName: string, el: HTMLInputElement) {
  const next = el.value.trim()
  if (!next || next === oldName) {
    el.value = oldName
    return
  }
  if (profiles.value[next]) {
    alert(t('prof.nameTaken'))
    el.value = oldName
    return
  }
  // 重建对象保持键顺序，顺带把设备分配里的引用改过去。
  profiles.value = Object.fromEntries(
    Object.entries(profiles.value).map(([k, v]) => [k === oldName ? next : k, v]),
  )
  deviceProfiles.value.forEach((d) => {
    if (d.profile === oldName) d.profile = next
  })
}

const addProfileRule = (name: string) => profiles.value[name].push({ outbound: 'direct' })
const removeProfileRule = (name: string, i: number) => profiles.value[name].splice(i, 1)

const addAssignment = () =>
  deviceProfiles.value.push({ source_ip_cidr: [''], profile: names.value[0] ?? '', name: '' })
const removeAssignment = (i: number) => deviceProfiles.value.splice(i, 1)

const cidrText = (d: DeviceProfile) => (d.source_ip_cidr ?? []).join(', ')
function setCidr(d: DeviceProfile, value: string) {
  d.source_ip_cidr = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const save = () =>
  run((dry) => api.saveProfiles(profiles.value, deviceProfiles.value, dry), load)
</script>

<template>
  <div class="card">
    <div class="card-head">
      <div class="card-title">
        <span>{{ t('prof.title') }}</span><span class="hint">{{ t('prof.hint') }}</span>
      </div>
      <div class="head-actions">
        <button class="btn" @click="addProfile">{{ t('prof.addProfile') }}</button>
        <button class="btn primary" @click="save">{{ flash ? t('saved') : t('btn.save') }}</button>
      </div>
    </div>

    <div class="card-pad">
      <datalist id="profObOpts">
        <option v-for="o in outbounds" :key="o" :value="o"></option>
      </datalist>

      <div v-if="!loaded" class="empty">{{ t('empty.loading') }}</div>
      <div v-else-if="!names.length" class="empty">{{ t('prof.noProfiles') }}</div>
      <div v-for="name in names" v-else :key="name" class="rule-card profile-card">
        <div class="rule-top">
          <span class="rule-n accent">▣</span>
          <input
            class="profile-name"
            :value="name"
            @change="renameProfile(name, $event.target as HTMLInputElement)"
          />
          <div class="row-actions">
            <button class="btn-add" @click="addProfileRule(name)">{{ t('prof.addRule') }}</button>
            <button class="btn-remove" @click="removeProfile(name)">{{ t('btn.delete') }}</button>
          </div>
        </div>

        <div v-if="!profiles[name].length" class="dim no-rules">{{ t('prof.noRules') }}</div>
        <RuleCard
          v-for="(rule, i) in profiles[name]"
          v-else
          :key="i"
          :rule="rule"
          :index="i + 1"
          :fields="PROFILE_FIELDS"
          list-id="profObOpts"
          @remove="removeProfileRule(name, i)"
        />
      </div>

      <div class="sub-head assignments">
        {{ t('prof.assignments') }}
        <button class="btn-add" @click="addAssignment">+</button>
      </div>

      <div v-if="!deviceProfiles.length" class="empty">{{ t('prof.noAssign') }}</div>
      <div v-else class="scroll-x">
        <table class="tbl">
          <thead>
            <tr>
              <th>{{ t('prof.devName') }}</th>
              <th>{{ t('prof.devCidr') }}</th>
              <th>{{ t('prof.devProfile') }}</th>
              <th class="r"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in deviceProfiles" :key="i">
              <td><input v-model="d.name" class="devsel w-name" placeholder="—" /></td>
              <td>
                <input
                  class="devsel mono w-cidr"
                  placeholder="192.168.1.20/32"
                  :value="cidrText(d)"
                  @input="setCidr(d, ($event.target as HTMLInputElement).value)"
                />
              </td>
              <td>
                <select v-model="d.profile" class="devsel">
                  <option value="">—</option>
                  <option v-for="n in names" :key="n" :value="n">{{ n }}</option>
                </select>
              </td>
              <td class="r">
                <button class="btn-remove" @click="removeAssignment(i)">{{ t('btn.delete') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head-actions {
  display: flex;
  gap: 8px;
}
.profile-card {
  border-color: var(--accent);
}
.rule-n.accent {
  color: var(--accent);
}
.profile-name {
  max-width: 180px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 5px 8px;
  border-radius: 6px;
  font-family: inherit;
  font-weight: 600;
  outline: none;
}
.profile-name:focus {
  border-color: var(--accent);
}
.no-rules {
  font-size: 12px;
}
.assignments {
  display: flex;
  align-items: center;
  gap: 8px;
}
.w-name {
  width: 120px;
}
.w-cidr {
  width: 180px;
}
</style>
