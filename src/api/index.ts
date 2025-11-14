import type {
  User,
  UserWithCookie,
  ScanHistory,
  SigninHistory,
  SigninResponse,
  UserAddResponse,
} from '~/types/index'
import { useUserStore } from '~/stores/user'

/**
 * Get the current API endpoint URL from pinia store
 */
function getApiEndpoint(): string {
  const userStore = useUserStore()
  return userStore.apiEndpoint.replace(/\/$/, '') // Remove trailing slash
}

/**
 * Get browser information using User-Agent Client Hints or fallback to traditional UA
 */
async function getBrowserInfo(): Promise<string> {
  try {
    // Check if UA-CH (User-Agent Client Hints) is supported
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      const info = await navigator.userAgentData.getHighEntropyValues([
        'model',
        'platform',
        'platformVersion',
        'architecture',
        'bitness',
        'uaFullVersion',
      ]) as any // TODO: add type

      // Build a readable string
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
      // Fallback: use traditional UA string
      return `User-Agent: ${navigator.userAgent}`
    }
  }
  catch (err) {
    console.error('Failed to get UA info:', err)
    return `User-Agent: ${navigator.userAgent}`
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${getApiEndpoint()}${endpoint}`
  console.log(`fetching ${url} with options:`, options)
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }
  catch (error) {
    console.error(`API request failed: ${endpoint}`, error)
    throw error
  }
}

/**
 * List all users that need to be signed in
 * GET /user/list
 */
export async function getUserList(): Promise<UserWithCookie[]> {
  return fetchAPI<UserWithCookie[]>('/user/list')
}

/**
 * Add a new user
 * POST /user/add
 */
export async function addUser(name: string): Promise<UserAddResponse> {
  const ua_info = await getBrowserInfo()

  return fetchAPI<UserAddResponse>('/user/add', {
    method: 'POST',
    body: JSON.stringify({ ua_info, name }),
  })
}

/**
 * Remove a user
 * POST /user/remove/<id>
 */
export async function removeUser(id: string): Promise<void> {
  const ua_info = await getBrowserInfo()

  return fetchAPI<void>(`/user/remove/${id}`, {
    method: 'POST',
    body: JSON.stringify({ ua_info }),
  })
}

/**
 * Rename a user
 * POST /user/rename/<id>
 */
export async function renameUser(id: string, new_name: string): Promise<void> {
  const ua_info = await getBrowserInfo()

  return fetchAPI<void>(`/user/rename/${id}`, {
    method: 'POST',
    body: JSON.stringify({ ua_info, new_name }),
  })
}

/**
 * Refresh user's cookie
 * POST /user/refresh/<id>
 */
export async function refreshUserCookie(id: string, cookie: string): Promise<void> {
  const ua_info = await getBrowserInfo()

  return fetchAPI<void>(`/user/refresh/${id}`, {
    method: 'POST',
    body: JSON.stringify({ ua_info, cookie }),
  })
}

/**
 * Update user's is_auto value
 * POST /user/auto/<id>
 */
export async function updateUserAuto(id: string, is_auto: boolean): Promise<void> {
  const ua_info = await getBrowserInfo()

  return fetchAPI<void>(`/user/auto/${id}`, {
    method: 'POST',
    body: JSON.stringify({ ua_info, is_auto }),
  })
}

/**
 * Scan QR code and sign in for all users
 * POST /signin
 */
export async function signin(scan_result: string, user_id: string): Promise<SigninResponse> {
  const ua_info = await getBrowserInfo()

  return fetchAPI<SigninResponse>('/signin', {
    method: 'POST',
    body: JSON.stringify({ ua_info, scan_result, user_id }),
  })
}

/**
 * Get sign-in history
 * GET /history/signin?count=<count>&user_id=<id>&index=<index>
 */
export async function getSigninHistory(
  count?: number,
  user_id?: string,
  index?: number,
): Promise<SigninHistory[]> {
  const params = new URLSearchParams()
  if (count !== undefined)
    params.append('count', count.toString())
  if (user_id)
    params.append('user_id', user_id)
  if (index !== undefined)
    params.append('index', index.toString())

  const query = params.toString() ? `?${params.toString()}` : ''
  return fetchAPI<SigninHistory[]>(`/history/signin${query}`)
}

/**
 * Get scan history
 * GET /history/scan?count=<count>&user_id=<id>&index=<index>
 */
export async function getScanHistory(
  count?: number,
  user_id?: string,
  index?: number,
): Promise<ScanHistory[]> {
  const params = new URLSearchParams()
  if (count !== undefined)
    params.append('count', count.toString())
  if (user_id)
    params.append('user_id', user_id)
  if (index !== undefined)
    params.append('index', index.toString())

  const query = params.toString() ? `?${params.toString()}` : ''
  return fetchAPI<ScanHistory[]>(`/history/scan${query}`)
}
