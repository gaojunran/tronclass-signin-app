<script setup lang="ts">
import type { UserWithCookie } from '~/types/index'
import {
  getUserList,
  refreshUserCookie,
  removeUser,
  renameUser,
  updateUserAuto,
  updateUserIdentity,
} from '~/api'
import { isBarcodeDetectorAvailable } from '~/composables/qrScanner'

defineOptions({
  name: 'SettingsPage',
})

const userStore = useUserStore()
const router = useRouter()

// State
const loading = ref(false)
const error = ref('')
const success = ref('')
const currentUser = ref<UserWithCookie | null>(null)
const backendRepoUrl = ref('')

// Form state
const newName = ref('')
const newCookie = ref('')
const isAuto = ref(true)
const activeCookieTab = ref<'manual' | 'identity'>('manual')

// Identity fields
const identityAccount = ref('')
const identityPassword = ref('')

// Confirmation dialogs
const showDeleteConfirm = ref(false)

// BarcodeDetector availability
const barcodeDetectorAvailable = ref(false)

// Load current user data
onMounted(async () => {
  // Check BarcodeDetector availability
  barcodeDetectorAvailable.value = await isBarcodeDetectorAvailable()
  // If user previously selected barcode but it's no longer available, reset to video
  if (userStore.scanMode === 'barcode' && !barcodeDetectorAvailable.value) {
    userStore.setScanMode('video')
  }

  if (!userStore.userId) {
    router.push('/')
    return
  }

  try {
    loading.value = true
    const users = await getUserList()
    currentUser.value = users.find(u => u.id === userStore.userId) || null

    if (currentUser.value) {
      newName.value = currentUser.value.name
      isAuto.value = currentUser.value.is_auto
      identityAccount.value = currentUser.value.identity_account || ''
      identityPassword.value = currentUser.value.identity_password || ''
    }

    try {
      const response = await fetch(`${userStore.apiEndpoint}/backend/repo/url`)
      if (response.ok) {
        const data = await response.text()
        backendRepoUrl.value = data
      }
    }
    catch (err) {
      console.error('获取后端仓库URL失败:', err)
      backendRepoUrl.value = ''
    }
  }
  catch (_err) {
    error.value = '加载用户数据失败'
  }
  finally {
    loading.value = false
  }
})

// Update name
async function updateName() {
  if (!newName.value.trim() || newName.value === currentUser.value?.name)
    return

  try {
    loading.value = true
    error.value = ''
    success.value = ''
    await renameUser(userStore.userId, newName.value.trim())
    userStore.setUserName(newName.value.trim())
    if (currentUser.value)
      currentUser.value.name = newName.value.trim()
    success.value = '名字修改成功'
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '修改名字失败'
  }
  finally {
    loading.value = false
  }
}

// Update auto signin
async function updateAutoSignin() {
  try {
    loading.value = true
    error.value = ''
    success.value = ''
    await updateUserAuto(userStore.userId, isAuto.value)
    if (currentUser.value)
      currentUser.value.is_auto = isAuto.value
    success.value = '自动签到设置已更新'
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '更新设置失败'
  }
  finally {
    loading.value = false
  }
}

// Update cookie
async function updateCookie() {
  if (!newCookie.value.trim()) {
    error.value = '请输入 Cookie'
    return
  }

  try {
    loading.value = true
    error.value = ''
    success.value = ''
    await refreshUserCookie(userStore.userId, newCookie.value.trim())
    success.value = 'Cookie 更新成功'
    newCookie.value = ''
    const users = await getUserList()
    currentUser.value = users.find(u => u.id === userStore.userId) || null
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '更新 Cookie 失败'
  }
  finally {
    loading.value = false
  }
}

// Update unified identity
async function updateIdentity() {
  if (!identityAccount.value.trim() || !identityPassword.value.trim()) {
    error.value = '请输入账号和密码'
    return
  }

  try {
    loading.value = true
    error.value = ''
    success.value = ''
    await updateUserIdentity(userStore.userId, identityAccount.value.trim(), identityPassword.value.trim())
    success.value = '统一身份认证信息更新成功'
    const users = await getUserList()
    currentUser.value = users.find(u => u.id === userStore.userId) || null
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '更新统一身份认证失败'
  }
  finally {
    loading.value = false
  }
}

// Delete account
async function deleteAccount() {
  try {
    loading.value = true
    error.value = ''
    await removeUser(userStore.userId)
    userStore.clearUser()
    router.push('/')
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '删除账号失败'
    showDeleteConfirm.value = false
  }
  finally {
    loading.value = false
  }
}

// Go back
function goBack() {
  router.back()
}

// Clear messages
function clearMessages() {
  error.value = ''
  success.value = ''
}

// Auto clear success message after 3 seconds
watch(success, (newValue) => {
  if (newValue) {
    setTimeout(() => {
      success.value = ''
    }, 3000)
  }
})

// Auto clear error message after 5 seconds
watch(error, (newValue) => {
  if (newValue) {
    setTimeout(() => {
      error.value = ''
    }, 5000)
  }
})

// Logout
function logout() {
  userStore.clearUser()
  router.push('/')
}

// Change API endpoint
function changeApiEndpoint() {
  userStore.clearAll()
  router.push('/')
}

// Generate share link
function generateShareLink() {
  const shareUrl = `${window.location.origin}/share?endpoint=${encodeURIComponent(userStore.apiEndpoint)}&user_id=${encodeURIComponent(userStore.userId)}`
  navigator.clipboard.writeText(shareUrl).then(() => {
    success.value = '分享链接已复制到剪贴板'
  }).catch((err) => {
    error.value = '复制失败，请手动复制'
    console.error('复制失败:', err)
  })
}
</script>

<template>
  <div page-bg>
    <!-- Toast Messages -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="error"
          fixed top-4 left-4 right-4 z-50 mx-auto max-w-md
          rounded-lg backdrop-blur-md
          p-3.5 text-xs text-rose-300 shadow-xl
          class="bg-rose-500/10 border border-rose-500/20"
          flex items-center justify-between
        >
          <div flex items-center gap-2>
            <div i-carbon-warning text-sm text-rose-400 />
            <span>{{ error }}</span>
          </div>
          <button btn-ghost text-rose-400 ml-3 @click="clearMessages">
            <div i-carbon-close text-sm />
          </button>
        </div>
      </Transition>
      <Transition name="toast">
        <div
          v-if="success"
          fixed top-4 left-4 right-4 z-50 mx-auto max-w-md
          rounded-lg backdrop-blur-md
          p-3.5 text-xs text-emerald-300 shadow-xl
          class="bg-emerald-500/10 border border-emerald-500/20"
          flex items-center justify-between
        >
          <div flex items-center gap-2>
            <div i-carbon-checkmark text-sm text-emerald-400 />
            <span>{{ success }}</span>
          </div>
          <button btn-ghost text-emerald-400 ml-3 @click="clearMessages">
            <div i-carbon-close text-sm />
          </button>
        </div>
      </Transition>
    </Teleport>

    <div mx-auto max-w-lg px-5 pt-8 pb-16>
      <!-- Header -->
      <div mb-8 flex items-center gap-3>
        <button btn-ghost p-1.5 @click="goBack">
          <div i-carbon-arrow-left text-lg />
        </button>
        <h1 text-xl font-semibold tracking-tight text-slate-50>设置</h1>
      </div>

      <!-- Skeleton Loading -->
      <div v-if="loading && !currentUser" space-y-4>
        <div v-for="i in 4" :key="i" card p-5 animate-pulse>
          <div h-3 w-16 rounded bg-slate-800 mb-4 />
          <div h-10 rounded-lg class="bg-slate-800/50" />
        </div>
      </div>

      <!-- Content -->
      <div v-else space-y-4>
        <!-- User Profile Card -->
        <div card p-5>
          <h2 section-title>用户信息</h2>
          <div flex items-center gap-3 mb-4>
            <div
              w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold
              class="bg-linear-to-br from-emerald-500/20 to-sky-500/20 text-emerald-300 border border-emerald-500/20"
            >
              {{ [...(currentUser?.name || '?')][0] }}
            </div>
            <div>
              <div text-sm font-medium text-slate-100>{{ currentUser?.name || '未知' }}</div>
              <div text-xs text-slate-500 font-mono mt-0.5>{{ userStore.userId.substring(0, 12) }}...</div>
            </div>
          </div>
          <div v-if="currentUser?.expires" flex items-center gap-2 text-xs text-slate-500>
            <div i-carbon-time text-sm />
            <span>Cookie 过期：{{ new Date(currentUser.expires).toLocaleString() }}</span>
          </div>
        </div>

        <!-- Update Name -->
        <div card p-5>
          <h2 section-title>修改名字</h2>
          <div flex gap-2.5>
            <input
              v-model="newName"
              type="text"
              placeholder="输入新名字"
              input-base flex-1 px-3.5 py-2.5 text-sm
            >
            <button
              btn-primary px-4 py-2.5 text-sm whitespace-nowrap
              :disabled="loading || !newName.trim() || newName === currentUser?.name"
              @click="updateName"
            >
              更新
            </button>
          </div>
        </div>

        <!-- Signin Options -->
        <div card p-5>
          <h2 section-title>签到选项</h2>
          <div space-y-4>
            <!-- Auto signin -->
            <label flex cursor-pointer items-center justify-between>
              <div>
                <div text-sm text-slate-200>自动签到</div>
                <div text-xs text-slate-500 mt-0.5>当其他人扫码时自动为你签到</div>
              </div>
              <div relative inline-block h-5 w-9>
                <input
                  v-model="isAuto"
                  type="checkbox"
                  class="peer sr-only"
                  @change="updateAutoSignin"
                >
                <div
                  class="absolute inset-0 rounded-full cursor-pointer transition-colors duration-200"
                  :class="isAuto ? 'bg-emerald-500' : 'bg-slate-700'"
                />
                <div
                  class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full pointer-events-none transition-transform duration-200 bg-white shadow-sm"
                  :class="isAuto ? 'translate-x-4' : ''"
                />
              </div>
            </label>

            <div border-t class="border-slate-800/60" />

            <!-- Notify -->
            <label flex cursor-pointer items-center justify-between>
              <div>
                <div text-sm text-slate-200>群消息推送</div>
                <div text-xs text-slate-500 mt-0.5>签到后发送群消息通知</div>
              </div>
              <div relative inline-block h-5 w-9>
                <input
                  v-model="userStore.notifyEnabled"
                  type="checkbox"
                  class="peer sr-only"
                  @change="userStore.setNotifyEnabled(userStore.notifyEnabled)"
                >
                <div
                  class="absolute inset-0 rounded-full cursor-pointer transition-colors duration-200"
                  :class="userStore.notifyEnabled ? 'bg-emerald-500' : 'bg-slate-700'"
                />
                <div
                  class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full pointer-events-none transition-transform duration-200 bg-white shadow-sm"
                  :class="userStore.notifyEnabled ? 'translate-x-4' : ''"
                />
              </div>
            </label>
          </div>
        </div>

        <!-- Scan Mode -->
        <div card p-5>
          <h2 section-title>扫码方式</h2>
          <div space-y-2>
            <button
              v-for="mode in [
                { value: 'video', label: '视频流扫码', desc: '实时扫描（默认推荐）', icon: 'i-carbon-video', disabled: false },
                { value: 'barcode', label: 'BarcodeDetector', desc: barcodeDetectorAvailable ? '使用浏览器原生 API 扫码' : '当前浏览器不支持', icon: 'i-carbon-barcode', disabled: !barcodeDetectorAvailable },
                { value: 'photo', label: '拍照上传', desc: '拍照后解析二维码', icon: 'i-carbon-camera', disabled: false },
              ]"
              :key="mode.value"
              w-full text-left flex items-center gap-3 rounded-lg p-3
              transition-all duration-200
              :class="[
                userStore.scanMode === mode.value
                  ? 'bg-emerald-500/8 border border-emerald-500/20'
                  : 'bg-slate-800/30 border border-slate-800/50 hover:border-slate-700',
                mode.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
              ]"
              :disabled="mode.disabled"
              @click="!mode.disabled && userStore.setScanMode(mode.value as 'video' | 'barcode' | 'photo')"
            >
              <div
                w-8 h-8 rounded-lg flex items-center justify-center
                :class="userStore.scanMode === mode.value ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'"
              >
                <div :class="mode.icon" text-base />
              </div>
              <div flex-1>
                <div text-sm text-slate-200>{{ mode.label }}</div>
                <div text-xs text-slate-500 mt-0.5>{{ mode.desc }}</div>
              </div>
              <div
                v-if="userStore.scanMode === mode.value"
                i-carbon-checkmark-filled text-emerald-400
              />
            </button>
          </div>
        </div>

        <!-- Update Cookie -->
        <div card p-5>
          <h2 section-title>更新 Cookie</h2>

          <!-- Tab switcher -->
          <div mb-4 flex rounded-lg p-0.5 class="bg-slate-950/60 border border-slate-800/50">
            <button
              flex-1 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer
              :class="activeCookieTab === 'manual'
                ? 'bg-slate-800/80 text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'"
              @click="activeCookieTab = 'manual'"
            >
              手动更新
            </button>
            <button
              flex-1 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer
              :class="activeCookieTab === 'identity'
                ? 'bg-slate-800/80 text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'"
              @click="activeCookieTab = 'identity'"
            >
              统一身份认证
            </button>
          </div>

          <div v-if="activeCookieTab === 'manual'">
            <textarea
              v-model="newCookie"
              placeholder="在此粘贴新的 Cookie"
              rows="5"
              input-base w-full px-3.5 py-2.5 text-xs font-mono resize-none
            />
            <button
              btn-primary mt-2.5 w-full py-2.5 text-sm
              :disabled="loading || !newCookie.trim()"
              @click="updateCookie"
            >
              更新 Cookie
            </button>
          </div>

          <div v-else space-y-2.5>
            <div>
              <label text-xs text-slate-500 mb-1 block>账号</label>
              <input
                v-model="identityAccount"
                type="text"
                placeholder="统一身份认证账号"
                input-base w-full px-3.5 py-2.5 text-sm
              >
            </div>
            <div>
              <label text-xs text-slate-500 mb-1 block>密码</label>
              <input
                v-model="identityPassword"
                type="password"
                placeholder="统一身份认证密码"
                input-base w-full px-3.5 py-2.5 text-sm
              >
            </div>
            <button
              btn-primary mt-0.5 w-full py-2.5 text-sm
              :disabled="loading || !identityAccount.trim() || !identityPassword.trim()"
              @click="updateIdentity"
            >
              更新认证信息
            </button>
          </div>
        </div>

        <!-- Share -->
        <div card p-5>
          <h2 section-title>分享</h2>
          <p text-xs text-slate-500 mb-3>生成链接，让别人可以代你签到</p>
          <button
            btn-secondary w-full py-2.5 text-sm flex items-center justify-center gap-2
            @click="generateShareLink"
          >
            <div i-carbon-share text-sm />
            <span>复制分享链接</span>
          </button>
        </div>

        <!-- Account -->
        <div card p-5>
          <h2 section-title>账号</h2>
          <div space-y-2>
            <button
              btn-secondary w-full py-2.5 text-sm flex items-center justify-center gap-2
              @click="logout"
            >
              <div i-carbon-logout text-sm />
              <span>退出登录</span>
            </button>
            <button
              btn-secondary w-full py-2.5 text-sm flex items-center justify-center gap-2
              @click="changeApiEndpoint"
            >
              <div i-carbon-settings-adjust text-sm />
              <span>更换 API 端点</span>
            </button>
            <button
              w-full py-2.5 text-sm flex items-center justify-center gap-2 rounded-lg cursor-pointer
              transition-all duration-200
              class="bg-rose-500/8 border border-rose-500/20 text-rose-400 hover:bg-rose-500/15"
              @click="showDeleteConfirm = true"
            >
              <div i-carbon-trash-can text-sm />
              <span>删除账号</span>
            </button>
          </div>
        </div>

        <!-- About -->
        <div card p-5>
          <h2 section-title>关于</h2>
          <div space-y-2>
            <a
              href="https://github.com/gaojunran/tronclass-signin-app"
              target="_blank" rel="noopener noreferrer"
              block btn-secondary w-full py-2.5 text-sm text-center
              flex items-center justify-center gap-2 no-underline
            >
              <div i-carbon-logo-github text-sm />
              <span>Web 应用仓库</span>
            </a>
            <a
              :href="backendRepoUrl"
              target="_blank" rel="noopener noreferrer"
              block btn-secondary w-full py-2.5 text-sm text-center
              flex items-center justify-center gap-2 no-underline
            >
              <div i-carbon-logo-github text-sm />
              <span>API 端点仓库</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <Teleport to="body">
        <div
          v-if="showDeleteConfirm"
          fixed inset-0 z-50 flex items-center justify-center
          backdrop-blur-sm p-5
          class="bg-black/80"
        >
          <div card max-w-sm w-full p-6 shadow-2xl class="border-slate-700/50">
            <div flex items-center gap-2 mb-2>
              <div i-carbon-warning-alt text-lg text-rose-400 />
              <h2 text-base font-semibold text-slate-50>确认删除</h2>
            </div>
            <p text-sm text-slate-400 mb-5>此操作无法撤销，确定要删除你的账号吗？</p>
            <div flex gap-2.5>
              <button
                btn-secondary flex-1 py-2.5 text-sm
                @click="showDeleteConfirm = false"
              >
                取消
              </button>
              <button
                flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer
                class="bg-rose-500/15 border border-rose-500/20 text-rose-400 hover:bg-rose-500/25"
                transition-all duration-200
                :disabled="loading"
                @click="deleteAccount"
              >
                {{ loading ? "删除中..." : "确认删除" }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
