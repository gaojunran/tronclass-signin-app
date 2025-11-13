<script setup lang="ts">
import type { UserWithCookie } from '~/types/index'
import { getUserList, refreshUserCookie, removeUser, renameUser, updateUserAuto } from '~/api'

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

// Form state
const newName = ref('')
const newCookie = ref('')
const isAuto = ref(true)

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
</script>

<template>
  <div min-h-screen bg-neutral-900 text-neutral-100 p-6>
    <div max-w-2xl mx-auto mt-10>
      <!-- Header -->
      <div flex items-center mb-8>
        <button
          bg-neutral-800 hover:bg-neutral-700 p-2 rounded mr-4
          @click="goBack"
        >
          <div i-carbon-arrow-left text-xl />
        </button>
        <div text-2xl font-bold>设置</div>
      </div>

      <!-- Loading -->
      <div v-if="loading && !currentUser" text-center py-10>
        <div i-carbon-loading animate-spin text-4xl />
      </div>

      <!-- Content -->
      <div v-else space-y-6>
        <!-- Messages -->
        <div v-if="error" bg-red-900 bg-opacity-20 border-1 border-red-700 rounded p-4 text-red-400 text-sm>
          {{ error }}
          <button ml-2 text-xs underline @click="clearMessages">
            关闭
          </button>
        </div>

        <div v-if="success" bg-green-900 bg-opacity-20 border-1 border-green-700 rounded p-4 text-green-400 text-sm>
          {{ success }}
          <button ml-2 text-xs underline @click="clearMessages">
            关闭
          </button>
        </div>

        <!-- User Info -->
        <div bg-neutral-800 border-1 border-neutral-700 rounded-lg p-6>
          <div text-lg font-bold mb-4>用户信息</div>

          <div space-y-4>
            <div>
              <div text-sm text-neutral-400 mb-1>用户 ID</div>
              <div text-sm font-mono bg-neutral-900 p-3 rounded break-all>
                {{ userStore.userId }}
              </div>
            </div>

            <div v-if="currentUser?.expires">
              <div text-sm text-neutral-400 mb-1>Cookie 过期时间</div>
              <div text-sm>
                {{ new Date(currentUser.expires).toLocaleString() }}
              </div>
            </div>
          </div>
        </div>

        <!-- Update Name -->
        <div bg-neutral-800 border-1 border-neutral-700 rounded-lg p-6>
          <div text-lg font-bold mb-4>修改名字</div>

          <div flex gap-3>
            <input
              v-model="newName"
              type="text"
              placeholder="输入新名字"
              bg-neutral-900 border-1 border-neutral-700 rounded px-4 py-3 flex-1
              focus:outline-none focus:border-neutral-500
            >
            <button
              bg-orange-600 hover:bg-orange-500 px-6 py-3 rounded
              :disabled="loading || !newName.trim() || newName === currentUser?.name"
              @click="updateName"
            >
              更新
            </button>
          </div>
        </div>

        <!-- Auto Signin -->
        <div bg-neutral-800 border-1 border-neutral-700 rounded-lg p-6>
          <div text-lg font-bold mb-4>自动签到</div>

          <label flex items-center justify-between cursor-pointer>
            <div>
              <div text-sm font-medium>启用自动签到</div>
              <div text-xs text-neutral-500 mt-1>
                当其他人扫码时自动为你签到
              </div>
            </div>
            <div relative inline-block w-12 h-6>
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
                class="peer absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform"
                :class="isAuto ? 'translate-x-6' : ''"
              />
            </div>
          </label>
        </div>

        <!-- Update Cookie -->
        <div bg-neutral-800 border-1 border-neutral-700 rounded-lg p-6>
          <div text-lg font-bold mb-4>更新 Cookie</div>

          <textarea
            v-model="newCookie"
            placeholder="在此粘贴新的 Cookie"
            bg-neutral-900 border-1 border-neutral-700 rounded px-4 py-3 w-full
            rows="6"
            font-mono text-sm
            focus:outline-none focus:border-neutral-500
          />

          <button
            mt-3 bg-orange-600 hover:bg-orange-500 px-6 py-3 rounded w-full
            :disabled="loading || !newCookie.trim()"
            @click="updateCookie"
          >
            更新 Cookie
          </button>
        </div>

        <!-- Logout & Change API -->
        <div bg-neutral-800 border-1 border-neutral-700 rounded-lg p-6>
          <div text-lg font-bold mb-4>账号管理</div>

          <div space-y-3>
            <button
              bg-neutral-700 hover:bg-neutral-600 px-6 py-3 rounded w-full flex items-center justify-center gap-2
              @click="logout"
            >
              <div i-carbon-logout />
              <span>退出登录</span>
            </button>

            <button
              bg-neutral-700 hover:bg-neutral-600 px-6 py-3 rounded w-full flex items-center justify-center gap-2
              @click="changeApiEndpoint"
            >
              <div i-carbon-settings-adjust />
              <span>更换 API 端点</span>
            </button>

            <button
            bg-red-900 hover:bg-red-800 text-red-200 px-6 py-3 rounded w-full flex items-center justify-center gap-2
            @click="showDeleteConfirm = true"
          >
            <div i-carbon-trash-can />
            <span>删除账号</span>
          </button>
          </div>
        </div>

        <!-- GitHub Link -->
        <div bg-neutral-800 border-1 border-neutral-700 rounded-lg p-6>
          <div text-lg font-bold mb-4>关于</div>

          <a
            href="https://github.com/gaojunran/tronclass-signin-app"
            target="_blank"
            rel="noopener noreferrer"
            bg-neutral-700 hover:bg-neutral-600 px-6 py-3 rounded w-full flex items-center justify-center gap-2 text-neutral-100 no-underline
          >
            <div i-carbon-logo-github />
            <span>查看 GitHub 仓库</span>
          </a>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div
        v-if="showDeleteConfirm"
        fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-6
      >
        <div bg-neutral-800 border-1 border-neutral-700 rounded-lg p-6 max-w-md w-full>
          <div text-xl font-bold mb-4>确认删除</div>

          <div text-sm text-neutral-300 mb-6>
            你确定要删除你的账号吗？此操作无法撤销。
          </div>

          <div flex gap-3>
            <button
              flex-1 bg-neutral-700 hover:bg-neutral-600 px-4 py-3 rounded
              @click="showDeleteConfirm = false"
            >
              取消
            </button>
            <button
              flex-1 bg-red-900 hover:bg-red-800 text-red-200 px-4 py-3 rounded
              :disabled="loading"
              @click="deleteAccount"
            >
              {{ loading ? '删除中...' : '删除' }}
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
