<script setup lang="ts">
import type { ScanHistory, SigninHistory } from '~/types/index'
import { getUserList } from '~/api'
import { formatDate, formatRelativeTime } from '~/utils'

defineOptions({
  name: 'HistoryPage',
})

const userStore = useUserStore()
const router = useRouter()

// State
const activeTab = ref<'scan' | 'signin'>('scan')
const loading = ref(false)
const error = ref('')

// Scan history
const scanHistory = ref<ScanHistory[]>([])
const scanPage = ref(1)
const scanPageSize = ref(10)
const scanHasMore = ref(true)

// Signin history
const signinHistory = ref<SigninHistory[]>([])
const signinPage = ref(1)
const signinPageSize = ref(10)
const signinHasMore = ref(true)
const onlyMySignin = ref(false)

// User map for displaying names
const userMap = ref<Map<string, string>>(new Map())

// Load scan history
async function loadScanHistory(append = false) {
  try {
    loading.value = true
    error.value = ''

    const index = scanPage.value - 1
    const response = await fetch(
      `${userStore.apiEndpoint}/history/scan?count=${scanPageSize.value}&index=${index}`,
    )
    const data = await response.json()

    if (append)
      scanHistory.value = [...scanHistory.value, ...data]
    else
      scanHistory.value = data

    scanHasMore.value = data.length === scanPageSize.value
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '加载扫码历史失败'
  }
  finally {
    loading.value = false
  }
}

// Load signin history
async function loadSigninHistory(append = false) {
  try {
    loading.value = true
    error.value = ''

    const index = signinPage.value - 1
    const url = onlyMySignin.value
      ? `${userStore.apiEndpoint}/history/signin?user_id=${userStore.userId}&count=${signinPageSize.value}&index=${index}`
      : `${userStore.apiEndpoint}/history/signin?count=${signinPageSize.value}&index=${index}`
    const response = await fetch(url)
    const data = await response.json()

    if (append)
      signinHistory.value = [...signinHistory.value, ...data]
    else
      signinHistory.value = data

    signinHasMore.value = data.length === signinPageSize.value
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '加载签到历史失败'
  }
  finally {
    loading.value = false
  }
}

// Load more
function loadMoreScan() {
  scanPage.value++
  loadScanHistory(true)
}

function loadMoreSignin() {
  signinPage.value++
  loadSigninHistory(true)
}

// Switch tab
function switchTab(tab: 'scan' | 'signin') {
  activeTab.value = tab
  if (tab === 'scan' && scanHistory.value.length === 0)
    loadScanHistory()
  else if (tab === 'signin' && signinHistory.value.length === 0)
    loadSigninHistory()
}

// Toggle only my signin filter
function toggleOnlyMySignin() {
  signinPage.value = 1
  signinHistory.value = []
  loadSigninHistory(false)
}

// Initialize
onMounted(async () => {
  if (!userStore.userId) {
    router.push('/')
    return
  }

  try {
    const users = await getUserList()
    userMap.value = new Map(users.map(u => [u.id, u.name]))
  }
  catch (err) {
    console.error('加载用户列表失败:', err)
  }

  loadScanHistory()
})

// Go back
function goBack() {
  router.back()
}

// Expand/collapse details
const expandedItems = ref<Set<string>>(new Set())

function toggleExpand(id: string) {
  if (expandedItems.value.has(id))
    expandedItems.value.delete(id)
  else
    expandedItems.value.add(id)
}

// Get user name by id
function getUserName(userId: string): string {
  return userMap.value.get(userId) || '未知用户'
}

// Get status tag for signin
function getStatusTag(signin: SigninHistory): string | null {
  if (!signin.response_code)
    return 'Internal Error'

  const responseData = JSON.stringify(signin.response_data || '')

  if (responseData.includes('return 405'))
    return '可能需要更新 cookie'

  if (responseData.includes('rollcall_closed'))
    return '签到已关闭'

  return null
}
</script>

<template>
  <div page-bg>
    <div max-w-2xl mx-auto px-5 pt-8 pb-16>
      <!-- Header -->
      <div mb-6 flex items-center gap-3>
        <button btn-ghost p-1.5 @click="goBack">
          <div i-carbon-arrow-left text-lg />
        </button>
        <h1 text-xl font-semibold tracking-tight text-slate-50>历史记录</h1>
      </div>

      <!-- Tabs -->
      <div mb-6 flex rounded-lg p-0.5 class="bg-slate-900/60 border border-slate-800/50">
        <button
          flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1.5
          transition-all duration-200 cursor-pointer
          :class="activeTab === 'scan'
            ? 'bg-slate-800/80 text-slate-100 shadow-sm'
            : 'text-slate-500 hover:text-slate-300'"
          @click="switchTab('scan')"
        >
          <div i-carbon-qr-code text-sm />
          <span>扫码历史</span>
        </button>
        <button
          flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1.5
          transition-all duration-200 cursor-pointer
          :class="activeTab === 'signin'
            ? 'bg-slate-800/80 text-slate-100 shadow-sm'
            : 'text-slate-500 hover:text-slate-300'"
          @click="switchTab('signin')"
        >
          <div i-carbon-checkmark text-sm />
          <span>签到历史</span>
        </button>
      </div>

      <!-- Error -->
      <div v-if="error" mb-4 rounded-lg p-3 text-rose-400 text-xs class="bg-rose-500/10 border border-rose-500/20">
        {{ error }}
      </div>

      <!-- ═══ Scan History Tab ═══ -->
      <div v-if="activeTab === 'scan'">
        <!-- Skeleton -->
        <div v-if="loading && scanHistory.length === 0" space-y-2>
          <div v-for="i in 4" :key="i" card p-4 animate-pulse>
            <div flex items-center gap-3>
              <div w-8 h-8 rounded-lg bg-slate-800 />
              <div flex-1>
                <div h-4 w-20 rounded bg-slate-800 mb-1.5 />
                <div h-3 w-32 rounded class="bg-slate-800/50" />
              </div>
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="scanHistory.length === 0" py-16 text-center>
          <div i-carbon-scan text-4xl text-slate-800 mx-auto mb-3 />
          <p text-sm text-slate-600>暂无扫码记录</p>
        </div>

        <!-- List -->
        <div v-else space-y-2>
          <div
            v-for="scan in scanHistory"
            :key="scan.id"
            card overflow-hidden
          >
            <button
              w-full text-left p-4 transition-colors duration-200 cursor-pointer
              class="hover:bg-slate-800/30"
              @click="toggleExpand(scan.id)"
            >
              <div flex items-center gap-3>
                <div w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 class="bg-slate-800/80">
                  <div i-carbon-qr-code text-sm text-slate-400 />
                </div>
                <div flex-1 min-w-0>
                  <div text-sm text-slate-200>{{ getUserName(scan.user_id) }}</div>
                  <div text-xs font-mono text-slate-600 truncate mt-0.5>
                    {{ scan.result.substring(0, 50) }}{{ scan.result.length > 50 ? '...' : '' }}
                  </div>
                </div>
                <div flex items-center gap-2>
                  <span text-xs text-slate-600>{{ formatRelativeTime(scan.created_at) }}</span>
                  <div
                    i-carbon-chevron-down text-slate-600 text-sm transition-transform duration-200
                    :class="expandedItems.has(scan.id) ? 'rotate-180' : ''"
                  />
                </div>
              </div>
            </button>

            <!-- Expanded detail -->
            <div v-if="expandedItems.has(scan.id)" border-t p-4 class="border-slate-800/50 bg-slate-950/40">
              <div text-xs text-slate-500 mb-1.5>完整结果</div>
              <div
                text-xs font-mono
                p-3 rounded-lg break-all text-slate-400
                class="bg-slate-900/60 border border-slate-800/50"
              >
                {{ scan.result }}
              </div>
              <div text-xs text-slate-600 mt-3 space-y-0.5>
                <div flex items-center gap-1.5>
                  <div i-carbon-tag text-xs /><span>{{ scan.id }}</span>
                </div>
                <div flex items-center gap-1.5>
                  <div i-carbon-time text-xs /><span>{{ formatDate(scan.created_at) }}</span>
                </div>
                <div flex items-center gap-1.5>
                  <div i-carbon-user text-xs /><span>{{ getUserName(scan.user_id) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Load More -->
          <button
            v-if="scanHasMore"
            btn-secondary w-full py-2.5 text-xs
            :disabled="loading"
            @click="loadMoreScan"
          >
            {{ loading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </div>

      <!-- ═══ Signin History Tab ═══ -->
      <div v-if="activeTab === 'signin'">
        <!-- Filter -->
        <div mb-4 flex items-center justify-end>
          <label flex items-center gap-2 cursor-pointer text-xs>
            <div relative inline-block h-4 w-7>
              <input
                v-model="onlyMySignin"
                type="checkbox"
                class="peer sr-only"
                @change="toggleOnlyMySignin"
              >
              <div
                class="absolute inset-0 rounded-full cursor-pointer transition-colors duration-200"
                :class="onlyMySignin ? 'bg-emerald-500' : 'bg-slate-700'"
              />
              <div
                class="absolute top-0.5 left-0.5 h-3 w-3 rounded-full pointer-events-none transition-transform duration-200 bg-white shadow-sm"
                :class="onlyMySignin ? 'translate-x-3' : ''"
              />
            </div>
            <span text-slate-400>仅查看我的签到</span>
          </label>
        </div>

        <!-- Skeleton -->
        <div v-if="loading && signinHistory.length === 0" space-y-2>
          <div v-for="i in 4" :key="i" card p-4 animate-pulse>
            <div flex items-center gap-3>
              <div w-8 h-8 rounded-lg bg-slate-800 />
              <div flex-1>
                <div h-4 w-24 rounded bg-slate-800 mb-1.5 />
                <div h-3 w-16 rounded class="bg-slate-800/50" />
              </div>
              <div h-5 w-10 rounded-full bg-slate-800 />
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="signinHistory.length === 0" py-16 text-center>
          <div i-carbon-checkmark-outline text-4xl text-slate-800 mx-auto mb-3 />
          <p text-sm text-slate-600>暂无签到记录</p>
        </div>

        <!-- List -->
        <div v-else space-y-2>
          <div
            v-for="si in signinHistory"
            :key="si.id"
            card overflow-hidden
          >
            <button
              w-full text-left p-4 transition-colors duration-200 cursor-pointer
              class="hover:bg-slate-800/30"
              @click="toggleExpand(si.id)"
            >
              <div flex items-center gap-3>
                <div
                  w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  :class="si.response_code === 200
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-rose-500/10 text-rose-400'"
                >
                  <div
                    :class="si.response_code === 200 ? 'i-carbon-checkmark' : 'i-carbon-close'"
                    text-sm
                  />
                </div>
                <div flex-1 min-w-0>
                  <div flex items-center gap-2>
                    <span text-sm text-slate-200>{{ getUserName(si.user_id) }}</span>
                    <span
                      text-xs px-1.5 py-0.5 rounded-full font-mono
                      :class="si.response_code === 200
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'"
                    >
                      {{ si.response_code || 'N/A' }}
                    </span>
                    <span
                      v-if="getStatusTag(si)"
                      text-xs px-1.5 py-0.5 rounded-full
                      class="bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    >
                      {{ getStatusTag(si) }}
                    </span>
                  </div>
                  <div text-xs text-slate-600 mt-0.5>{{ formatRelativeTime(si.created_at) }}</div>
                </div>
                <div
                  i-carbon-chevron-down text-slate-600 text-sm transition-transform duration-200
                  :class="expandedItems.has(si.id) ? 'rotate-180' : ''"
                />
              </div>
            </button>

            <!-- Expanded detail -->
            <div v-if="expandedItems.has(si.id)" border-t p-4 space-y-3 class="border-slate-800/50 bg-slate-950/40">
              <div>
                <div text-xs text-slate-500 mb-1>请求数据</div>
                <div
                  text-xs font-mono
                  p-3 rounded-lg break-all text-slate-400
                  class="bg-slate-900/60 border border-slate-800/50"
                >
                  {{ si.request_data }}
                </div>
              </div>
              <div>
                <div text-xs text-slate-500 mb-1>响应数据</div>
                <div
                  text-xs font-mono
                  p-3 rounded-lg break-all text-slate-400
                  class="bg-slate-900/60 border border-slate-800/50"
                >
                  {{ si.response_data }}
                </div>
              </div>
              <div text-xs text-slate-600 space-y-0.5>
                <div flex items-center gap-1.5>
                  <div i-carbon-tag text-xs /><span>{{ si.id }}</span>
                </div>
                <div flex items-center gap-1.5>
                  <div i-carbon-time text-xs /><span>{{ formatDate(si.created_at) }}</span>
                </div>
                <div flex items-center gap-1.5>
                  <div i-carbon-user text-xs /><span>{{ getUserName(si.user_id) }}</span>
                </div>
                <div flex items-center gap-1.5>
                  <div i-carbon-cookie text-xs /><span>{{ si.cookie.substring(0, 40) }}...</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Load More -->
          <button
            v-if="signinHasMore"
            btn-secondary w-full py-2.5 text-xs
            :disabled="loading"
            @click="loadMoreSignin"
          >
            {{ loading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
