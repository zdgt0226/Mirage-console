<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/api/client'
import type { UserOp, UsersResp } from '@/api/types'
import { useApi } from '@/composables/useApi'
import { useI18n } from '@/composables/useI18n'
import { usePolling } from '@/composables/usePolling'
import { fmtB } from '@/utils/format'

const { t } = useI18n()
const { data: users, load: loadUsers } = useApi<UsersResp>(api.users, {})

const newName = ref('')
const newPass = ref('')

usePolling(loadUsers, 3000)

// 单条 op: 先 dry_run 预检, 通过再真写, 然后刷新。password 只在此发出 (upsert), 绝不从 GET 拿。
async function applyOp(op: UserOp, okMsg?: string) {
  try {
    const dry = await api.saveUsers([op], true)
    if (dry.status !== 'success') {
      alert(t('save.invalid') + '\n' + (dry.message ?? ''))
      return
    }
    const res = await api.saveUsers([op], false)
    if (res.status === 'success') {
      if (okMsg) alert(okMsg)
      await loadUsers()
    } else {
      alert(res.message ?? t('save.failed'))
    }
  } catch {
    alert(t('save.failed'))
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
              <th class="r">{{ t('th.conns') }}</th>
              <th class="r">↑ / ↓</th>
              <th class="r">{{ t('user.active') }}</th>
              <th class="r">{{ t('user.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!(users.users ?? []).length">
              <td colspan="5" class="empty">{{ t('user.none') }}</td>
            </tr>
            <tr v-for="u in users.users ?? []" v-else :key="u.name">
              <td class="target mono">
                {{ u.name }}
                <span v-if="u.name === 'default'" class="tag tag-main">{{ t('user.mainPw') }}</span>
                <span v-else-if="!u.in_config" class="tag tag-orphan">{{ t('user.orphan') }}</span>
              </td>
              <td class="r mono dim">{{ u.conns.toLocaleString() }}</td>
              <td class="r mono">↑{{ fmtB(u.up) }} <span class="dim">/</span> ↓{{ fmtB(u.down) }}</td>
              <td class="r mono" :class="{ dim: !u.active }">{{ u.active }}</td>
              <td class="r">
                <span v-if="u.name === 'default' || !u.in_config" class="dim">—</span>
                <span v-else class="act-cell">
                  <button class="btn-min" @click="changePassword(u.name)">{{ t('user.changePw') }}</button>
                  <button class="btn-min btn-danger" @click="removeUser(u.name)">{{ t('user.remove') }}</button>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
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
}
.btn-min {
  padding: 3px 9px;
  border: 1px solid var(--border, #333);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
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
.tag-main {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}
.tag-orphan {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}
</style>
