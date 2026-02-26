<script setup lang="ts">
import { addUser, refreshUserCookie, updateUserAuto } from '~/api'

defineOptions({
  name: 'CreateUserPage',
})

const userStore = useUserStore()
const router = useRouter()

const name = ref('')
const isAuto = ref(true)
const cookie = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!name.value.trim()) {
    error.value = '请输入用户名'
    return
  }

  try {
    loading.value = true
    error.value = ''

    // Step 1: Create user
    const { id } = await addUser(name.value.trim())

    // Step 2: Update auto setting if needed
    if (!isAuto.value) {
      await updateUserAuto(id, isAuto.value)
    }

    // Step 3: Set cookie if provided
    if (cookie.value.trim()) {
      await refreshUserCookie(id, cookie.value.trim())
    }

    // Save to store
    userStore.setUserId(id)
    userStore.setUserName(name.value.trim())

    // Navigate to main page
    router.push('/')
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '创建失败'
  }
  finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}
</script>

<template>
  <div page-bg>
    <div mx-auto max-w-lg px-6 pb-16 pt-8>
      <!-- Header -->
      <div mb-8 flex items-center gap-3>
        <button btn-ghost p-1.5 @click="goBack">
          <div i-carbon-arrow-left text-lg />
        </button>
        <h1 text-xl text-slate-50 font-semibold tracking-tight>
          创建用户
        </h1>
      </div>

      <!-- Error -->
      <div v-if="error" mb-5 flex items-center gap-2 rounded-lg p-3 text-xs text-rose-400 class="border border-rose-500/20 bg-rose-500/10">
        <div i-carbon-warning flex-shrink-0 text-sm />
        <span>{{ error }}</span>
      </div>

      <!-- Form -->
      <form space-y-5 @submit.prevent="handleSubmit">
        <!-- Name -->
        <div card p-5>
          <h2 section-title>
            基本信息
          </h2>
          <div>
            <label mb-1.5 block text-xs text-slate-500>
              用户名 <span text-rose-400>*</span>
            </label>
            <input
              v-model="name"
              type="text"
              placeholder="输入用户名"
              input-base w-full px-3.5 py-2.5 text-sm
            >
          </div>
        </div>

        <!-- Options -->
        <div card p-5>
          <h2 section-title>
            签到选项
          </h2>
          <label flex cursor-pointer items-center justify-between>
            <div>
              <div text-sm text-slate-200>自动签到</div>
              <div mt-0.5 text-xs text-slate-500>扫码时自动帮此用户一起签到</div>
            </div>
            <div relative inline-block h-5 w-9>
              <input
                v-model="isAuto"
                type="checkbox"
                class="peer sr-only"
              >
              <div
                class="absolute inset-0 cursor-pointer rounded-full transition-colors duration-200"
                :class="isAuto ? 'bg-emerald-500' : 'bg-slate-700'"
                @click="isAuto = !isAuto"
              />
              <div
                class="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                :class="isAuto ? 'translate-x-4' : ''"
              />
            </div>
          </label>
        </div>

        <!-- Cookie -->
        <div card p-5>
          <h2 section-title>
            认证信息
          </h2>
          <div space-y-3>
            <div>
              <label mb-1.5 block text-xs text-slate-500>
                Cookie
                <span text-slate-600>（可选）</span>
              </label>
              <textarea
                v-model="cookie"
                placeholder="粘贴 Cookie"
                rows="3"
                input-base w-full resize-none px-3.5 py-2.5 text-xs font-mono
              />
            </div>

            <!-- Help -->
            <!-- <div

              flex items-start gap-2 rounded-lg p-3
              class="border border-slate-800/50 bg-slate-800/30"
            >
              <div i-carbon-information mt-0.5 flex-shrink-0 text-sm text-slate-500 />
              <div text-xs text-slate-500 space-y-1>
                <div>不填写 Cookie 的用户将使用扫码者的 Cookie</div>
                <div>获取方式：登录 TronClass → F12 → Network → 复制 Cookie</div>
              </div>
            </div> -->
          </div>
        </div>

        <!-- Submit -->
        <button
          type="submit"

          btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm
          :disabled="loading"
        >
          <template v-if="loading">
            <div i-carbon-loading animate-spin text-sm />
            <span>创建中...</span>
          </template>
          <template v-else>
            <div i-carbon-add text-sm />
            <span>创建用户</span>
          </template>
        </button>
      </form>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
