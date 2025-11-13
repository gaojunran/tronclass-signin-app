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
// Cookie update tab: 'manual' for manual cookie paste, 'identity' for unified identity
const activeCookieTab = ref<'manual' | 'identity'>('manual')

// Identity fields for automatic cookie update
const identityAccount = ref('')
const identityPassword = ref('')

// Confirmation dialogs
const showDeleteConfirm = ref(false)

// Load current user data
onMounted(async () => {
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
      // initialize identity fields if available
      identityAccount.value = currentUser.value.identity_account || ''
      identityPassword.value = currentUser.value.identity_password || ''
    }

    // Fetch backend repo URL
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
  catch (err) {
    error.value = '加载用户数据失败'
  }
  finally {
    loading.value = false
  }
})

// Update name
async function updateName() {
  if (!newName.value.trim() || newName.value === currentUser.value?.name) {
    return
  }

  try {
    loading.value = true
    error.value = ''
    success.value = ''

    await renameUser(userStore.userId, newName.value.trim())
    userStore.setUserName(newName.value.trim())

    if (currentUser.value) {
      currentUser.value.name = newName.value.trim()
    }

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

    if (currentUser.value) {
      currentUser.value.is_auto = isAuto.value
    }

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

    // Reload user data
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

// Update unified identity account/password
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

    // Reload user data
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

  // Copy to clipboard
  navigator.clipboard.writeText(shareUrl).then(() => {
    success.value = '分享链接已复制到剪贴板'
  }).catch((err) => {
    error.value = '复制失败，请手动复制'
    console.error('复制失败:', err)
  })
}
</script>

<template>
  <div min-h-screen bg-neutral-900 p-6 text-neutral-100>
    <!-- Fixed Messages at Top -->
    <div
      v-if="error"

      fixed left-6 right-6 top-6 z-50 mx-auto max-w-md flex items-center justify-between border-1 border-red-700 rounded-lg bg-red-900 bg-opacity-95 p-4 text-sm text-red-200 shadow-lg
    >
      <span>{{ error }}</span>
      <button
        ml-2
        text-xs
        underline
        hover:text-red-100
        @click="clearMessages"
      >
        关闭
      </button>
    </div>

    <div
      v-if="success"

      fixed left-6 right-6 top-6 z-50 mx-auto max-w-md flex items-center justify-between border-1 border-green-700 rounded-lg bg-green-900 bg-opacity-95 p-4 text-sm text-green-200 shadow-lg
    >
      <span>{{ success }}</span>
      <button
        ml-2
        text-xs
        underline
        hover:text-green-100
        @click="clearMessages"
      >
        关闭
      </button>
    </div>

    <div mx-auto mt-10 max-w-2xl>
      <!-- Header -->
      <div mb-8 flex items-center>
        <button

          mr-4 rounded bg-neutral-800 p-2 hover:bg-neutral-700
          @click="goBack"
        >
          <div i-carbon-arrow-left text-xl />
        </button>
        <div text-2xl font-bold>
          设置
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading && !currentUser" py-10 text-center>
        <div i-carbon-loading animate-spin text-4xl />
      </div>

      <!-- Content -->
      <div v-else space-y-6>
        <!-- User Info -->
        <div border-1 border-neutral-700 rounded-lg bg-neutral-800 p-6>
          <div mb-4 text-lg font-bold>
            用户信息
          </div>

          <div space-y-4>
            <div>
              <div mb-1 text-sm text-neutral-400>
                用户 ID
              </div>
              <div break-all rounded bg-neutral-900 p-3 text-sm font-mono>
                {{ userStore.userId }}
              </div>
            </div>

            <div v-if="currentUser?.expires">
              <div mb-1 text-sm text-neutral-400>
                Cookie 过期时间
              </div>
              <div text-sm>
                {{ new Date(currentUser.expires).toLocaleString() }}
              </div>
            </div>
          </div>
        </div>

        <!-- Update Name -->
        <div border-1 border-neutral-700 rounded-lg bg-neutral-800 p-6>
          <div mb-4 text-lg font-bold>
            修改名字
          </div>

          <div flex gap-3>
            <input
              v-model="newName"
              type="text"
              placeholder="输入新名字"

              flex-1 border-1 border-neutral-700 rounded bg-neutral-900 px-4 py-3 focus:border-neutral-500 focus:outline-none
            >
            <button

              whitespace-nowrap rounded bg-orange-600 px-6 py-3 hover:bg-orange-500
              :disabled="
                loading || !newName.trim() || newName === currentUser?.name
              "
              @click="updateName"
            >
              更新
            </button>
          </div>
        </div>

        <!-- Auto Signin -->
        <div border-1 border-neutral-700 rounded-lg bg-neutral-800 p-6>
          <div mb-4 text-lg font-bold>
            自动签到
          </div>

          <label flex cursor-pointer items-center justify-between>
            <div>
              <div text-sm font-medium>启用自动签到</div>
              <div mt-1 text-xs text-neutral-500>
                当其他人扫码时自动为你签到
              </div>
            </div>
            <div relative inline-block h-6 w-12>
              <input
                v-model="isAuto"
                type="checkbox"
                class="peer sr-only"
                @change="updateAutoSignin"
              >
              <div
                class="peer absolute inset-0 rounded-full transition-colors"
                :class="isAuto ? 'bg-orange-600' : 'bg-neutral-700'"
              />
              <div
                class="peer absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform"
                :class="isAuto ? 'translate-x-6' : ''"
              />
            </div>
          </label>
        </div>

        <!-- Scan Mode -->
        <div border-1 border-neutral-700 rounded-lg bg-neutral-800 p-6>
          <div mb-4 text-lg font-bold>
            扫码方式
          </div>

          <div space-y-3>
            <label

              flex cursor-pointer items-center rounded p-3 transition-colors
              :class="userStore.scanMode === 'video' ? 'bg-orange-600 bg-opacity-20 border-1 border-orange-600' : 'bg-neutral-900 border-1 border-neutral-700 hover:bg-neutral-800'"
              @click="userStore.setScanMode('video')"
            >
              <input
                type="radio"
                name="scanMode"
                value="video"
                :checked="userStore.scanMode === 'video'"
                class="sr-only"
              >
              <div flex-1>
                <div text-sm font-medium>视频流扫码</div>
                <div mt-1 text-xs text-neutral-400>
                  实时扫描二维码（默认）
                </div>
              </div>
              <div
                v-if="userStore.scanMode === 'video'"
                i-carbon-checkmark
                text-xl
                text-orange-500
              />
            </label>

            <label

              flex cursor-pointer items-center rounded p-3 transition-colors
              :class="userStore.scanMode === 'photo' ? 'bg-orange-600 bg-opacity-20 border-1 border-orange-600' : 'bg-neutral-900 border-1 border-neutral-700 hover:bg-neutral-800'"
              @click="userStore.setScanMode('photo')"
            >
              <input
                type="radio"
                name="scanMode"
                value="photo"
                :checked="userStore.scanMode === 'photo'"
                class="sr-only"
              >
              <div flex-1>
                <div text-sm font-medium>拍照上传</div>
                <div mt-1 text-xs text-neutral-400>
                  拍照后上传解析二维码
                </div>
              </div>
              <div
                v-if="userStore.scanMode === 'photo'"
                i-carbon-checkmark
                text-xl
                text-orange-500
              />
            </label>
          </div>
        </div>

        <!-- Update Cookie (manual / identity tabs) -->
        <div border-1 border-neutral-700 rounded-lg bg-neutral-800 p-6>
          <div mb-4 text-lg font-bold>
            更新 Cookie
          </div>

          <div mb-4 flex items-center gap-2>
            <button
              :class="activeCookieTab === 'manual' ? 'bg-orange-600' : 'bg-neutral-900'
              "
              class="flex-1 rounded px-4 py-2"
              @click="activeCookieTab = 'manual'"
            >
              手动更新 Cookie
            </button>
            <button
              :class="activeCookieTab === 'identity' ? 'bg-orange-600' : 'bg-neutral-900'"
              class="flex-1 rounded px-4 py-2"
              @click="activeCookieTab = 'identity'"
            >
              自动更新 Cookie（统一身份认证）
            </button>
          </div>

          <div v-if="activeCookieTab === 'manual'">
            <textarea
              v-model="newCookie"
              placeholder="在此粘贴新的 Cookie"

              rows="6"

              w-full border-1 border-neutral-700 rounded bg-neutral-900 px-4 py-3 text-sm font-mono focus:border-neutral-500 focus:outline-none
            />

            <button

              mt-3 w-full rounded bg-orange-600 px-6 py-3 hover:bg-orange-500
              :disabled="loading || !newCookie.trim()"
              @click="updateCookie"
            >
              更新 Cookie
            </button>
          </div>

          <div v-else>
            <div space-y-3>
              <div>
                <div mb-1 text-sm text-neutral-400>
                  统一身份认证账号
                </div>
                <input
                  v-model="identityAccount"
                  type="text"
                  placeholder="账号"

                  w-full border-1 border-neutral-700 rounded bg-neutral-900 px-4 py-3 focus:border-neutral-500 focus:outline-none
                >
              </div>

              <div>
                <div mb-1 text-sm text-neutral-400>
                  统一身份认证密码
                </div>
                <input
                  v-model="identityPassword"
                  type="password"
                  placeholder="密码"

                  w-full border-1 border-neutral-700 rounded bg-neutral-900 px-4 py-3 focus:border-neutral-500 focus:outline-none
                >
              </div>
            </div>

            <button

              mt-3 w-full rounded bg-orange-600 px-6 py-3 hover:bg-orange-500
              :disabled="loading || !identityAccount.trim() || !identityPassword.trim()"
              @click="updateIdentity"
            >
              更新统一身份认证信息
            </button>
          </div>
        </div>

        <!-- Share Link -->
        <div border-1 border-neutral-700 rounded-lg bg-neutral-800 p-6>
          <div mb-4 text-lg font-bold>
            分享链接
          </div>

          <div mb-3 text-sm text-neutral-400>
            生成一个链接，让别人可以代你签到
          </div>

          <button

            w-full flex items-center justify-center gap-2 rounded bg-orange-600 px-6 py-3 hover:bg-orange-500
            @click="generateShareLink"
          >
            <div i-carbon-share />
            <span>生成分享链接</span>
          </button>
        </div>

        <!-- Logout & Change API -->
        <div border-1 border-neutral-700 rounded-lg bg-neutral-800 p-6>
          <div mb-4 text-lg font-bold>
            账号管理
          </div>

          <div space-y-3>
            <button

              w-full flex items-center justify-center gap-2 rounded bg-neutral-700 px-6 py-3 hover:bg-neutral-600
              @click="logout"
            >
              <div i-carbon-logout />
              <span>退出登录</span>
            </button>

            <button

              w-full flex items-center justify-center gap-2 rounded bg-neutral-700 px-6 py-3 hover:bg-neutral-600
              @click="changeApiEndpoint"
            >
              <div i-carbon-settings-adjust />
              <span>更换 API 端点</span>
            </button>

            <button

              w-full flex items-center justify-center gap-2 rounded bg-red-900 px-6 py-3 text-red-200 hover:bg-red-800
              @click="showDeleteConfirm = true"
            >
              <div i-carbon-trash-can />
              <span>删除账号</span>
            </button>
          </div>
        </div>

        <!-- GitHub Link -->
        <div border-1 border-neutral-700 rounded-lg bg-neutral-800 p-6>
          <div mb-4 text-lg font-bold>
            关于
          </div>

          <div space-y-3>
            <a
              href="https://github.com/gaojunran/tronclass-signin-app"
              target="_blank"
              rel="noopener noreferrer"

              w-full flex items-center justify-center gap-2 rounded bg-neutral-700 px-6 py-3 text-neutral-100 no-underline hover:bg-neutral-600
            >
              <div i-carbon-logo-github />
              <span>查看 Web 应用仓库</span>
            </a>

            <a
              :href="backendRepoUrl"
              target="_blank"
              rel="noopener noreferrer"

              w-full flex items-center justify-center gap-2 rounded bg-neutral-700 px-6 py-3 text-neutral-100 no-underline hover:bg-neutral-600
            >
              <div i-carbon-logo-github />
              <span>查看 API 端点仓库</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div
        v-if="showDeleteConfirm"

        fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-6
      >
        <div

          max-w-md w-full border-1 border-neutral-700 rounded-lg bg-neutral-800 p-6
        >
          <div mb-4 text-xl font-bold>
            确认删除
          </div>

          <div mb-6 text-sm text-neutral-300>
            你确定要删除你的账号吗？此操作无法撤销。
          </div>

          <div flex gap-3>
            <button

              flex-1 rounded bg-neutral-700 px-4 py-3 hover:bg-neutral-600
              @click="showDeleteConfirm = false"
            >
              取消
            </button>
            <button

              flex-1 rounded bg-red-900 px-4 py-3 text-red-200 hover:bg-red-800
              :disabled="loading"
              @click="deleteAccount"
            >
              {{ loading ? "删除中..." : "删除" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
