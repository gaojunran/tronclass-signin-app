<script setup lang="ts">
import type { ScanHistory, SigninHistory, UserWithCookie } from '~/types/index'
import { formatDate, formatRelativeTime } from '~/utils'
import { getUserList } from '~/api'

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

    const count = scanPage.value * scanPageSize.value
    const response = await fetch(
      `${userStore.apiEndpoint}/history/scan?count=${count}`,
    )
    const data = await response.json()

    if (append) {
      scanHistory.value = [...scanHistory.value, ...data]
    }
    else {
      scanHistory.value = data
    }

    scanHasMore.value = data.length === count
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

    const count = signinPage.value * signinPageSize.value
    const url = onlyMySignin.value
      ? `${userStore.apiEndpoint}/history/signin?user_id=${userStore.userId}&count=${count}`
      : `${userStore.apiEndpoint}/history/signin?count=${count}`
    const response = await fetch(url)
    const data = await response.json()

    if (append) {
      signinHistory.value = [...signinHistory.value, ...data]
    }
    else {
      signinHistory.value = data
    }

    signinHasMore.value = data.length === count
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '加载签到历史失败'
  }
  finally {
    loading.value = false
  }
}

// Load more scan history
function loadMoreScan() {
  scanPage.value++
  loadScanHistory(true)
}

// Load more signin history
function loadMoreSignin() {
  signinPage.value++
  loadSigninHistory(true)
}

// Switch tab
function switchTab(tab: 'scan' | 'signin') {
  activeTab.value = tab
  if (tab === 'scan' && scanHistory.value.length === 0) {
    loadScanHistory()
  }
  else if (tab === 'signin' && signinHistory.value.length === 0) {
    loadSigninHistory()
  }
}

// Toggle only my signin filter
function toggleOnlyMySignin() {
  onlyMySignin.value = !onlyMySignin.value
  signinPage.value = 1
  loadSigninHistory(false)
}

// Initialize
onMounted(async () => {
  if (!userStore.userId) {
    router.push('/')
    return
  }

  // Load user list for name mapping
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
  if (expandedItems.value.has(id)) {
    expandedItems.value.delete(id)
  }
  else {
    expandedItems.value.add(id)
  }
}

// Get user name by id
function getUserName(userId: string): string {
  return userMap.value.get(userId) || '未知用户'
}

// Get status tag for signin
function getStatusTag(signin: SigninHistory): string | null {
  if (!signin.response_code) {
    return 'Internal Error'
  }
  
  const responseData = String(signin.response_data || '')
  
  if (responseData.includes('return 405')) {
    return '可能需要更新 cookie'
  }
  
  if (responseData.includes('rollcall_closed')) {
    return '签到已关闭'
  }
  
  return null
}
</script>

<template>
  <div min-h-screen bg-neutral-900 text-neutral-100 p-6>
    <div max-w-4xl mx-auto mt-10>
      <!-- Header -->
      <div flex items-center mb-8>
        <button
          bg-neutral-800 hover:bg-neutral-700 p-2 rounded mr-4
          @click="goBack"
        >
          <div i-carbon-arrow-left text-xl />
        </button>
        <div text-2xl font-bold>历史记录</div>
      </div>

      <!-- Tabs -->
      <div flex gap-2 mb-6>
        <button
          flex-1 py-3 rounded font-medium flex items-center justify-center gap-2
          :class="activeTab === 'scan' ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'"
          @click="switchTab('scan')"
        >
          <div i-carbon-qr-code />
          <span>扫码历史</span>
        </button>
        <button
          flex-1 py-3 rounded font-medium flex items-center justify-center gap-2
          :class="activeTab === 'signin' ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'"
          @click="switchTab('signin')"
        >
          <div i-carbon-checkmark />
          <span>签到历史</span>
        </button>
      </div>

      <!-- Error -->
      <div v-if="error" bg-red-900 bg-opacity-20 border-1 border-red-700 rounded p-4 text-red-400 text-sm mb-6>
        {{ error }}
      </div>

      <!-- Scan History Tab -->
      <div v-if="activeTab === 'scan'">
        <div v-if="loading && scanHistory.length === 0" text-center py-10>
          <div i-carbon-loading animate-spin text-4xl />
        </div>

        <div v-else-if="scanHistory.length === 0" text-center py-10 text-neutral-500>
          暂无扫码记录
        </div>

        <div v-else space-y-3>
          <div
            v-for="scan in scanHistory"
            :key="scan.id"
            bg-neutral-800 border-1 border-neutral-700 rounded-lg overflow-hidden
          >
            <div p-4 cursor-pointer @click="toggleExpand(scan.id)">
              <div flex items-start justify-between>
                <div flex-1 mr-4>
                  <div text-base font-medium text-neutral-200 mb-1>
                    {{ getUserName(scan.user_id) }}
                  </div>
                  <div text-xs font-mono text-neutral-500 break-all>
                    {{ scan.result.substring(0, 60) }}{{ scan.result.length > 60 ? '...' : '' }}
                  </div>
                  <div text-xs text-neutral-500 mt-2>
                    {{ formatRelativeTime(scan.created_at) }}
                  </div>
                </div>
                <div
                  i-carbon-chevron-down text-xl text-neutral-500 transition-transform
                  :class="expandedItems.has(scan.id) ? 'rotate-180' : ''"
                />
              </div>
            </div>

            <div
              v-if="expandedItems.has(scan.id)"
              bg-neutral-900 p-4 border-t-1 border-neutral-700
            >
              <div text-xs text-neutral-400 mb-2>完整结果：</div>
              <div text-xs font-mono bg-neutral-800 p-3 rounded break-all>
                {{ scan.result }}
              </div>
              <div text-xs text-neutral-500 mt-3>
                <div>ID: {{ scan.id }}</div>
                <div>时间：{{ formatDate(scan.created_at) }}</div>
                <div>扫码者：{{ getUserName(scan.user_id) }}</div>
              </div>
            </div>
          </div>

          <!-- Load More -->
          <button
            v-if="scanHasMore"
            w-full bg-neutral-800 hover:bg-neutral-750 py-3 rounded text-sm
            :disabled="loading"
            @click="loadMoreScan"
          >
            {{ loading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </div>

      <!-- Signin History Tab -->
      <div v-if="activeTab === 'signin'">
        <!-- Filter Option -->
        <div mb-4 flex items-center justify-end>
          <label flex items-center gap-2 cursor-pointer text-sm>
            <input
              v-model="onlyMySignin"
              type="checkbox"
              class="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-orange-600 focus:ring-orange-500 focus:ring-offset-neutral-900"
              @change="toggleOnlyMySignin"
            >
            <span text-neutral-300>仅查看我的签到</span>
          </label>
        </div>

        <div v-if="loading && signinHistory.length === 0" text-center py-10>
          <div i-carbon-loading animate-spin text-4xl />
        </div>

        <div v-else-if="signinHistory.length === 0" text-center py-10 text-neutral-500>
          暂无签到记录
        </div>

        <div v-else space-y-3>
          <div
            v-for="signin in signinHistory"
            :key="signin.id"
            bg-neutral-800 border-1 border-neutral-700 rounded-lg overflow-hidden
          >
            <div p-4 cursor-pointer @click="toggleExpand(signin.id)">
              <div flex items-start justify-between>
                <div flex-1>
                  <div flex items-center gap-2 mb-2>
                    <div text-base font-medium text-neutral-200>
                      {{ getUserName(signin.user_id) }}
                    </div>
                    <div
                      text-xs px-2 py-1 rounded
                      :class="signin.response_code === 200 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'"
                    >
                      {{ signin.response_code || 'N/A' }}
                    </div>
                    <div
                      v-if="getStatusTag(signin)"
                      text-xs px-2 py-1 rounded bg-yellow-900 text-yellow-300
                    >
                      {{ getStatusTag(signin) }}
                    </div>
                  </div>
                  <div text-xs text-neutral-500>
                    {{ formatRelativeTime(signin.created_at) }}
                  </div>
                </div>
                <div
                  i-carbon-chevron-down text-xl text-neutral-500 transition-transform
                  :class="expandedItems.has(signin.id) ? 'rotate-180' : ''"
                />
              </div>
            </div>

            <div
              v-if="expandedItems.has(signin.id)"
              bg-neutral-900 p-4 border-t-1 border-neutral-700 space-y-3
            >
              <div>
                <div text-xs text-neutral-400 mb-2>请求数据：</div>
                <div text-xs font-mono bg-neutral-800 p-3 rounded break-all>
                  {{ signin.request_data }}
                </div>
              </div>

              <div>
                <div text-xs text-neutral-400 mb-2>响应数据：</div>
                <div text-xs font-mono bg-neutral-800 p-3 rounded break-all>
                  {{ signin.response_data }}
                </div>
              </div>

              <div text-xs text-neutral-500>
                <div>ID: {{ signin.id }}</div>
                <div>时间：{{ formatDate(signin.created_at) }}</div>
                <div>签到者：{{ getUserName(signin.user_id) }}</div>
                <div>Cookie: {{ signin.cookie.substring(0, 40) }}...</div>
              </div>
            </div>
          </div>

          <!-- Load More -->
          <button
            v-if="signinHasMore"
            w-full bg-neutral-800 hover:bg-neutral-750 py-3 rounded text-sm
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
