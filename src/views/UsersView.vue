<script setup lang="ts">
import { computed, ref } from 'vue'
import { api } from '@/api/client'
import type { UserOp, UserRow, UsersResp } from '@/api/types'
import { useApi } from '@/composables/useApi'
import { useI18n } from '@/composables/useI18n'
import { usePolling } from '@/composables/usePolling'
import { fmtB, fmtKbps } from '@/utils/format'

const { t } = useI18n()
const { data: users, load: loadUsers } = useApi<UsersResp>(api.users, {})

const newName = ref('')
const newPass = ref('')

const limitModalOpen = ref(false)
const editingUser = ref<UserRow | null>(null)
const editRateLimit = ref('')
const editQuotaGb = ref('')
const editResetDay = ref('')

usePolling(loadUsers, 3000)

// 单条 op: 先 dry_run 预检, 通过再真写, 然后刷新。password 只在此发出 (upsert), 绝不从 GET 拿。
async function applyOp(op: UserOp, okMsg?: string): Promise<boolean> {
  try {
    const dry = await api.saveUsers([op], true)
    if (dry.status !== 'success') {
      alert(t('save.invalid') + '\n' + (dry.message ?? ''))
      return false
    }
    const res = await api.saveUsers([op], false)
    if (res.status === 'success') {
      if (okMsg) alert(okMsg)
      await loadUsers()
      return true
    } else {
      alert(res.message ?? t('save.failed'))
      return false
    }
  } catch (e: any) {
    alert(e?.message ?? t('save.failed'))
    return false
  }
}

async function addUser() {
  const name = newName.value.trim()
  const password = newPass.value
  if (!name || !password) {
    alert(t('user.needNamePass'))
    return
  }
  await applyOp({ action: 'upsert', name, password }, t('user.added') + name)
  newName.value = ''
  newPass.value = ''
}

async function changePassword(name: string) {
  const password = prompt(t('user.newPassFor') + name)
  if (password == null || password === '') return
  await applyOp({ action: 'upsert', name, password }, t('user.pwChanged') + name)
}

async function removeUser(name: string) {
  if (!confirm(t('user.confirmRemove') + name + ' ?')) return
  await applyOp({ action: 'remove', name }, t('user.removed') + name)
}

function openLimits(u: UserRow) {
  editingUser.value = u
  editRateLimit.value = u.rate_limit_kbps != null ? String(u.rate_limit_kbps) : ''
  editQuotaGb.value = u.quota_gb != null ? String(u.quota_gb) : ''
  editResetDay.value = u.quota_reset_day != null ? String(u.quota_reset_day) : ''
  limitModalOpen.value = true
}

function closeLimits() {
  limitModalOpen.value = false
  editingUser.value = null
}

const previewRateLimit = computed(() => {
  const raw = editRateLimit.value.trim()
  if (!raw) return ''
  const n = Number(raw)
  if (Number.isInteger(n) && n > 0) {
    return fmtKbps(n)
  }
  return ''
})

async function saveLimits() {
  if (!editingUser.value) return

  let rateLimitVal: number | null = null
  const rawRate = editRateLimit.value.trim()
  if (rawRate !== '') {
    const r = Number(rawRate)
    if (!Number.isInteger(r) || r <= 0) {
      alert(t('user.limitErrRate'))
      return
    }
    rateLimitVal = r
  }

  let quotaVal: number | null = null
  const rawQuota = editQuotaGb.value.trim()
  if (rawQuota !== '') {
    const q = Number(rawQuota)
    if (!Number.isFinite(q) || q <= 0) {
      alert(t('user.limitErrQuota'))
      return
    }
    quotaVal = q
  }

  let resetDayVal: number | null = null
  const rawReset = editResetDay.value.trim()
  if (rawReset !== '') {
    const d = Number(rawReset)
    if (!Number.isInteger(d) || d < 1 || d > 28) {
      alert(t('user.limitErrResetDay'))
      return
    }
    resetDayVal = d
  }

  // set_limits 是三字段整体替换，必须把三个字段的最终值一起发
  const op: UserOp = {
    action: 'set_limits',
    name: editingUser.value.name,
    rate_limit_kbps: rateLimitVal,
    quota_gb: quotaVal,
    quota_reset_day: resetDayVal,
  }

  const ok = await applyOp(op, t('user.limitsSaved') + editingUser.value.name)
  if (ok) {
    closeLimits()
  }
}

async function resetQuota(name: string) {
  if (!confirm(t('user.confirmResetQuota') + name + ' ?')) return
  await applyOp({ action: 'reset_quota', name }, t('user.quotaReset') + name)
}

function usagePercent(u: UserRow): number {
  if (u.quota_gb == null || u.quota_gb <= 0) return 0
  const quotaBytes = u.quota_gb * 1024 * 1024 * 1024
  return Math.round((u.period_used_bytes / quotaBytes) * 100)
}

function formatResetDay(day: number | null | undefined): string {
  const d = day ?? 1
  return `${t('user.resetDayPrefix')}${d}${t('user.resetDaySuffix')}`
}
</script>

<template>
  <section>
    <div class="card users-card">
      <div class="card-head">
        <div class="card-title">{{ t('user.title') }}</div>
        <span class="hint dim">{{ t('user.hint') }}</span>
      </div>

      <!-- 加用户表单 -->
      <div class="card-pad add-row">
        <input v-model="newName" class="uinput" :placeholder="t('user.namePh')" />
        <input v-model="newPass" type="password" class="uinput" :placeholder="t('user.passPh')" autocomplete="new-password" />
        <button class="btn-add" @click="addUser">{{ t('user.add') }}</button>
      </div>

      <div class="scroll-x">
        <table class="tbl">
          <thead>
            <tr>
              <th>{{ t('user.name') }}</th>
              <th>{{ t('user.status') }}</th>
              <th class="r">{{ t('user.rateLimit') }}</th>
              <th>{{ t('user.monthUsage') }}</th>
              <th>{{ t('user.resetDay') }}</th>
              <th class="r">{{ t('user.active') }}</th>
              <th class="r">{{ t('th.conns') }}</th>
              <th class="r">↑ / ↓</th>
              <th class="r">{{ t('user.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!(users.users ?? []).length">
              <td colspan="9" class="empty">{{ t('user.none') }}</td>
            </tr>
            <tr v-for="u in users.users ?? []" v-else :key="u.name">
              <td class="target mono">
                {{ u.name }}
                <span v-if="u.name === 'default'" class="tag tag-main">{{ t('user.mainPw') }}</span>
                <span v-else-if="!u.in_config" class="tag tag-orphan">{{ t('user.orphan') }}</span>
              </td>
              <td>
                <span v-if="u.exhausted" class="tag tag-status tag-exhausted">{{ t('user.exhausted') }}</span>
                <span v-else class="tag tag-status tag-normal">{{ t('user.normal') }}</span>
              </td>
              <td class="r mono">
                <span v-if="u.rate_limit_kbps">{{ fmtKbps(u.rate_limit_kbps) }}</span>
                <span v-else class="dim">{{ t('user.unlimited') }}</span>
              </td>
              <td>
                <div class="usage-cell">
                  <div class="usage-info mono">
                    <template v-if="u.quota_gb != null">
                      <span>{{ fmtB(u.period_used_bytes) }} / {{ u.quota_gb }} GB</span>
                      <span class="dim">({{ usagePercent(u) }}%)</span>
                    </template>
                    <template v-else>
                      <span>{{ fmtB(u.period_used_bytes) }}</span>
                    </template>
                  </div>
                  <div v-if="u.quota_gb != null" class="usage-bar">
                    <div
                      class="usage-bar-fill"
                      :class="{ 'bar-exhausted': u.exhausted }"
                      :style="{ width: Math.min(100, usagePercent(u)) + '%' }"
                    ></div>
                  </div>
                </div>
              </td>
              <td class="mono">
                <span v-if="!u.in_config" class="dim">—</span>
                <span v-else>{{ formatResetDay(u.quota_reset_day) }}</span>
              </td>
              <td class="r mono" :class="{ dim: !u.active }">{{ u.active }}</td>
              <td class="r mono dim">{{ u.conns.toLocaleString() }}</td>
              <td class="r mono">↑{{ fmtB(u.up) }} <span class="dim">/</span> ↓{{ fmtB(u.down) }}</td>
              <td class="r">
                <span v-if="u.name === 'default' || !u.in_config" class="dim">—</span>
                <span v-else class="act-cell">
                  <button class="btn-min" @click="openLimits(u)">{{ t('user.limits') }}</button>
                  <button class="btn-min" @click="changePassword(u.name)">{{ t('user.changePw') }}</button>
                  <button class="btn-min" @click="resetQuota(u.name)">{{ t('user.resetQuota') }}</button>
                  <button class="btn-min btn-danger" @click="removeUser(u.name)">{{ t('user.remove') }}</button>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 限额编辑弹窗 -->
    <div v-if="limitModalOpen && editingUser" class="backdrop" @click.self="closeLimits">
      <div class="modal-panel">
        <div class="modal-head">
          <h3>{{ t('user.editLimitsTitle') }} — <span class="mono">{{ editingUser.name }}</span></h3>
          <button class="btn-close" @click="closeLimits">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>{{ t('user.rateLimitLabel') }}</label>
            <input
              v-model="editRateLimit"
              type="number"
              min="1"
              step="1"
              class="uinput modal-input"
              :placeholder="t('user.rateLimitPh')"
            />
            <span class="field-hint dim">
              {{ t('user.rateLimitHint') }}
              <template v-if="previewRateLimit">
                · <strong>{{ previewRateLimit }}</strong>
              </template>
            </span>
          </div>

          <div class="form-group">
            <label>{{ t('user.quotaGbLabel') }}</label>
            <input
              v-model="editQuotaGb"
              type="number"
              min="0.001"
              step="any"
              class="uinput modal-input"
              :placeholder="t('user.quotaGbPh')"
            />
            <span class="field-hint dim">{{ t('user.quotaGbHint') }}</span>
          </div>

          <div class="form-group">
            <label>{{ t('user.resetDayLabel') }}</label>
            <input
              v-model="editResetDay"
              type="number"
              min="1"
              max="28"
              step="1"
              class="uinput modal-input"
              :placeholder="t('user.resetDayPh')"
            />
            <span class="field-hint dim">{{ t('user.resetDayHint') }}</span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn" @click="closeLimits">{{ t('user.cancel') }}</button>
          <button class="btn primary" @click="saveLimits">{{ t('user.save') }}</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.users-card {
  margin-bottom: 16px;
}
.add-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.uinput {
  padding: 6px 9px;
  border: 1px solid var(--border, #333);
  border-radius: 6px;
  background: var(--input-bg, transparent);
  color: inherit;
  font: inherit;
  min-width: 160px;
}
.act-cell {
  display: inline-flex;
  gap: 5px;
  justify-content: flex-end;
  flex-wrap: nowrap;
}
.btn-min {
  padding: 3px 9px;
  border: 1px solid var(--border, #333);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}
.btn-min:hover {
  border-color: var(--accent, #10b981);
}
.btn-danger:hover {
  border-color: #ef4444;
  color: #ef4444;
}
.tag {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
}
.tag-status {
  margin-left: 0;
}
.tag-main {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}
.tag-orphan {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}
.tag-exhausted {
  background: var(--crit-soft, rgba(198, 69, 63, 0.15));
  color: var(--crit, #e5645e);
  font-weight: 600;
}
.tag-normal {
  background: var(--ok-soft, rgba(18, 152, 106, 0.12));
  color: var(--ok, #12986a);
}

/* 用量单元格与进度条 */
.usage-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 130px;
}
.usage-info {
  display: flex;
  gap: 6px;
  align-items: baseline;
  font-size: 12px;
}
.usage-bar {
  height: 5px;
  background: var(--surface-2, rgba(255, 255, 255, 0.08));
  border-radius: 999px;
  overflow: hidden;
}
.usage-bar-fill {
  height: 100%;
  background: var(--accent, #0b8ba8);
  border-radius: 999px;
  transition: width 0.3s;
}
.usage-bar-fill.bar-exhausted {
  background: var(--crit, #e5645e);
}

/* 弹窗样式 */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modal-panel {
  background: var(--surface, #1e293b);
  color: var(--text, inherit);
  border: 1px solid var(--border, #334155);
  padding: 22px;
  border-radius: 12px;
  width: min(440px, 94vw);
  box-shadow: var(--shadow, 0 4px 16px rgba(0, 0, 0, 0.2));
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.modal-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.btn-close {
  background: transparent;
  border: none;
  font-size: 20px;
  line-height: 1;
  color: var(--faint, #94a3b8);
  cursor: pointer;
  padding: 0 4px;
}
.btn-close:hover {
  color: var(--text, inherit);
}
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.form-group label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--faint, #94a3b8);
  font-weight: 600;
}
.modal-input {
  width: 100%;
  box-sizing: border-box;
}
.field-hint {
  font-size: 11.5px;
  line-height: 1.4;
}
.modal-actions {
  margin-top: 20px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
