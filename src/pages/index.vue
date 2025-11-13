<script setup lang="ts">
import type { ScanHistory, SigninHistory, SigninResponse, UserWithCookie } from '~/types/index'
import { formatRelativeTime } from '~/utils'
import { getUserList, signin } from '~/api'
import { useQRScanner } from '~/composables/qrScanner'

defineOptions({
  name: 'IndexPage',
})

const userStore = useUserStore()
const router = useRouter()

// State
const step = ref<'config' | 'select-user' | 'main'>('config')
const apiUrl = ref('')
const users = ref<UserWithCookie[]>([])
const loading = ref(false)
const error = ref('')

// Recent scan history
const recentScans = ref<ScanHistory[]>([])
const lastSignin = ref<SigninHistory | null>(null)

// QR Scanner
const showScanner = ref(false)
const videoElement = ref<HTMLVideoElement | null>(null)
const { startScanning, stopScanning, isScanning } = useQRScanner()

// Scan result display
const scanResult = ref<SigninResponse | null>(null)

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
    loading.value = true
    error.value = ''
    users.value = await getUserList()
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load users'
  }
  finally {
    loading.value = false
  }
}

// Set API endpoint
async function setApiEndpoint() {
  if (!apiUrl.value.trim()) {
    error.value = 'Please enter API endpoint URL'
    return
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
    loading.value = true
    const [scans, signins] = await Promise.all([
      fetch(`${userStore.apiEndpoint}/history/scan?count=3`).then(r => r.json()),
      fetch(`${userStore.apiEndpoint}/history/signin?user_id=${userStore.userId}&count=1`).then(r => r.json()),
    ])
    recentScans.value = scans
    lastSignin.value = signins.length > 0 ? signins[0] : null
  }
  catch (err) {
    console.error('Failed to load data:', err)
  }
  finally {
    loading.value = false
  }
}

// Start QR scanning
async function startQRScan() {
  showScanner.value = true
  scanResult.value = null
  await nextTick()

  if (videoElement.value) {
    try {
      await startScanning(videoElement.value, handleScanResult)
    }
    catch (err) {
      error.value = 'Failed to start camera'
      showScanner.value = false
    }
  }
}

// Handle scan result
async function handleScanResult(result: string) {
  stopScanning()
  showScanner.value = false

  try {
    loading.value = true
    const response = await signin(result)
    scanResult.value = response
    await loadMainData()
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to sign in'
  }
  finally {
    loading.value = false
  }
}

// Close scanner
function closeScanner() {
  stopScanning()
  showScanner.value = false
}

// Navigate to settings
function goToSettings() {
  router.push('/settings')
}

// Navigate to history
function goToHistory() {
  router.push('/history')
}
</script>

<template>
  <div min-h-screen bg-neutral-900 text-neutral-100 p-6>
    <!-- Step 1: API Configuration -->
    <div v-if="step === 'config'" max-w-md mx-auto mt-20>
      <div text-3xl font-bold mb-8>
        <div i-carbon-qr-code inline-block mr-2 />
        Signin App
      </div>

      <div mb-6>
        <label text-sm text-neutral-400 mb-2 block>API Endpoint URL</label>
        <input
          v-model="apiUrl"
          type="url"
          placeholder="https://api.example.com"
          bg-neutral-800 border-1 border-neutral-700 rounded px-4 py-3 w-full
          focus:outline-none focus:border-neutral-500
          @keydown.enter="setApiEndpoint"
        >
      </div>

      <button
        bg-neutral-700 hover:bg-neutral-600 px-6 py-3 rounded w-full
        :disabled="loading"
        @click="setApiEndpoint"
      >
        {{ loading ? 'Connecting...' : 'Continue' }}
      </button>

      <div v-if="error" mt-4 text-red-400 text-sm>
        {{ error }}
      </div>
    </div>

    <!-- Step 2: User Selection -->
    <div v-else-if="step === 'select-user'" max-w-2xl mx-auto mt-10>
      <div text-2xl font-bold mb-6>
        Select Your Account
      </div>

      <div v-if="loading" text-center py-10>
        <div i-carbon-loading animate-spin text-4xl />
      </div>

      <div v-else>
        <div space-y-3 mb-6>
          <div
            v-for="user in users"
            :key="user.id"
            bg-neutral-800 hover:bg-neutral-750 border-1 border-neutral-700 rounded p-4 cursor-pointer
            @click="selectUser(user)"
          >
            <div flex items-center justify-between>
              <div>
                <div text-lg font-medium>{{ user.name }}</div>
                <div text-sm text-neutral-400>
                  Auto signin: {{ user.is_auto ? 'Yes' : 'No' }}
                </div>
                <div v-if="user.expires" text-xs text-neutral-500 mt-1>
                  Cookie expires: {{ new Date(user.expires).toLocaleDateString() }}
                </div>
              </div>
              <div i-carbon-chevron-right text-xl text-neutral-500 />
            </div>
          </div>
        </div>

        <button
          bg-neutral-700 hover:bg-neutral-600 px-6 py-3 rounded w-full
          @click="createNewUser"
        >
          <div i-carbon-add inline-block mr-2 />
          Create New User
        </button>
      </div>

      <div v-if="error" mt-4 text-red-400 text-sm>
        {{ error }}
      </div>
    </div>

    <!-- Step 3: Main Page -->
    <div v-else-if="step === 'main'" max-w-4xl mx-auto>
      <!-- Header -->
      <div flex items-center justify-between mb-8>
        <div>
          <div text-2xl font-bold>Welcome, {{ userStore.userName }}</div>
          <div text-sm text-neutral-400 mt-1>
            Last signin: {{ lastSignin ? formatRelativeTime(lastSignin.created_at) : 'Never' }}
          </div>
        </div>
        <button
          bg-neutral-800 hover:bg-neutral-700 p-3 rounded
          @click="goToSettings"
        >
          <div i-carbon-settings text-xl />
        </button>
      </div>

      <!-- Scan Result Display -->
      <div v-if="scanResult" bg-neutral-800 border-1 border-neutral-700 rounded p-6 mb-6>
        <div text-lg font-bold mb-4>
          <div i-carbon-checkmark-filled inline-block text-green-400 mr-2 />
          Scan Complete
        </div>

        <div mb-4>
          <div text-sm text-neutral-400 mb-1>Scan Result:</div>
          <div text-sm font-mono bg-neutral-900 p-3 rounded break-all>
            {{ scanResult.scan_result.result }}
          </div>
        </div>

        <div>
          <div text-sm text-neutral-400 mb-2>Signin Results ({{ scanResult.signin_results.length }}):</div>
          <div space-y-2>
            <div
              v-for="signinItem in scanResult.signin_results"
              :key="signinItem.id"
              bg-neutral-900 p-3 rounded text-sm
            >
              <div flex items-center justify-between>
                <div>User ID: {{ signinItem.user_id }}</div>
                <div
                  :class="signinItem.response_code === 200 ? 'text-green-400' : 'text-red-400'"
                >
                  {{ signinItem.response_code }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          mt-4 bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded text-sm
          @click="scanResult = null"
        >
          Close
        </button>
      </div>

      <!-- Scan Button -->
      <button
        bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-lg text-lg font-medium w-full mb-8
        :disabled="loading || isScanning"
        @click="startQRScan"
      >
        <div i-carbon-qr-code inline-block mr-2 text-2xl />
        {{ isScanning ? 'Scanning...' : 'Scan QR Code' }}
      </button>

      <!-- Recent Scans -->
      <div mb-8>
        <div flex items-center justify-between mb-4>
          <div text-lg font-bold>Recent Scans</div>
          <button
            text-sm text-neutral-400 hover:text-neutral-200
            @click="goToHistory"
          >
            View All
            <div i-carbon-chevron-right inline-block />
          </button>
        </div>

        <div v-if="recentScans.length === 0" text-center py-8 text-neutral-500>
          No scan history yet
        </div>

        <div v-else space-y-3>
          <div
            v-for="scan in recentScans"
            :key="scan.id"
            bg-neutral-800 border-1 border-neutral-700 rounded p-4
          >
            <div flex items-start justify-between>
              <div flex-1 mr-4>
                <div text-sm font-mono text-neutral-300 break-all>
                  {{ scan.result.substring(0, 60) }}{{ scan.result.length > 60 ? '...' : '' }}
                </div>
                <div text-xs text-neutral-500 mt-2>
                  {{ formatRelativeTime(scan.created_at) }}
                </div>
              </div>
              <div i-carbon-qr-code text-xl text-neutral-600 />
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" bg-red-900 bg-opacity-20 border-1 border-red-700 rounded p-4 text-red-400 text-sm>
        {{ error }}
      </div>
    </div>

    <!-- QR Scanner Modal -->
    <div
      v-if="showScanner"
      fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-6
    >
      <div max-w-2xl w-full>
        <div flex items-center justify-between mb-4>
          <div text-xl font-bold>Scan QR Code</div>
          <button
            bg-neutral-800 hover:bg-neutral-700 p-2 rounded
            @click="closeScanner"
          >
            <div i-carbon-close text-xl />
          </button>
        </div>

        <div bg-neutral-900 rounded-lg overflow-hidden>
          <video ref="videoElement" w-full h-auto />
        </div>

        <div text-sm text-neutral-400 text-center mt-4>
          Position the QR code within the frame
        </div>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
