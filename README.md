# Tronclass Signin App

A web application for batch QR code signin with automatic signin support.

## Features

- 🔐 Multi-user support with cookie management
- 📱 QR code scanning using device camera
- ⚡ Automatic batch signin for all enabled users
- 📊 Scan and signin history tracking
- ⚙️ User settings management
- 🌙 Dark theme UI

## User Guide

### First Time Setup

1. **Enter API Endpoint**
   - When you first open the app, enter your backend API endpoint URL
   - Example: `https://api.example.com`
   - This will be saved in your browser's localStorage

2. **Select or Create User**
   - Choose your account from the list of existing users
   - Or create a new user by clicking "Create New User"

3. **Create New User**
   - Enter your name
   - Enable/disable auto signin (default: enabled)
   - Paste your cookie from browser developer tools
   - Click "Create User"

### Main Features

#### Scan QR Code
- Click the "Scan QR Code" button on the main page
- Allow camera access when prompted
- Point your camera at the QR code
- The app will automatically:
  - Upload the scan result to the backend
  - Trigger signin for all users with auto signin enabled
  - Display the results

#### View History
- **Recent Scans**: See the last 3 scans on the main page
- **Last Signin**: See when you were last signed in
- **Full History**: Click "View All" to see complete scan and signin history

#### Settings
- **Change Name**: Update your display name
- **Auto Signin**: Toggle automatic signin on/off
- **Update Cookie**: Refresh your cookie when it expires
- **Delete Account**: Remove your account (cannot be undone)

### How to Get Your Cookie

1. Open your browser's developer tools (F12)
2. Go to the Application/Storage tab
3. Find Cookies in the left sidebar
4. Select your target website
5. Copy the cookie value you need
6. Paste it into the app

## Technical Stack

- **Frontend Framework**: Vue 3 + TypeScript
- **Build Tool**: Vite
- **Routing**: Vue Router
- **State Management**: Pinia (with localStorage persistence)
- **Styling**: UnoCSS
- **QR Scanner**: qr-scanner library

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
src/
├── api/           # API client functions
├── components/    # Reusable Vue components
├── composables/   # Vue composables (QR scanner, etc.)
├── layouts/       # Page layouts
├── pages/         # Application pages
│   ├── index.vue       # Main page (scan & dashboard)
│   ├── create-user.vue # User creation page
│   ├── settings.vue    # User settings page
│   └── history.vue     # History page
├── stores/        # Pinia stores
├── styles/        # Global styles
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

## API Endpoints

The app expects the following backend API endpoints:

- `GET /user/list` - List all users
- `POST /user/add` - Create new user
- `POST /user/remove/<id>` - Delete user
- `POST /user/rename/<id>` - Rename user
- `POST /user/refresh/<id>` - Update user cookie
- `POST /user/auto/<id>` - Update auto signin setting
- `POST /signin` - Submit scan result and trigger signin
- `GET /history/scan` - Get scan history
- `GET /history/signin` - Get signin history

## License

MIT
