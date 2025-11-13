# API Documentation

This folder contains the API wrapper for communicating with the backend server.

## Setup

Before using any API functions, you must set the API endpoint URL:

```typescript
import { setApiEndpoint } from '~/api'

setApiEndpoint('http://localhost:8000')
```

## Available Functions

### User Management

- `getUserList()`: Get all users with their latest cookie info
- `addUser(name: string)`: Add a new user
- `removeUser(id: string)`: Remove a user
- `renameUser(id: string, new_name: string)`: Rename a user
- `refreshUserCookie(id: string, cookie: string)`: Update user's cookie
- `updateUserAuto(id: string, is_auto: boolean)`: Update user's auto sign-in setting

### Sign-in

- `signin(scan_result: string)`: Submit scan result and trigger auto sign-in for all users

### History

- `getSigninHistory(count?: number, user_id?: string)`: Get sign-in history
- `getScanHistory(count?: number, user_id?: string)`: Get scan history

## Example Usage

```typescript
import { addUser, refreshUserCookie, signin } from '~/api'

// Add a new user
const { id } = await addUser('John Doe')

// Update user's cookie
await refreshUserCookie(id, 'your-cookie-value')

// Perform sign-in
const result = await signin('qr-code-scan-result')
console.log(result.scan_result)
console.log(result.signin_results)
```

## Browser Info

All POST requests automatically include browser information (User-Agent Client Hints or traditional UA string) in the `ua_info` field.
