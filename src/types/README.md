# Types Documentation

This folder contains TypeScript type definitions for the application.

## Data Models

### User

Represents a user in the system.

```typescript
interface User {
  id: string          // Randomly generated, unique
  name: string        // Username
  is_auto: boolean    // Whether to participate in automatic sign-in
}
```

### Cookie

Represents a cookie associated with a user.

```typescript
interface Cookie {
  id: string          // Randomly generated, unique
  user_id: string     // Associated user id
  value: string       // Cookie content
  expires: string     // Expiration time
  created_at: string  // Upload time of this cookie
}
```

### UserWithCookie

Extended user information including the latest cookie.

```typescript
interface UserWithCookie extends User {
  latest_cookie: string  // Latest cookie value
  expires: string        // Cookie expiration time
}
```

### ScanHistory

Records of QR code scans.

```typescript
interface ScanHistory {
  id: string          // Randomly generated, unique
  result: string      // Scan result
  user_id: string     // Scanner's user id
  created_at: string  // Scan time
}
```

### SigninHistory

Records of sign-in attempts.

```typescript
interface SigninHistory {
  id: string              // Randomly generated, unique
  user_id: string         // User id for whom to sign in
  cookie: string          // Cookie carried during sign-in
  scan_history_id: string // Which scan result was used
  request_data: string    // Data carried in sign-in request
  response_code: number   // Response status code
  response_data: string   // Response body
  created_at: string      // Sign-in time
}
```

## API Response Types

### SigninResponse

Response from the sign-in endpoint.

```typescript
interface SigninResponse {
  scan_result: ScanHistory
  signin_results: SigninHistory[]
}
```

### UserAddResponse

Response from adding a new user.

```typescript
interface UserAddResponse {
  id: string
}
```

## Usage

Import types as needed:

```typescript
import type { User, UserWithCookie, ScanHistory, SigninHistory } from '~/types'
```
