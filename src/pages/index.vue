<script setup lang="ts">
import type {
  DigitalSigninResponse,
  ScanHistory,
  SigninHistory,
  SigninResponse,
  TodoItem,
  UserWithCookie,
} from '~/types/index'
import {
  getScanHistory,
  getSigninHistory,
  getTodos,
  getUserList,
  signin,
  signinDigital,
} from '~/api'
import { useQRPhoto } from '~/composables/qrPhoto'
import { useQRScanner } from '~/composables/qrScanner'
import { useTauriQRScanner } from '~/composables/tauriQrScanner'
import { formatRelativeTime } from '~/utils'
import { isTauri } from '~/utils/tauri'

defineOptions({
  name: 'IndexPage',
})

const userStore = useUserStore()
const router = useRouter()

// State
const step = ref<'config' | 'select-user' | 'main'>('config')
const apiUrl = ref('')
const users = ref<UserWithCookie[]>([])
const pageLoading = ref(false)
const scanLoading = ref(false)
const error = ref('')

// Recent scan history
const recentScans = ref<ScanHistory[]>([])
const lastSignin = ref<SigninHistory | null>(null)

// Todos
const todos = ref<TodoItem[]>([])
const todosError = ref<string>('')
const todosLoading = ref(false)

// User map for displaying names
const userMap = ref<Map<string, string>>(new Map())

// QR Scanner
const showScanner = ref(false)
const videoElement = ref<HTMLVideoElement | null>(null)
const { startScanning, stopScanning, isScanning, scannerMode } = useQRScanner()
const { triggerFileInput, isProcessing: _isProcessing } = useQRPhoto()
const {
  startScanning: startTauriScanning,
  stopScanning: stopTauriScanning,
  isScanning: _isTauriScanning,
} = useTauriQRScanner()

// Scan result display
const scanResult = ref<SigninResponse | null>(null)

// Digital signin dialog
const showDigitalDialog = ref(false)
const digitalCode = ref('')
const digitalResult = ref<DigitalSigninResponse | null>(null)

// Initialize
onMounted(async () => {
  if (userStore.apiEndpoint) {
    apiUrl.value = userStore.apiEndpoint
    if (userStore.userId) {
      step.value = 'main'
      await loadMainData()
    }
    else {
      step.value = 'select-user'
      await loadUsers()
    }
  }
})

// Load users
async function loadUsers() {
  try {
    pageLoading.value = true
    error.value = ''
    users.value = await getUserList()
    userMap.value = new Map(users.value.map(u => [u.id, u.name]))
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '加载用户列表失败'
  }
  finally {
    pageLoading.value = false
  }
}

// Set API endpoint
async function setApiEndpoint() {
  if (!apiUrl.value.trim()) {
    error.value = '请输入 API 端点 URL'
    return
  }

  if (apiUrl.value.trim() === '613614') {
    apiUrl.value = 'https://api.codenebula.top/tronclass'
  }

  userStore.setApiEndpoint(apiUrl.value.trim())
  step.value = 'select-user'
  await loadUsers()
}

// Select user
function selectUser(user: UserWithCookie) {
  userStore.setUserId(user.id)
  userStore.setUserName(user.name)
  step.value = 'main'
  loadMainData()
}

// Create new user
function createNewUser() {
  router.push('/create-user')
}

// Load main page data
async function loadMainData() {
  try {
    pageLoading.value = true
    todosError.value = ''
    const [scans, signins, allUsers] = await Promise.all([
      getScanHistory(3),
      getSigninHistory(1, userStore.userId),
      getUserList(),
    ])
    recentScans.value = scans
    lastSignin.value = signins.length > 0 ? signins[0] : null
    userMap.value = new Map(allUsers.map(u => [u.id, u.name]))

    todosLoading.value = true
    try {
      const todosData = await Promise.race([
        getTodos(userStore.userId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('加载待办事项超时')), 5000),
        ),
      ])
      todos.value = todosData.todo_list || []
    }
    catch (err) {
      todosError.value
        = err instanceof Error ? err.message : '加载待办事项失败'
      console.error('加载待办事项失败:', err)
    }
    finally {
      todosLoading.value = false
    }
  }
  catch (err) {
    console.error('加载数据失败:', err)
  }
  finally {
    pageLoading.value = false
  }
}

// Start QR scanning
async function startQRScan() {
  scanResult.value = null
  digitalResult.value = null

  if (userStore.scanMode === 'photo') {
    const input = triggerFileInput(handleScanResult)
    input.click()
  }
  else {
    if (isTauri()) {
      try {
        await startTauriScanning(handleScanResult)
      }
      catch (err) {
        console.warn('Tauri扫码失败，fallback到调试模式:', err)
        await debugWithLastResult()
      }
    }
    else {
      showScanner.value = true
      await nextTick()

      if (videoElement.value) {
        try {
          await startScanning(videoElement.value, handleScanResult, userStore.scanMode === 'barcode')
        }
        catch (err) {
          console.warn('无法启动摄像头，fallback到调试模式:', err)
          await debugWithLastResult()
        }
      }
    }
  }
}

// Handle scan result
async function handleScanResult(result: string) {
  if (userStore.scanMode === 'video') {
    if (isTauri()) {
      stopTauriScanning()
    }
    else {
      stopScanning()
    }
  }

  scanLoading.value = true

  try {
    const response = await signin(result, userStore.userId, userStore.notifyEnabled)
    scanResult.value = response
    await loadMainData()
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '签到失败'
  }
  finally {
    scanLoading.value = false
    showScanner.value = false
  }
}

// Close scanner
function closeScanner() {
  if (isTauri()) {
    stopTauriScanning()
  }
  else {
    stopScanning()
  }
  showScanner.value = false
}

// Navigate
function goToSettings() {
  router.push('/settings')
}

function goToHistory() {
  router.push('/history')
}

// Get user name by id
function getUserName(userId: string): string {
  return userMap.value.get(userId) || '未知用户'
}

// Start digital signin
function startDigitalSignin() {
  scanResult.value = null
  digitalResult.value = null
  digitalCode.value = ''
  showDigitalDialog.value = true
}

// Handle digital signin
async function handleDigitalSignin() {
  scanLoading.value = true
  error.value = ''

  try {
    const response = await signinDigital(
      userStore.userId,
      digitalCode.value || undefined,
      userStore.notifyEnabled,
    )
    digitalResult.value = response
    scanResult.value = null
    showDigitalDialog.value = false
    await loadMainData()
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '数字签到失败'
  }
  finally {
    scanLoading.value = false
  }
}

// Close digital dialog
function closeDigitalDialog() {
  showDigitalDialog.value = false
  digitalCode.value = ''
}

// Debug: use last scan result from backend
async function debugWithLastResult() {
  stopScanning()
  scanLoading.value = true

  try {
    const lastScans = await getScanHistory(1)
    if (lastScans.length === 0) {
      error.value = '没有历史扫描记录'
      scanLoading.value = false
      showScanner.value = false
      return
    }

    const lastScanResult = lastScans[0].result
    const response = await signin(lastScanResult, userStore.userId, userStore.notifyEnabled)
    scanResult.value = response
    await loadMainData()
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '签到失败'
  }
  finally {
    scanLoading.value = false
    showScanner.value = false
  }
}
</script>

<template>
  <div page-bg>
    <!-- ═══════════════════════════════════════ -->
    <!-- Step 1: API Configuration              -->
    <!-- ═══════════════════════════════════════ -->
    <div v-if="step === 'config'" mx-auto max-w-sm px-6 pt-28>
      <!-- Brand -->
      <div mb-12 text-center>
        <div
          class="mx-auto mb-5 h-14 w-14 flex items-center justify-center border border-emerald-500/20 rounded-2xl from-emerald-500/20 to-emerald-500/5 bg-linear-to-br"
        >
          <div i-carbon-qr-code text-2xl text-emerald-400 />
        </div>
        <h1 text-2xl text-slate-50 font-semibold tracking-tight>
          畅课签到助手
        </h1>
        <p mt-2 text-sm text-slate-500>
          连接你的 API 端点以开始
        </p>
      </div>

      <!-- Input -->
      <div mb-4>
        <input
          v-model="apiUrl"
          type="url"
          placeholder="https://api.example.com"
          input-base w-full px-4 py-3 text-sm
          @keydown.enter="setApiEndpoint"
        >
      </div>

      <button
        btn-primary w-full py-3 text-sm
        :disabled="pageLoading"
        @click="setApiEndpoint"
      >
        {{ pageLoading ? "连接中..." : "继续" }}
      </button>

      <div
        v-if="error" mt-5
        class="border border-rose-500/20 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-400"
      >
        {{ error }}
      </div>
    </div>

    <!-- ═══════════════════════════════════════ -->
    <!-- Step 2: User Selection                 -->
    <!-- ═══════════════════════════════════════ -->
    <div v-else-if="step === 'select-user'" mx-auto max-w-lg px-6 pt-20>
      <div mb-8>
        <h1 text-2xl text-slate-50 font-semibold tracking-tight>
          选择账号
        </h1>
        <p mt-1 text-sm text-slate-500>
          选择一个已有账号或创建新账号
        </p>
      </div>

      <!-- Skeleton loading -->
      <div v-if="pageLoading" space-y-3>
        <div v-for="i in 3" :key="i" card animate-pulse p-4>
          <div flex items-center gap-3>
            <div h-9 w-9 rounded-full bg-slate-800 />
            <div flex-1>
              <div class="mb-2 h-4 w-24 rounded bg-slate-800" />
              <div class="h-3 w-16 rounded bg-slate-800/60" />
            </div>
          </div>
        </div>
      </div>

      <div v-else>
        <div mb-5 space-y-2.5>
          <button
            v-for="user in users"
            :key="user.id"
            card-hover w-full p-4 text-left
            @click="selectUser(user)"
          >
            <div flex items-center gap-3>
              <!-- Avatar -->
              <div
                class="h-9 w-9 flex items-center justify-center border border-emerald-500/20 rounded-full from-emerald-500/20 to-sky-500/20 bg-linear-to-br text-sm text-emerald-300 font-medium"
              >
                {{ [...user.name][0] }}
              </div>
              <div flex-1>
                <div text-sm text-slate-100 font-medium>
                  {{ user.name }}
                </div>
                <div mt-0.5 flex items-center gap-2 text-xs text-slate-500>
                  <span flex items-center gap-1>
                    <div
                      h-1.5 w-1.5 rounded-full
                      :class="user.is_auto ? 'bg-emerald-400' : 'bg-slate-600'"
                    />
                    {{ user.is_auto ? "自动签到" : "手动签到" }}
                  </span>
                  <template v-if="user.expires">
                    <span text-slate-700>·</span>
                    <span text-slate-600>{{ new Date(user.expires).toLocaleDateString() }} 过期</span>
                  </template>
                </div>
              </div>
              <div i-carbon-chevron-right text-slate-600 />
            </div>
          </button>
        </div>

        <button
          btn-secondary w-full flex items-center justify-center gap-2 border-dashed py-3 text-sm
          @click="createNewUser"
        >
          <div i-carbon-add text-base />
          创建新用户
        </button>
      </div>

      <div
        v-if="error" mt-5
        class="border border-rose-500/20 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-400"
      >
        {{ error }}
      </div>
    </div>

    <!-- ═══════════════════════════════════════ -->
    <!-- Step 3: Main Dashboard                 -->
    <!-- ═══════════════════════════════════════ -->
    <div v-else-if="step === 'main'" mx-auto max-w-2xl px-5 pb-16 pt-8>
      <!-- Header -->
      <div mb-8 flex items-center justify-between>
        <div flex items-center gap-3>
          <!-- Avatar -->
          <div
            class="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-emerald-500/20 rounded-full from-emerald-500/20 to-sky-500/20 bg-linear-to-br text-sm text-emerald-300 font-semibold"
          >
            {{ [...(userStore.userName || '?')][0] }}
          </div>
          <div>
            <h1 text-lg text-slate-50 font-semibold tracking-tight>
              {{ userStore.userName }}
            </h1>
            <p text-xs text-slate-500>
              {{ lastSignin ? `上次签到 ${formatRelativeTime(lastSignin.created_at)}` : "尚未签到" }}
            </p>
          </div>
        </div>
        <button
          class="btn-ghost rounded-lg p-2.5 hover:bg-slate-800/80"
          @click="goToSettings"
        >
          <div i-carbon-settings text-lg text-slate-400 />
        </button>
      </div>

      <!-- ── Scan Result ── -->
      <div
        v-if="scanResult"
        class="card mb-5 border-emerald-500/20 from-emerald-500/10 to-emerald-500/5 bg-linear-to-br p-5"
      >
        <div mb-3 flex items-center gap-2>
          <div i-carbon-checkmark-filled text-emerald-400 />
          <span text-sm text-emerald-300 font-medium>扫码签到完成</span>
        </div>
        <div mb-2 text-xs text-slate-500>
          签到结果（{{ scanResult.signin_results.length }} 人）
        </div>
        <div space-y-1.5>
          <div
            v-for="item in scanResult.signin_results"
            :key="item.id"
            class="rounded-lg bg-slate-950/60 p-3 text-xs"
          >
            <div flex items-center justify-between>
              <span text-slate-200 font-medium>{{ getUserName(item.user_id) }}</span>
              <span
                font-mono
                :class="
                  item.response_code === 200
                    ? 'text-emerald-400'
                    : item.response_code === null
                      ? 'text-amber-400'
                      : 'text-rose-400'
                "
              >
                {{ item.response_code ?? "失败" }}
              </span>
            </div>
            <div v-if="item.response_code !== 200" class="mt-2 border-t border-slate-800/50 pt-2">
              <div max-h-32 overflow-y-auto break-all text-xs text-rose-400 font-mono>
                {{ typeof item.response_data === "string" ? item.response_data : JSON.stringify(item.response_data, null, 2) }}
              </div>
            </div>
          </div>
        </div>
        <button btn-ghost mt-3 text-xs @click="scanResult = null">
          关闭
        </button>
      </div>

      <!-- ── Digital Result ── -->
      <div
        v-if="digitalResult"
        class="card mb-5 border-sky-500/20 from-sky-500/10 to-sky-500/5 bg-linear-to-br p-5"
      >
        <div mb-3 flex items-center gap-2>
          <div i-carbon-checkmark-filled text-sky-400 />
          <span text-sm text-sky-300 font-medium>数字签到完成</span>
        </div>
        <div mb-3>
          <div mb-1 text-xs text-slate-500>
            签到码
          </div>
          <div
            class="rounded-lg bg-slate-950/60 p-2.5 text-center text-sm text-sky-400 font-semibold tracking-widest font-mono"
          >
            {{
              digitalResult.signin_results.length > 0
                && digitalResult.signin_results[0].request_data?.numberCode
                ? digitalResult.signin_results[0].request_data.numberCode
                : "遍历破解"
            }}
          </div>
        </div>
        <div mb-2 text-xs text-slate-500>
          签到结果（{{ digitalResult.signin_results.length }} 人）
        </div>
        <div space-y-1.5>
          <div
            v-for="item in digitalResult.signin_results"
            :key="item.id"
            class="rounded-lg bg-slate-950/60 p-3 text-xs"
          >
            <div flex items-center justify-between>
              <span text-slate-200 font-medium>{{ getUserName(item.user_id) }}</span>
              <span
                font-mono
                :class="
                  item.response_code === 200
                    ? 'text-emerald-400'
                    : item.response_code === null
                      ? 'text-amber-400'
                      : 'text-rose-400'
                "
              >
                {{ item.response_code ?? "失败" }}
              </span>
            </div>
            <div v-if="item.response_code !== 200" class="mt-2 border-t border-slate-800/50 pt-2">
              <div max-h-32 overflow-y-auto break-all text-xs text-rose-400 font-mono>
                {{ typeof item.response_data === "string" ? item.response_data : JSON.stringify(item.response_data, null, 2) }}
              </div>
            </div>
          </div>
        </div>
        <button btn-ghost mt-3 text-xs @click="digitalResult = null">
          关闭
        </button>
      </div>

      <!-- ── Scan Loading Indicator ── -->
      <div
        v-if="scanLoading && !showScanner"
        class="card mb-5 flex flex-col items-center gap-3 border-emerald-500/10 p-6"
      >
        <div i-carbon-circle-dash animate-spin text-3xl text-emerald-400 />
        <span text-sm text-slate-400>正在处理签到...</span>
      </div>

      <!-- ══ Action Buttons ══ -->
      <div grid grid-cols-2 mb-8 gap-3>
        <button
          btn-primary flex items-center justify-center gap-2 py-3.5 text-sm
          :disabled="isScanning || scanLoading"
          @click="startQRScan"
        >
          <div i-carbon-qr-code text-base />
          <span>{{ isScanning ? "扫码中..." : "扫码签到" }}</span>
        </button>

        <button
          btn-secondary flex items-center justify-center gap-2 py-3.5 text-sm
          :disabled="scanLoading"
          @click="startDigitalSignin"
        >
          <div i-carbon-keyboard text-base />
          <span>数字签到</span>
        </button>
      </div>

      <!-- ── Page Data Loading ── -->
      <div v-if="pageLoading && !scanResult && !digitalResult" space-y-4>
        <div>
          <div class="mb-3 h-4 w-20 rounded bg-slate-800" />
          <div space-y-2>
            <div v-for="i in 3" :key="i" card flex animate-pulse items-center justify-between p-3.5>
              <div>
                <div class="mb-1.5 h-4 w-20 rounded bg-slate-800" />
                <div class="h-3 w-16 rounded bg-slate-800/50" />
              </div>
              <div class="h-5 w-5 rounded bg-slate-800/50" />
            </div>
          </div>
        </div>
      </div>

      <template v-else>
        <!-- ── Recent Scans ── -->
        <div mb-7>
          <div mb-3 flex items-center justify-between>
            <h2 section-title mb-0>
              最近扫码
            </h2>
            <button btn-ghost flex items-center gap-0.5 text-xs @click="goToHistory">
              <span>查看全部</span>
              <div i-carbon-chevron-right text-xs />
            </button>
          </div>

          <div v-if="recentScans.length === 0" py-10 text-center>
            <div i-carbon-scan mx-auto mb-2 text-3xl text-slate-800 />
            <p text-xs text-slate-600>
              暂无扫码记录
            </p>
          </div>

          <div v-else space-y-2>
            <div
              v-for="scan in recentScans"
              :key="scan.id"
              card-hover flex items-center justify-between p-3.5
              @click="goToHistory"
            >
              <div flex items-center gap-3>
                <div class="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-800/80">
                  <div i-carbon-qr-code text-sm text-slate-400 />
                </div>
                <div>
                  <div text-sm text-slate-200>
                    {{ getUserName(scan.user_id) }}
                  </div>
                  <div mt-0.5 text-xs text-slate-500>
                    {{ formatRelativeTime(scan.created_at) }}
                  </div>
                </div>
              </div>
              <div i-carbon-chevron-right text-sm text-slate-700 />
            </div>
          </div>
        </div>

        <!-- ── Todos Section ── -->
        <div mb-7>
          <h2 section-title>
            待办事项
          </h2>

          <div v-if="todosLoading" flex items-center justify-center py-10>
            <div i-carbon-loading animate-spin text-xl text-slate-600 />
          </div>

          <div
            v-else-if="todosError"
            class="card border-rose-500/20 p-5 text-center"
          >
            <div i-carbon-warning-alt mx-auto mb-2 text-2xl text-rose-400 />
            <div mb-2 text-xs text-rose-400>
              {{ todosError }}
            </div>
            <button

              btn-ghost text-xs text-rose-400 underline underline-offset-2 hover:text-rose-300
              @click="router.push('/settings')"
            >
              前往设置刷新 Cookie
            </button>
          </div>

          <div v-else-if="todos.length === 0" py-10 text-center>
            <div i-carbon-task-complete mx-auto mb-2 text-3xl text-slate-800 />
            <p text-xs text-slate-600>
              暂无待办事项
            </p>
          </div>

          <div v-else space-y-2>
            <div
              v-for="todo in todos"
              :key="todo.id"
              card p-4
            >
              <div flex items-start justify-between gap-3>
                <div min-w-0 flex-1>
                  <div truncate text-sm text-slate-200>
                    {{ todo.title }}
                  </div>
                  <div mt-0.5 text-xs text-slate-500>
                    {{ todo.course_name }}
                  </div>
                  <div mt-1 flex items-center gap-1.5 text-xs text-slate-600>
                    <span>{{ todo.type }}</span>
                    <span text-slate-700>·</span>
                    <span>截止 {{ new Date(todo.end_time).toLocaleString("zh-CN") }}</span>
                  </div>
                </div>
                <span
                  whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium
                  :class="
                    todo.is_locked
                      ? 'bg-slate-800 text-slate-500'
                      : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  "
                >
                  {{ todo.is_locked ? "已锁定" : "进行中" }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Error ── -->
        <div
          v-if="error"
          class="mb-4 border border-rose-500/20 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-400"
        >
          {{ error }}
        </div>
      </template>
    </div>

    <!-- ═══════════════════════════════════════ -->
    <!-- Digital Signin Dialog                  -->
    <!-- ═══════════════════════════════════════ -->
    <Teleport to="body">
      <div
        v-if="showDigitalDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm"
      >
        <div class="card max-w-sm w-full border-slate-700/50 p-6 shadow-2xl">
          <div mb-5 flex items-center justify-between>
            <h2 text-base text-slate-50 font-semibold>
              数字签到
            </h2>
            <button btn-ghost p-1 @click="closeDigitalDialog">
              <div i-carbon-close text-lg />
            </button>
          </div>

          <div mb-4>
            <label mb-1.5 block text-xs text-slate-400 font-medium>签到码（可选）</label>
            <input
              v-model="digitalCode"
              type="text"
              placeholder="输入数字签到码"
              input-base w-full py-3 text-center text-lg tracking-widest font-mono
              @keydown.enter="handleDigitalSignin"
            >
            <p mt-2 text-center text-xs text-slate-600>
              留空则使用遍历破解方式
            </p>
          </div>

          <button
            btn-primary w-full py-3 text-sm
            :disabled="scanLoading"
            @click="handleDigitalSignin"
          >
            {{ scanLoading ? "请稍等..." : "开始签到" }}
          </button>

          <div v-if="error" mt-3>
            <div
              class="max-h-40 overflow-y-auto break-all border border-rose-500/20 rounded-lg bg-slate-950/80 p-2.5 text-xs text-rose-400 font-mono"
            >
              {{ error }}
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══════════════════════════════════════ -->
    <!-- QR Scanner Modal                       -->
    <!-- ═══════════════════════════════════════ -->
    <Teleport to="body">
      <div
        v-if="showScanner"
        fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-5
      >
        <div max-w-xl w-full flex flex-col>
          <div mb-4 flex flex-shrink-0 items-center justify-between>
            <h2 text-base text-slate-50 font-semibold>
              扫描二维码
            </h2>
            <div flex items-center gap-2>
              <button
                btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs text-amber-400
                :disabled="scanLoading"
                @click="debugWithLastResult"
              >
                <div i-carbon-debug text-sm />
                <span>调试</span>
              </button>
              <button v-if="!isTauri()" btn-ghost p-1.5 @click="closeScanner">
                <div i-carbon-close text-lg />
              </button>
              <button v-else btn-ghost p-1.5 @click="router.push('/')">
                <div i-carbon-home text-lg />
              </button>
            </div>
          </div>

          <div card relative min-h-0 flex-shrink overflow-hidden>
            <video ref="videoElement" h-auto max-h-70vh w-full object-contain />
            <!-- Scan Loading Overlay -->
            <div
              v-if="scanLoading"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 backdrop-blur-sm"
            >
              <div i-carbon-circle-dash animate-spin text-4xl text-emerald-400 />
              <span text-sm text-slate-400>正在处理签到...</span>
            </div>
          </div>

          <!-- Scanner status -->
          <div mt-3 flex-shrink-0 text-center space-y-1>
            <div v-if="scannerMode" flex items-center justify-center gap-1.5 text-xs text-slate-500>
              <div h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 />
              <span>{{ scannerMode }}</span>
            </div>
            <div text-xs text-slate-600>
              <span v-if="!scanLoading">将二维码放置在视图内</span>
              <span v-else>请稍候，正在为所有用户签到</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
