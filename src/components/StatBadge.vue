<script setup lang="ts">
import { computed } from 'vue'
import { badgeKind } from '@/utils/format'

const props = defineProps<{ tag: string | undefined; label?: string }>()
const kind = computed(() => badgeKind(props.tag))
</script>

<template>
  <span class="badge" :class="kind">{{ label ?? tag }}</span>
</template>
