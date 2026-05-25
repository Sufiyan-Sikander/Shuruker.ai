# Deployment Guide

This guide explains how to deploy your ShurukerAI application to Hugging Face (backend) and Vercel (frontend).

## Prerequisites

- Hugging Face account with Docker support enabled
- Vercel account
- Git repository (GitHub, GitLab, or Gitbucket)
- All environment variables configured (see `.env.example`)

---

## Part 1: Backend Deployment (Hugging Face with Docker)

### Step 1: Prepare Your Backend

1. **Set up environment variables**
   - Create a `.env` file in the root directory with all required variables
   - Copy from `.env.example` and fill in your actual values:
     - `SECRET_KEY`: Generate a secure random key
     - `FRONTEND_URL`: Your Vercel frontend URL (e.g., `https://shurukerai.vercel.app`)
     - `FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket
     - `PINECONE_API_KEY`: Your Pinecone API key
     - `GOOGLE_API_KEY`: Your Google Generative AI key

2. **Verify Dockerfile**
   - A `Dockerfile` has been created in the root directory
   - It uses Python 3.10 and installs all dependencies from `requirements.txt`
   - Port is set to 7860 (Hugging Face default)

### Step 2: Push to Git Repository

```bash
# Make sure you're in the project root
cd d:\Coding\ShurukerAi-main

# Add all new deployment files
git add Dockerfile .env.example vercel.json react-frontend/.env.local .gitignore

# Commit changes
git commit -m "Add deployment configuration files for Hugging Face and Vercel"

# Push to your repository
git push origin main
```

### Step 3: Deploy to Hugging Face

1. Go to https://huggingface.co/new-space
2. Fill in the form:
   - **Space name**: shurukerai-backend (or your preferred name)
   - **License**: Select appropriate license
   - **Space SDK**: Docker
3. Click **Create space**
4. In the space settings:
   - Go to **Settings** → **Repository** → **Docker**
   - Follow Hugging Face's Docker deployment guide
5. **Alternative (Recommended)**: Use Hugging Face CLI
   ```bash
   huggingface-cli login
   huggingface-cli repo create shurukerai-backend --type space --space-sdk docker
   git clone https://huggingface.co/spaces/YOUR_USERNAME/shurukerai-backend
   cd shurukerai-backend
   # Copy your app files here, push with git
   ```

6. **Set environment variables** in Hugging Face space settings:
   - SECRET_KEY
   - FRONTEND_URL
   - FIREBASE_STORAGE_BUCKET
   - FIREBASE_STORAGE_BUCKET
   - PINECONE_API_KEY
   - PINECONE_INDEX_NAME
   - GOOGLE_API_KEY

7. Space will automatically build and deploy once you push

### Step 4: Get Your Backend URL

Once deployed, your backend URL will be:
```
https://YOUR_USERNAME-shurukerai-backend.hf.space
```

Save this for the frontend configuration.

---

## Part 2: Frontend Deployment (Vercel)

### Step 1: Connect to Vercel

1. Go to https://vercel.com/dashboard
2. Click **Add New...** → **Project**
3. Select your Git repository
4. Under **Root Directory**, select `react-frontend`
5. Click **Deploy**

### Step 2: Set Environment Variables

In Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add the following variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://YOUR_USERNAME-shurukerai-backend.hf.space`
   - **Environments**: Production, Preview, Development
3. Click **Save**

### Step 3: Redeploy

After setting environment variables:
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **Redeploy**

---

## Part 3: Connect Backend and Frontend

### Backend Configuration

Ensure your `web.py` has:
```python
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
```

Set `FRONTEND_URL` environment variable on Hugging Face to your Vercel domain:
```
https://shurukerai.vercel.app
```

### Frontend Configuration

The `vite.config.js` and `.env.local` are already configured to use `VITE_API_URL`.

---

## Local Development

### Backend
```bash
# Activate virtual environment
./myenv/Scripts/Activate.ps1

# Create .env file for local development
# FRONTEND_URL should be http://localhost:5173
# PORT should be 5000

# Run the backend
python web.py
# Server will run on http://localhost:5000
```

### Frontend
```bash
cd react-frontend

# Create .env.local for local development
# VITE_API_URL should be http://127.0.0.1:5000

# Install dependencies
npm install

# Run development server
npm run dev
# App will run on http://localhost:5173
```

---

## Troubleshooting

### Backend won't build on Hugging Face
- Check Docker logs in Hugging Face space settings
- Ensure all dependencies in `requirements.txt` are compatible with Python 3.10
- Verify environment variables are set correctly

### Frontend shows API errors
- Check if `VITE_API_URL` is correctly set in Vercel environment variables
- Verify the backend URL is accessible
- Check browser console for CORS or network errors
- Ensure `FRONTEND_URL` is set in backend environment variables

### Firebase authentication not working
- Verify `firebase-key.json` is uploaded to backend (NOT committed to git)
- Check Firebase project settings match your backend configuration
- Ensure Firebase credentials are valid and not expired

### Port conflicts
- Backend uses PORT environment variable (default 7860 on Hugging Face, 5000 locally)
- Frontend uses Vite default port (5173 locally)

---

## Production Checklist

- [ ] All environment variables configured on both platforms
- [ ] `firebase-key.json` uploaded to Hugging Face (via SFTP or manually)
- [ ] Backend URL accessible from Vercel
- [ ] `FRONTEND_URL` set correctly on backend
- [ ] `VITE_API_URL` set correctly on Vercel
- [ ] HTTPS enforced on both
- [ ] Debug mode disabled in production (`FLASK_ENV=production`)
- [ ] All sensitive files in `.gitignore`
- [ ] Tested login flow end-to-end

---

## Need Help?

- Hugging Face Docs: https://huggingface.co/docs/hub/spaces-overview
- Vercel Docs: https://vercel.com/docs
- Firebase Docs: https://firebase.google.com/docs
