# Art Reference Timer

A web app for timed gesture drawing and art reference practice sessions, with direct integration to your Google Photos albums.

## Features

- 🎨 **Timed Drawing Sessions** - Configurable durations for each reference image
- 📸 **Google Photos Integration** - Pull images directly from your reference albums
- ⏱️ **Progressive Timing** - Start fast (30s) and gradually increase (1min, 2min, 5min, 10min)
- 🎯 **Smart Album Filtering** - Automatically shows only albums with "reference" in the name
- 🔀 **Shuffle Mode** - Randomize image order for varied practice
- ⏸️ **Session Controls** - Pause, skip, and navigate through your session
- 🔔 **Audio Alerts** - Optional sound notification when time is up
- 📊 **Progress Tracking** - Visual progress bar and image counter

## Setup Instructions

### 1. Get Google Photos API Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project**
   - Click "Select a project" → "New Project"
   - Name it: "Art Reference Timer"
   - Click "Create"

3. **Enable Google Photos Library API**
   - Search for "Google Photos Library API" in the search bar
   - Click on it and press "ENABLE"

4. **Configure OAuth Consent Screen**
   - Go to "OAuth consent screen" in the left menu
   - Choose "External" user type
   - Fill in:
     - App name: "Art Reference Timer"
     - User support email: (your email)
     - Developer contact: (your email)
   - Click "Save and Continue" through all steps

5. **Create OAuth 2.0 Client ID**
   - Go to "Credentials" in the left menu
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: **"Web application"**
   - Name: "Art Reference Timer"
   - Authorized JavaScript origins:
     - For local testing: `http://localhost:3000`
     - For GitHub Pages: `https://YOUR_USERNAME.github.io`
   - Click "CREATE"
   - **Copy your Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)

### 2. Update the Code

Open `art-reference-timer.jsx` and replace this line (around line 35):

```javascript
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com';
```

With your actual Client ID:

```javascript
const CLIENT_ID = '123456789-abc123.apps.googleusercontent.com';
```

**Important:** It's SAFE to commit your Client ID to GitHub - it's designed to be public. The OAuth flow keeps everything secure.

### 3. Deploy to GitHub Pages

#### Option A: Using Create React App

1. **Initialize your project:**
```bash
npx create-react-app art-reference-timer
cd art-reference-timer
```

2. **Replace the default `src/App.js` with your `art-reference-timer.jsx` file**

3. **Install GitHub Pages package:**
```bash
npm install --save-dev gh-pages
```

4. **Update `package.json`:**
```json
{
  "homepage": "https://YOUR_USERNAME.github.io/art-reference-timer",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

5. **Deploy:**
```bash
npm run deploy
```

#### Option B: Using Vite (Faster)

1. **Create Vite project:**
```bash
npm create vite@latest art-reference-timer -- --template react
cd art-reference-timer
npm install
```

2. **Replace `src/App.jsx` with your code**

3. **Install GitHub Pages:**
```bash
npm install --save-dev gh-pages
```

4. **Update `vite.config.js`:**
```javascript
export default {
  base: '/art-reference-timer/'
}
```

5. **Update `package.json`:**
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

6. **Deploy:**
```bash
npm run deploy
```

### 4. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" → "Pages"
3. Source: "Deploy from a branch"
4. Branch: "gh-pages" → "/(root)"
5. Click "Save"

Your app will be live at: `https://YOUR_USERNAME.github.io/art-reference-timer`

### 5. Update Google Cloud Authorized Origins

Go back to Google Cloud Console → Credentials → Edit your OAuth Client:
- Add your GitHub Pages URL: `https://YOUR_USERNAME.github.io`
- Save changes

## Using the App

1. **Sign in with Google** - Click "Connect Google Photos" and authorize the app
2. **Select Albums** - Check the boxes for albums you want to use (only shows albums with "reference" in the name)
3. **Configure Session:**
   - Number of images
   - Fixed duration or progressive timing
   - Shuffle, sound, and auto-advance options
4. **Start Drawing!** - Click "Start Drawing Session"

### Progressive Timing Example

With 20 images and progressive timing:
- Images 1-4: 30 seconds each (quick gestures)
- Images 5-8: 1 minute each
- Images 9-12: 2 minutes each
- Images 13-16: 5 minutes each
- Images 17-20: 10 minutes each (detailed studies)

## Album Naming Convention

The app automatically filters for albums containing the word "reference" (case-insensitive).

Example album names that will appear:
- ✅ "Reference Images - Woman with Blade"
- ✅ "Architecture Reference"
- ✅ "Hand REFERENCE Photos"
- ❌ "Vacation 2024" (won't appear)
- ❌ "Family Photos" (won't appear)

## Troubleshooting

### "Failed to load albums"
- Make sure you clicked "Allow" when prompted to access Google Photos
- Check that the Google Photos Library API is enabled in your Cloud Console
- Verify your Client ID is correct

### "Redirect URI mismatch"
- Ensure your deployed URL matches exactly what's in Google Cloud Console authorized origins
- No trailing slashes - use `https://username.github.io` not `https://username.github.io/`

### Images not loading
- Google Photos URLs expire after a while - the app fetches fresh URLs each session
- Make sure your albums actually contain images

## Security Notes

- **Client ID is public** - It's safe to commit to GitHub, designed to be public
- **OAuth tokens are temporary** - They expire and never touch your server
- **User must sign in** - The app requires Google authentication each time
- **Read-only access** - The app can only view photos, never modify or delete

## Local Development

```bash
npm install
npm start
```

For local testing, make sure `http://localhost:3000` is in your Google Cloud authorized origins.

## License

Free to use and modify for personal projects.

## Credits

Built with React and Google Photos Library API.
