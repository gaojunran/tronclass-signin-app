// User data type
export interface User {
  id: string // Randomly generated, unique
  name: string // Username
  is_auto: boolean // Whether to participate in automatic sign-in, default true
  // Optional unified identity (统一身份认证) fields
  identity_account?: string
  identity_password?: string
}

// Cookie data type
export interface Cookie {
  id: string // Randomly generated, unique
  user_id: string // Associated user id
  value: string // Cookie content
  expires: string // Expiration time
  created_at: string // Upload time of this cookie
}

// UserWithCookie extends User with latest cookie info
export interface UserWithCookie extends User {
  latest_cookie: string // Latest cookie value
  expires: string // Cookie expiration time
  // Keep identity fields available on list responses as well
  identity_account?: string
  identity_password?: string
}

// Scan history data type
export interface ScanHistory {
  id: string // Randomly generated, unique
  result: string // Scan result
  user_id: string // Scanner's user id
  created_at: string // Scan time
}

// Sign-in history data type
export interface SigninHistory {
  id: string // Randomly generated, unique
  user_id: string // User id for whom to sign in
  cookie: string // Cookie carried during sign-in
  scan_history_id: string | null // Which scan result was used (null for digital signin)
  request_data: any // Data carried in sign-in request
  response_code: number | null // Response status code
  response_data: any // Response body
  created_at: string // Sign-in time
}

// Rollcall task data type
export interface RollcallTask {
  rollcall_id: string // Task ID
  status: string // Task status (e.g., "absent")
  is_number: boolean // Is number signin
  is_radar: boolean // Is radar signin
  [key: string]: any // Other task properties
}

// API response types
export interface SigninResponse {
  scan_result: ScanHistory
  signin_results: SigninHistory[]
}

export interface DigitalSigninResponse {
  tasks: RollcallTask[]
  signin_results: SigninHistory[]
}

export interface UserAddResponse {
  id: string
}

// Todo item data type
export interface TodoItem {
  id: number
  type: string // e.g., "homework"
  title: string
  course_id: number
  course_code: string
  course_name: string
  course_type: number
  end_time: string
  is_locked: boolean
  is_student: boolean
  prerequisites: any[]
}

// Todo list response
export interface TodoListResponse {
  todo_list: TodoItem[]
}
