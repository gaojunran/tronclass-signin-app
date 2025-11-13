import { acceptHMRUpdate, defineStore } from 'pinia'

export const useUserStore = defineStore('user', () => {
  // Current user's ID
  const userId = ref<string>('')

  // API endpoint URL
  const apiEndpoint = ref<string>('')

  // User name
  const userName = ref<string>('')

  // Set user ID
  function setUserId(id: string) {
    userId.value = id
  }

  // Set API endpoint
  function setApiEndpoint(url: string) {
    apiEndpoint.value = url
  }

  // Set user name
  function setUserName(name: string) {
    userName.value = name
  }

  // Clear user data
  function clearUser() {
    userId.value = ''
    userName.value = ''
  }

  // Clear API endpoint
  function clearApiEndpoint() {
    apiEndpoint.value = ''
  }

  // Clear all data
  function clearAll() {
    userId.value = ''
    userName.value = ''
    apiEndpoint.value = ''
  }

  return {
    userId,
    apiEndpoint,
    userName,
    setUserId,
    setApiEndpoint,
    setUserName,
    clearUser,
    clearApiEndpoint,
    clearAll,
  }
}, {
  persist: true, // Persist to localStorage
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
