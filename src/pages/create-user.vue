<script setup lang="ts">
import { addUser, refreshUserCookie } from '~/api'

defineOptions({
  name: 'CreateUserPage',
})

const userStore = useUserStore()
const router = useRouter()

// Form state
const name = ref('')
const isAuto = ref(true)
const cookie = ref('')
const loading = ref(false)
const error = ref('')

// Create user
async function createUser() {
  if (!name.value.trim()) {
    error.value = 'Please enter a name'
    return
  }

  if (!cookie.value.trim()) {
    error.value = 'Please enter cookie'
    return
  }

  try {
    loading.value = true
    error.value = ''

    // Step 1: Add user
    const { id } = await addUser(name.value.trim())

    // Step 2: Update is_auto if needed
    if (!isAuto.value) {
      await fetch(`${userStore.apiEndpoint}/user/auto/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ua_info: await getBrowserInfo(),
          is_auto: false,
        }),
      })
    }

    // Step 3: Refresh cookie
    await refreshUserCookie(id, cookie.value.trim())

    // Save to store
    userStore.setUserId(id)
    userStore.setUserName(name.value.trim())

    // Navigate to main page
    router.push('/')
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create user'
  }
  finally {
    loading.value = false
  }
}

// Get browser info
async function getBrowserInfo() {
  try {
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      const info = await navigator.userAgentData.getHighEntropyValues([
        'model',
        'platform',
        'platformVersion',
        'architecture',
        'bitness',
        'uaFullVersion',
      ]) as any

      const uaCHString = [
        `Platform: ${info.platform || 'Unknown'}`,
        `Version: ${info.platformVersion || 'Unknown'}`,
        `Model: ${info.model || 'Unknown'}`,
        `Architecture: ${info.architecture || 'Unknown'}`,
        `Bitness: ${info.bitness || 'Unknown'}`,
        `FullVersion: ${info.uaFullVersion || 'Unknown'}`,
      ].join(' | ')

      return uaCHString
    }
    else {
      return `User-Agent: ${navigator.userAgent}`
    }
  }
  catch (err) {
    console.error('获取 UA 信息失败:', err)
    return `User-Agent: ${navigator.userAgent}`
  }
}

// Go back
function goBack() {
  router.back()
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
        <div text-2xl font-bold>Create New User</div>
      </div>

      <!-- Form -->
      <div bg-neutral-800 border-1 border-neutral-700 rounded-lg p-6>
        <!-- Name -->
        <div mb-6>
          <label text-sm text-neutral-400 mb-2 block>
            Name <span text-red-400>*</span>
          </label>
          <input
            v-model="name"
            type="text"
            placeholder="Enter your name"
            bg-neutral-900 border-1 border-neutral-700 rounded px-4 py-3 w-full
            focus:outline-none focus:border-neutral-500
          >
        </div>

        <!-- Auto Signin -->
        <div mb-6>
          <label flex items-center cursor-pointer>
            <input
              v-model="isAuto"
              type="checkbox"
              mr-3
            >
            <div>
              <div text-sm font-medium>Enable Auto Signin</div>
              <div text-xs text-neutral-500>Automatically sign in when others scan QR codes</div>
            </div>
          </label>
        </div>

        <!-- Cookie -->
        <div mb-6>
          <label text-sm text-neutral-400 mb-2 block>
            Cookie <span text-red-400>*</span>
          </label>
          <textarea
            v-model="cookie"
            placeholder="Paste your cookie here"
            bg-neutral-900 border-1 border-neutral-700 rounded px-4 py-3 w-full
            rows="6"
            font-mono text-sm
            focus:outline-none focus:border-neutral-500
          />
          <div text-xs text-neutral-500 mt-2>
            <div i-carbon-information inline-block mr-1 />
            Copy the cookie from your browser's developer tools
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" bg-red-900 bg-opacity-20 border-1 border-red-700 rounded p-3 text-red-400 text-sm mb-6>
          {{ error }}
        </div>

        <!-- Submit -->
        <button
          bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded w-full font-medium
          :disabled="loading"
          @click="createUser"
        >
          {{ loading ? 'Creating...' : 'Create User' }}
        </button>
      </div>

      <!-- Help Text -->
      <div mt-6 text-sm text-neutral-500>
        <div mb-2>
          <div i-carbon-help inline-block mr-1 />
          How to get your cookie:
        </div>
        <ol list-decimal list-inside space-y-1 ml-4>
          <li>Open your browser's developer tools (F12)</li>
          <li>Go to the Application/Storage tab</li>
          <li>Find Cookies in the left sidebar</li>
          <li>Copy the cookie value you need</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
