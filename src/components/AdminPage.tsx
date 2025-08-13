import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

interface AdminPageProps {
  user: any
  onLogout: () => void
}

// Helper to infer season and hostels from filename format: S-BH 1-12.json etc.
function deriveFromFilename(name: string) {
  const season = name.startsWith('S-') ? 'summer' : 'winter'
  const isBH = name.includes('BH')
  const hostelPrefix = isBH ? 'BH' : 'LH'
  const hostelCount = isBH ? 12 : 4
  const hostels = Array.from({ length: hostelCount }, (_, i) => `${hostelPrefix}${i + 1}`)
  return { season, hostels }
}

const AdminPage: React.FC<AdminPageProps> = ({ user, onLogout }) => {
  const [logs, setLogs] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [usePythonLocal, setUsePythonLocal] = useState<boolean>(window.location.hostname === 'localhost')
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState<boolean>(false)
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null)

  const log = (m: string) => setLogs(prev => [...prev, m])

  // Verify admin status on load
  useEffect(() => {
    const verifyAdminStatus = async () => {
      try {
        // Check if user is in admins table
        const { data, error } = await supabase
          .from('admins')
          .select('id, email, name')
          .eq('id', user.id)
          .single()
        
        if (error) {
          console.error('Admin verification error:', error)
          setAdminCheckError(`Admin verification failed: ${error.message}`)
          setIsVerifiedAdmin(false)
          return
        }
        
        if (data) {
          setIsVerifiedAdmin(true)
          log(`✅ Verified admin access for: ${data.email || user.email}`)
        } else {
          setAdminCheckError('User not found in admins table')
          setIsVerifiedAdmin(false)
        }
      } catch (e: any) {
        console.error('Admin verification exception:', e)
        setAdminCheckError(`Error: ${e.message || String(e)}`)
        setIsVerifiedAdmin(false)
      }
    }
    
    verifyAdminStatus()
  }, [user.id, user.email])

  const postFilesToLocalPython = async (files: FileList) => {
    const form = new FormData()
    Array.from(files).forEach(f => form.append('files', f))

    try {
      const resp = await fetch('http://localhost:5050/run-upload', {
        method: 'POST',
        body: form
      })
      if (!resp.ok) {
        const text = await resp.text()
        log(`❌ Local Python server error (${resp.status}): ${text}`)
        return
      }
      const result = await resp.json()
      log(`📦 Saved files: ${Array.isArray(result.saved) ? result.saved.join(', ') : 'unknown'}`)
      log(`🐍 Python exit code: ${result.code}`)
      if (result.logs) {
        log(result.logs)
      }
    } catch (e: any) {
      log(`❌ Failed calling local Python server: ${e.message || e}`)
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setBusy(true)
    setLogs([])

    try {
      if (usePythonLocal) {
        log('⚙️ Using local Python uploader...')
        await postFilesToLocalPython(files)
      } else {
        for (const file of Array.from(files)) {
          const text = await file.text()
          const json = JSON.parse(text)
          const { season, hostels } = deriveFromFilename(file.name)

          log(`Processing ${file.name} => season=${season}, hostels=${hostels.length}`)

          // Resolve current authenticated user id to set created_by
          const { data: authData } = await supabase.auth.getUser()
          const createdBy = authData?.user?.id

          for (const hostel of hostels) {
            // Compute structured hostel fields
            const hostel_code = hostel.startsWith('BH') ? 'BH' : 'LH'
            const hostel_number = parseInt(hostel.replace(/[^0-9]/g, '')) || 0

            // Delete existing for hostel+season (prefer code+number; also clear legacy 'hostel' rows)
            let { error: delErr } = await supabase
              .from('weekly_menus')
              .delete()
              .match({ hostel_code, hostel_number, season })

            if (delErr) {
              log(`⚠️ Delete by code/number failed for ${hostel} (${season}): ${delErr.message} — trying legacy key`)
              const legacy = await supabase
                .from('weekly_menus')
                .delete()
                .match({ hostel, season })
              delErr = legacy.error || undefined
            }

            if (delErr) {
              log(`⚠️ Delete failed for ${hostel} (${season}): ${delErr.message}`)
            } else {
              log(`🗑️ Cleared existing for ${hostel} (${season})`)
            }

            // Insert each week
            if (!Array.isArray(json.weeks)) {
              log(`❌ Invalid JSON format in ${file.name}: missing weeks[]`)
              continue
            }

            for (const wk of json.weeks) {
              const payload = {
                hostel,
                hostel_code,
                hostel_number,
                season,
                week: wk.week,
                days_data: wk.days,
                campus: hostel_code === 'BH' ? 'boys' : 'girls',
                created_by: createdBy || null
              }
              const { error: insErr } = await supabase
                .from('weekly_menus')
                .insert(payload)

              if (insErr) {
                log(`✗ Failed ${hostel} wk ${wk.week}: ${insErr.message}`)
              } else {
                log(`✓ Uploaded ${hostel} (${season}) week ${wk.week}`)
              }
            }
          }
        }
      }

      log('✅ Done!')
    } catch (e: any) {
      log(`❌ Error: ${e.message || e}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen p-6 md:p-10 text-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <button
            className="px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-600"
            onClick={onLogout}
          >Sign out</button>
        </div>

        {!isVerifiedAdmin && adminCheckError && (
          <div className="glass-card rounded-2xl p-6 mb-6 border border-red-500/50 bg-red-900/20">
            <h2 className="text-lg font-semibold text-red-400 mb-2">Admin Verification Failed</h2>
            <p className="text-white/90 mb-4">{adminCheckError}</p>
            <p className="text-white/70 text-sm">
              Make sure your account (id: {user.id}) is registered in the admins table. 
              Run this SQL in Supabase SQL Editor:
            </p>
            <pre className="bg-black/30 p-3 rounded-lg mt-2 text-xs overflow-auto">
              {`INSERT INTO admins (id, email, name) VALUES ('${user.id}', '${user.email}', '${user.name || 'Admin User'}');`}
            </pre>
          </div>
        )}

        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/80">Upload menu JSON files (e.g., "S-BH 1-12.json", "W-LH 1-4.json"). You must be an admin to modify menus.</p>
            <div className="bg-white/10 rounded-xl p-1 inline-flex ml-4">
              <button
                className={`px-3 py-1 rounded-xl text-sm ${!usePythonLocal ? 'bg-primary-500 text-white' : 'text-white/80'}`}
                onClick={() => setUsePythonLocal(false)}
                disabled={busy}
              >Browser upload</button>
              <button
                className={`px-3 py-1 rounded-xl text-sm ${usePythonLocal ? 'bg-primary-500 text-white' : 'text-white/80'}`}
                onClick={() => setUsePythonLocal(true)}
                disabled={busy}
                title="Requires local helper server: npm run dev:admin-uploader"
              >Python (local)</button>
            </div>
          </div>
          <input type="file" multiple accept=".json" onChange={e => handleFiles(e.target.files)} disabled={busy} />
          {busy && <p className="mt-3 text-white/70">{usePythonLocal ? 'Running Python script...' : 'Uploading...'}</p>}
          {usePythonLocal && (
            <p className="mt-2 text-white/60 text-sm">Hint: Make sure the helper server is running at http://localhost:5050. Start it with: npm run dev:admin-uploader</p>
          )}
        </div>

        <div className="glass-card rounded-2xl p-4">
          <h2 className="font-semibold mb-2">Logs</h2>
          <div className="h-64 overflow-auto text-sm whitespace-pre-wrap bg-black/20 rounded-xl p-3">
            {logs.length === 0 ? <p className="text-white/50">No logs yet</p> : logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>

        <div className="text-white/60 text-sm mt-6">
          <p>Tip: For bulk/automated uploads, use the Python script with SUPABASE_SERVICE_KEY. RLS allows only admins to write.</p>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
