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
    error.value = 'Failed to load user data'
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

    success.value = 'Name updated successfully'
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update name'
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

    success.value = 'Auto signin setting updated'
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update setting'
  }
  finally {
    loading.value = false
  }
}

// Update cookie
async function updateCookie() {
  if (!newCookie.value.trim()) {
    error.value = 'Please enter cookie'
    return
  }

  try {
    loading.value = true
    error.value = ''
    success.value = ''

    await refreshUserCookie(userStore.userId, newCookie.value.trim())

    success.value = 'Cookie updated successfully'
    newCookie.value = ''

    // Reload user data
    const users = await getUserList()
    currentUser.value = users.find(u => u.id === userStore.userId) || null
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update cookie'
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
    error.value = err instanceof Error ? err.message : 'Failed to delete account'
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
        <div text-2xl font-bold>Settings</div>
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
            Dismiss
          </button>
        </div>

        <div v-if="success" bg-green-900 bg-opacity-20 border-1 border-green-700 rounded p-4 text-green-400 text-sm>
          {{ success }}
          <button ml-2 text-xs underline @click="clearMessages">
            Dismiss
          </button>
        </div>

        <!-- User Info -->
        <div bg-neutral-800 border-1 border-neutral-700 rounded-lg p-6>
          <div text-lg font-bold mb-4>User Information</div>

          <div space-y-4>
            <div>
              <div text-sm text-neutral-400 mb-1>User ID</div>
              <div text-sm font-mono bg-neutral-900 p-3 rounded break-all>
                {{ userStore.userId }}
              </div>
            </div>

            <div v-if="currentUser?.expires">
              <div text-sm text-neutral-400 mb-1>Cookie Expires</div>
              <div text-sm>
                {{ new Date(currentUser.expires).toLocaleString() }}
              </div>
            </div>
          </div>
        </div>

        <!-- Update Name -->
        <div bg-neutral-800 border-1 border-neutral-700 rounded-lg p-6>
          <div text-lg font-bold mb-4>Change Name</div>

          <div flex gap-3>
            <input
              v-model="newName"
              type="text"
              placeholder="Enter new name"
              bg-neutral-900 border-1 border-neutral-700 rounded px-4 py-3 flex-1
              focus:outline-none focus:border-neutral-500
            >
            <button
              bg-orange-600 hover:bg-orange-500 px-6 py-3 rounded
              :disabled="loading || !newName.trim() || newName === currentUser?.name"
              @click="updateName"
            >
              Update
            </button>
          </div>
        </div>

        <!-- Auto Signin -->
        <div bg-neutral-800 border-1 border-neutral-700 rounded-lg p-6>
          <div text-lg font-bold mb-4>Auto Signin</div>

          <label flex items-center justify-between cursor-pointer>
            <div>
              <div text-sm font-medium>Enable Auto Signin</div>
              <div text-xs text-neutral-500 mt-1>
                Automatically sign in when others scan QR codes
              </div>
            </div>
            <input
              v-model="isAuto"
              type="checkbox"
              @change="updateAutoSignin"
            >
          </label>
        </div>

        <!-- Update Cookie -->
        <div bg-neutral-800 border-1 border-neutral-700 rounded-lg p-6>
          <div text-lg font-bold mb-4>Update Cookie</div>

          <textarea
            v-model="newCookie"
            placeholder="Paste new cookie here"
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
            Update Cookie
          </button>
        </div>

        <!-- Delete Account -->
        <div bg-neutral-800 border-1 border-red-900 border-opacity-50 rounded-lg p-6>
          <div text-lg font-bold mb-2 text-red-400>Danger Zone</div>
          <div text-sm text-neutral-400 mb-4>
            Once you delete your account, there is no going back. Please be certain.
          </div>

          <button
            bg-red-900 hover:bg-red-800 text-red-200 px-6 py-3 rounded
            @click="showDeleteConfirm = true"
          >
            <div i-carbon-trash-can inline-block mr-2 />
            Delete Account
          </button>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div
        v-if="showDeleteConfirm"
        fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-6
      >
        <div bg-neutral-800 border-1 border-neutral-700 rounded-lg p-6 max-w-md w-full>
          <div text-xl font-bold mb-4>Confirm Delete</div>

          <div text-sm text-neutral-300 mb-6>
            Are you sure you want to delete your account? This action cannot be undone.
          </div>

          <div flex gap-3>
            <button
              flex-1 bg-neutral-700 hover:bg-neutral-600 px-4 py-3 rounded
              @click="showDeleteConfirm = false"
            >
              Cancel
            </button>
            <button
              flex-1 bg-red-900 hover:bg-red-800 text-red-200 px-4 py-3 rounded
              :disabled="loading"
              @click="deleteAccount"
            >
              {{ loading ? 'Deleting...' : 'Delete' }}
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
