<script setup lang="ts">
import type { SigninStreamEvent, SigninPhase } from '~/types/index'

interface ProgressEntry {
  id: number
  phase?: SigninPhase
  message: string
  detail?: string
  status: 'pending' | 'done' | 'error'
}

interface UserResult {
  user_id: string
  user_name: string
  success: boolean
  code?: number | null
  message?: string
}

const props = defineProps<{
  events: SigninStreamEvent[]
  mode: 'qr' | 'digital'
  streaming: boolean
}>()

let _idCounter = 0

// Phase → human label + icon
const phaseLabel: Record<string, string> = {
  save_scan: '保存扫码记录',
  parse_qr: '解析二维码',
  fetch_users: '获取用户列表',
  filter_absence: '请假过滤',
  signing: '并发签到',
  fetch_rollcalls: '查询签到任务',
  brute_force: '遍历破解签到码',
  brute_force_progress: '遍历进度',
  brute_force_found: '找到签到码',
  notify: '发送通知',
  save_log: '保存日志',
}

const phaseIcon: Record<string, string> = {
  save_scan: 'i-carbon-save',
  parse_qr: 'i-carbon-qr-code',
  fetch_users: 'i-carbon-user-multiple',
  filter_absence: 'i-carbon-filter',
  signing: 'i-carbon-checkmark-outline',
  fetch_rollcalls: 'i-carbon-task',
  brute_force: 'i-carbon-generate-pdf',
  brute_force_progress: 'i-carbon-circle-dash',
  brute_force_found: 'i-carbon-checkmark-filled',
  notify: 'i-carbon-notification',
  save_log: 'i-carbon-notebook',
}

// Derive structured state from raw events
const progressList = computed<ProgressEntry[]>(() => {
  const map = new Map<string, ProgressEntry>()
  for (const ev of props.events) {
    if (ev.type === 'progress' && ev.phase) {
      const key = ev.phase
      const existing = map.get(key)
      // brute_force_progress: update in place (same phase key)
      if (existing) {
        existing.message = ev.message ?? existing.message
        existing.detail = ev.detail ?? existing.detail
      }
      else {
        map.set(key, {
          id: ++_idCounter,
          phase: ev.phase,
          message: ev.message ?? phaseLabel[ev.phase] ?? ev.phase,
          detail: ev.detail,
          status: 'pending',
        })
      }
    }
  }

  // Mark entries as done if a later phase appeared or if done event fired
  const phases = Array.from(map.keys())
  const lastIdx = phases.length - 1
  return phases.map((phase, idx) => {
    const entry = map.get(phase)!
    const isDone = idx < lastIdx || !props.streaming
    return { ...entry, status: isDone ? ('done' as const) : ('pending' as const) }
  })
})

const userResults = computed<UserResult[]>(() =>
  props.events
    .filter(e => e.type === 'user_result')
    .map(e => ({
      user_id: e.user_id ?? '',
      user_name: e.user_name ?? '',
      success: e.success ?? false,
      code: e.code,
      message: e.message,
    })),
)

const doneEvent = computed(() =>
  props.events.find(e => e.type === 'done'),
)

const errorEvent = computed(() =>
  props.events.find(e => e.type === 'error'),
)

const bruteForceProgress = computed(() => {
  // last brute_force_progress event's detail looks like "已完成 N%"
  const evs = props.events.filter(
    e => e.type === 'progress' && e.phase === 'brute_force_progress',
  )
  if (!evs.length) return null
  return evs[evs.length - 1]
})

const bruteForcePercent = computed<number>(() => {
  const detail = bruteForceProgress.value?.detail ?? ''
  const match = detail.match(/(\d+)%/)
  return match ? Number.parseInt(match[1]) : 0
})

const overallSuccess = computed(() => doneEvent.value?.success ?? false)
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- ── Header ── -->
    <div class="flex items-center gap-2.5">
      <div
        class="h-8 w-8 flex flex-shrink-0 items-center justify-center rounded-xl"
        :class="
          errorEvent
            ? 'bg-rose-500/15 text-rose-400'
            : doneEvent
              ? overallSuccess
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-amber-500/15 text-amber-400'
              : 'bg-sky-500/15 text-sky-400'
        "
      >
        <div
          text-sm
          :class="[
            errorEvent
              ? 'i-carbon-warning-alt'
              : doneEvent
                ? overallSuccess
                  ? 'i-carbon-checkmark-filled'
                  : 'i-carbon-warning-filled'
                : 'i-carbon-circle-dash animate-spin',
          ]"
        />
      </div>
      <div>
        <div class="text-sm text-slate-100 font-medium">
          {{ mode === 'qr' ? '扫码签到' : '数字签到' }}
          <span v-if="doneEvent" class="ml-1.5 text-xs font-normal" :class="overallSuccess ? 'text-emerald-400' : 'text-amber-400'">
            · {{ doneEvent.summary }}
          </span>
          <span v-else-if="errorEvent" class="ml-1.5 text-xs font-normal text-rose-400">
            · 签到失败
          </span>
        </div>
        <div class="mt-0.5 text-xs text-slate-500">
          <template v-if="streaming && !doneEvent && !errorEvent">
            正在处理中...
          </template>
          <template v-else-if="doneEvent">
            完成
          </template>
        </div>
      </div>
    </div>

    <!-- ── Progress Steps ── -->
    <div
      v-if="progressList.length"
      class="overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/40"
    >
      <div
        v-for="(entry, idx) in progressList"
        :key="entry.phase"
        class="flex items-start gap-2.5 px-3.5 py-2.5 text-xs transition-colors"
        :class="[
          idx !== progressList.length - 1 ? 'border-b border-slate-800/40' : '',
          entry.status === 'done' ? 'opacity-75' : '',
        ]"
      >
        <!-- Icon column -->
        <div class="mt-0.5 flex-shrink-0">
          <!-- brute_force_progress: show mini progress bar indicator -->
          <div
            v-if="entry.phase === 'brute_force_progress'"
            class="h-4 w-4 flex items-center justify-center"
          >
            <div
              class="i-carbon-circle-dash animate-spin text-sky-400"
            />
          </div>
          <div
            v-else-if="entry.status === 'pending'"
            :class="phaseIcon[entry.phase ?? ''] ?? 'i-carbon-circle-dash'"
            class="animate-pulse text-sky-400"
          />
          <div
            v-else
            :class="phaseIcon[entry.phase ?? ''] ?? 'i-carbon-checkmark'"
            class="text-slate-500"
          />
        </div>

        <!-- Content column -->
        <div class="min-w-0 flex-1">
          <div
            class="font-medium"
            :class="entry.status === 'pending' ? 'text-sky-300' : 'text-slate-400'"
          >
            {{ entry.message }}
          </div>
          <div v-if="entry.detail" class="mt-0.5 text-slate-600 break-words">
            {{ entry.detail }}
          </div>

          <!-- Brute-force progress bar -->
          <div
            v-if="entry.phase === 'brute_force_progress' && streaming"
            class="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800"
          >
            <div
              class="h-full rounded-full bg-sky-500 transition-all duration-300"
              :style="{ width: `${bruteForcePercent}%` }"
            />
          </div>
        </div>

        <!-- Status dot -->
        <div class="mt-1 flex-shrink-0">
          <div
            class="h-1.5 w-1.5 rounded-full"
            :class="
              entry.status === 'pending'
                ? 'bg-sky-400 animate-pulse'
                : 'bg-slate-700'
            "
          />
        </div>
      </div>
    </div>

    <!-- ── Error Banner ── -->
    <div
      v-if="errorEvent"
      class="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-400"
    >
      <div class="flex items-start gap-2">
        <div class="i-carbon-warning-alt mt-0.5 flex-shrink-0" />
        <span class="break-words">{{ errorEvent.message }}</span>
      </div>
    </div>

    <!-- ── User Results ── -->
    <div v-if="userResults.length" class="flex flex-col gap-1.5">
      <div class="px-0.5 text-xs text-slate-600 font-medium">
        签到结果
      </div>
      <div
        v-for="result in userResults"
        :key="result.user_id"
        class="flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs"
        :class="
          result.success
            ? 'border-emerald-500/15 bg-emerald-500/5'
            : 'border-rose-500/15 bg-rose-500/5'
        "
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="h-6 w-6 flex flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            :class="
              result.success
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/20 text-rose-300'
            "
          >
            {{ [...result.user_name][0] }}
          </div>
          <div class="min-w-0">
            <div class="text-slate-200 font-medium">
              {{ result.user_name }}
            </div>
            <div
              v-if="!result.success && result.message"
              class="mt-0.5 truncate text-rose-400/80"
            >
              {{ result.message }}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <span
            class="rounded-full px-2 py-0.5 font-mono text-xs font-medium"
            :class="
              result.success
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-rose-500/15 text-rose-400'
            "
          >
            {{ result.code ?? (result.success ? '✓' : '✗') }}
          </span>
        </div>
      </div>
    </div>

    <!-- ── Pending user slots (skeleton while streaming) ── -->
    <div
      v-else-if="streaming && !errorEvent"
      class="flex flex-col gap-1.5"
    >
      <div class="px-0.5 text-xs text-slate-700 font-medium">
        等待签到结果...
      </div>
      <div
        v-for="i in 2"
        :key="i"
        class="flex animate-pulse items-center gap-2.5 rounded-xl border border-slate-800/40 bg-slate-900/40 px-3.5 py-2.5"
      >
        <div class="h-6 w-6 flex-shrink-0 rounded-full bg-slate-800" />
        <div class="h-3 w-20 rounded bg-slate-800" />
        <div class="ml-auto h-4 w-10 rounded-full bg-slate-800" />
      </div>
    </div>
  </div>
</template>
