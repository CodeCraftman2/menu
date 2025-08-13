// Simple local helper server to run the Python uploader after receiving JSON files
// Usage:
//   1) npm run dev:admin-uploader
//   2) In Admin page, choose "Use Python (local)" mode and upload files
//
// Notes:
// - This is for local development only. Do NOT deploy this server publicly.
// - Requires Node deps: express, multer, cross-spawn (or child_process). We use child_process here.
// - The Python script reads JSON files from the project root. We save uploaded files there.

const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const app = express()
const PORT = process.env.ADMIN_UPLOADER_PORT || 5050

// Basic CORS for local dev
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// Ensure uploads land in project root with original names expected by menu_uploader.py
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname, '..'))
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
const upload = multer({ storage })

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// Accept JSON files and then run menu_uploader.py
app.post('/run-upload', upload.array('files'), async (req, res) => {
  try {
    // Collect env for the Python process (pass-through selected vars)
    const env = { ...process.env }
    // Allow client to provide SUPABASE_* overrides if needed
    const { 
      SUPABASE_URL, 
      SUPABASE_SERVICE_KEY, 
      SUPABASE_KEY, 
      SUPABASE_ADMIN_EMAIL, 
      SUPABASE_ADMIN_PASSWORD,
      SUPABASE_AUTH_TOKEN  // Add token support for already authenticated admins
    } = req.body || {}
    
    if (SUPABASE_URL) env.SUPABASE_URL = SUPABASE_URL
    if (SUPABASE_SERVICE_KEY) env.SUPABASE_SERVICE_KEY = SUPABASE_SERVICE_KEY
    if (SUPABASE_KEY) env.SUPABASE_KEY = SUPABASE_KEY
    if (SUPABASE_ADMIN_EMAIL) env.SUPABASE_ADMIN_EMAIL = SUPABASE_ADMIN_EMAIL
    if (SUPABASE_ADMIN_PASSWORD) env.SUPABASE_ADMIN_PASSWORD = SUPABASE_ADMIN_PASSWORD
    if (SUPABASE_AUTH_TOKEN) env.SUPABASE_AUTH_TOKEN = SUPABASE_AUTH_TOKEN  // Pass through auth token

    const cwd = path.resolve(__dirname, '..')

    // Verify files exist (optional logging)
    const saved = (req.files || []).map(f => path.basename(f.path))

    // Spawn Python script
    const py = spawn(process.platform === 'win32' ? 'python' : 'python3', ['menu_uploader.py'], { cwd, env })

    let logs = ''
    py.stdout.on('data', d => { logs += d.toString() })
    py.stderr.on('data', d => { logs += d.toString() })

    py.on('close', (code) => {
      res.status(200).json({ status: 'done', code, saved, logs })
    })
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) })
  }
})

app.listen(PORT, () => {
  console.log(`Admin Python uploader helper listening on http://localhost:${PORT}`)
})
