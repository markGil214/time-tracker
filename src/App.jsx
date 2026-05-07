import { useEffect, useMemo, useState } from 'react'
import './App.css'

const START_DATE = new Date(2026, 1, 2)
const TARGET_HOURS = 486
const ENTRIES_COOKIE_KEY_BASE = 'ojt_entries'
const ENTRIES_STORAGE_KEY_BASE = 'ojt_entries'
const AUTH_API_BASE = import.meta.env.VITE_AUTH_API_BASE || '/api/auth'
const ENTRIES_API_BASE = import.meta.env.VITE_ENTRIES_API_BASE || '/api/entries'
const USE_LOCAL_AUTH_FALLBACK = import.meta.env.DEV
const FORCE_REMOTE_AUTH_IN_DEV = import.meta.env.VITE_FORCE_REMOTE_AUTH === 'true'
const ALLOW_LOCAL_AUTH_FALLBACK = USE_LOCAL_AUTH_FALLBACK && !FORCE_REMOTE_AUTH_IN_DEV
const SHOULD_USE_REMOTE_AUTH = !USE_LOCAL_AUTH_FALLBACK || FORCE_REMOTE_AUTH_IN_DEV
const LOCAL_AUTH_USERS_KEY = 'ojt_auth_users'
const LOCAL_AUTH_SESSION_KEY = 'ojt_auth_session'

const DEFAULT_FORM_DATA = {
  morningIn: '07:00',
  morningOut: '12:00',
  afternoonIn: '13:00',
  afternoonOut: '18:00',
  noOjtClass: false,
}

function toMinutes(timeValue) {
  const [hours, minutes] = timeValue.split(':').map(Number)
  return hours * 60 + minutes
}

function getSessionHours(startTime, endTime) {
  if (!startTime || !endTime) return 0

  const startMinutes = toMinutes(startTime)
  const endMinutes = toMinutes(endTime)
  const duration = endMinutes - startMinutes

  return duration > 0 ? duration / 60 : 0
}

function formatDuration(hours) {
  const totalMinutes = Math.round(Number(hours) * 60)
  const hourValue = Math.floor(totalMinutes / 60)
  const minuteValue = totalMinutes % 60

  const hourLabel = hourValue === 1 ? 'hour' : 'hours'
  const minuteLabel = minuteValue === 1 ? 'minute' : 'minutes'

  if (hourValue === 0) return `${minuteValue} ${minuteLabel}`
  if (minuteValue === 0) return `${hourValue} ${hourLabel}`

  return `${hourValue} ${hourLabel} and ${minuteValue} ${minuteLabel}`
}

function formatDisplayDate(dateObj) {
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateKey(dateObj) {
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateKeyString(dateValue) {
  if (!dateValue) return ''
  const parsed = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return dateValue
  return formatDateKey(parsed)
}

function getNextAvailableDate(entries) {
  const usedDateKeys = new Set(entries.map((entry) => entry.dateKey))
  let pointer = new Date(START_DATE)

  while (usedDateKeys.has(formatDateKey(pointer))) {
    pointer = nextAllowedDate(pointer)
  }

  return pointer
}

function nextAllowedDate(dateObj) {
  const nextDate = new Date(dateObj)

  do {
    nextDate.setDate(nextDate.getDate() + 1)
  } while ([0, 5, 6].includes(nextDate.getDay()))

  return nextDate
}

function getKeySafeUserPart(user) {
  if (!user) return 'guest'

  const source = user.id || user.username || 'guest'
  return String(source)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
}

function getEntriesCookieKey(user) {
  return `${ENTRIES_COOKIE_KEY_BASE}_${getKeySafeUserPart(user)}`
}

function getEntriesStorageKey(user) {
  return `${ENTRIES_STORAGE_KEY_BASE}_${getKeySafeUserPart(user)}`
}

function getEntriesFromCookie(cookieKey) {
  const rawCookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${cookieKey}=`))

  if (!rawCookie) return []

  try {
    const encodedValue = rawCookie.slice(`${cookieKey}=`.length)
    const parsed = JSON.parse(decodeURIComponent(encodedValue))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getEntriesFromStorage(storageKey) {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveEntriesToCookie(entries, cookieKey) {
  const expiration = new Date()
  expiration.setMonth(expiration.getMonth() + 1)

  document.cookie = `${cookieKey}=${encodeURIComponent(
    JSON.stringify(entries),
  )}; expires=${expiration.toUTCString()}; path=/; SameSite=Lax`
}

function saveEntriesToStorage(entries, storageKey) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(entries))
  } catch {
    // Ignore quota/storage errors; cookie persistence still acts as fallback.
  }
}

function getAuthErrorMessage(payload) {
  if (!payload) return 'Something went wrong.'

  if (payload.message) return payload.message

  if (payload.errors && typeof payload.errors === 'object') {
    return Object.values(payload.errors).flat().join(' ')
  }

  return 'Something went wrong.'
}

function getInitialEntries(user) {
  const scopedStorageKey = getEntriesStorageKey(user)
  const scopedCookieKey = getEntriesCookieKey(user)

  const storageEntries = getEntriesFromStorage(scopedStorageKey)
  if (storageEntries.length > 0) return storageEntries

  const cookieEntries = getEntriesFromCookie(scopedCookieKey)
  if (cookieEntries.length > 0) return cookieEntries

  const legacyStorageEntries = getEntriesFromStorage(ENTRIES_STORAGE_KEY_BASE)
  if (legacyStorageEntries.length > 0) return legacyStorageEntries

  return getEntriesFromCookie(ENTRIES_COOKIE_KEY_BASE)
}

function mapApiEntryToUiEntry(apiEntry) {
  const totalMinutes = Number(apiEntry.totalMinutes || 0)
  const workDate = apiEntry.workDate || ''
  const parsedDate = new Date(`${workDate}T00:00:00`)

  return {
    id: String(apiEntry.id),
    workDate,
    dateKey: formatDateKeyString(workDate),
    date: Number.isNaN(parsedDate.getTime()) ? workDate : formatDisplayDate(parsedDate),
    morningIn: apiEntry.morningIn || '',
    morningOut: apiEntry.morningOut || '',
    afternoonIn: apiEntry.afternoonIn || '',
    afternoonOut: apiEntry.afternoonOut || '',
    noOjtClass: Boolean(apiEntry.noOjtClass),
    totalHours: totalMinutes / 60,
    notes: apiEntry.notes || '',
  }
}

function mapUiEntryPayload(entry) {
  return {
    workDate: entry.workDate,
    morningIn: entry.morningIn,
    morningOut: entry.morningOut,
    afternoonIn: entry.afternoonIn,
    afternoonOut: entry.afternoonOut,
    noOjtClass: entry.noOjtClass,
    notes: entry.notes || '',
  }
}

function getLocalUsers() {
  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_USERS_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setLocalUsers(users) {
  window.localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(users))
}

function getLocalSessionUser() {
  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_SESSION_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    return parsed && parsed.username ? parsed : null
  } catch {
    return null
  }
}

function setLocalSessionUser(user) {
  window.localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify(user))
}

function clearLocalSessionUser() {
  window.localStorage.removeItem(LOCAL_AUTH_SESSION_KEY)
}

function localRegister(username, password) {
  const trimmedUsername = username.trim()
  const users = getLocalUsers()

  const exists = users.some((user) => user.username === trimmedUsername)
  if (exists) {
    return { ok: false, message: 'Username already exists' }
  }

  const newUser = {
    id: Date.now(),
    username: trimmedUsername,
    password,
  }

  setLocalUsers([...users, newUser])
  const sessionUser = { id: newUser.id, username: newUser.username }
  setLocalSessionUser(sessionUser)

  return { ok: true, user: sessionUser }
}

function localLogin(username, password) {
  const trimmedUsername = username.trim()
  const users = getLocalUsers()
  const user = users.find((candidate) => candidate.username === trimmedUsername)

  if (!user) {
    return { ok: false, message: 'Account not found. Please register first.' }
  }

  if (user.password !== password) {
    return { ok: false, message: 'Invalid username or password' }
  }

  const sessionUser = { id: user.id, username: user.username }
  setLocalSessionUser(sessionUser)

  return { ok: true, user: sessionUser }
}

function validateAuthFields(username, password) {
  const trimmedUsername = username.trim()

  if (trimmedUsername.length < 3) {
    return 'Username must be at least 3 characters.'
  }

  if (password.length < 6) {
    return 'Password must be at least 6 characters.'
  }

  return ''
}

function App() {
  const initialAuthUser = SHOULD_USE_REMOTE_AUTH ? null : getLocalSessionUser()

  const [authUser, setAuthUser] = useState(initialAuthUser)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({
    username: '',
    password: '',
  })
  const [authMessage, setAuthMessage] = useState('')
  const [authLoading, setAuthLoading] = useState(() => SHOULD_USE_REMOTE_AUTH)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [entries, setEntries] = useState(() =>
    initialAuthUser && !SHOULD_USE_REMOTE_AUTH ? getInitialEntries(initialAuthUser) : [],
  )
  const [entriesHydrated, setEntriesHydrated] = useState(
    () => Boolean(initialAuthUser) && !SHOULD_USE_REMOTE_AUTH,
  )
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA)
  const [editingEntryId, setEditingEntryId] = useState(null)
  const [editFormData, setEditFormData] = useState(DEFAULT_FORM_DATA)
  const [notesEntry, setNotesEntry] = useState(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const currentDate = useMemo(() => getNextAvailableDate(entries), [entries])

  const grandTotalHours = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.totalHours, 0),
    [entries],
  )
  const remainingHours = useMemo(
    () => Math.max(TARGET_HOURS - grandTotalHours, 0),
    [grandTotalHours],
  )

  const applyAuthenticatedUser = (user) => {
    setAuthUser(user)

    if (SHOULD_USE_REMOTE_AUTH) {
      setEntries([])
      setEntriesHydrated(false)
      return
    }

    setEntries(getInitialEntries(user))
    setEntriesHydrated(true)
  }

  const clearAuthenticatedUser = () => {
    setAuthUser(null)
    setEntries([])
    setEntriesHydrated(false)
  }

  useEffect(() => {
    if (SHOULD_USE_REMOTE_AUTH) return
    if (!authUser || !entriesHydrated) return

    const scopedStorageKey = getEntriesStorageKey(authUser)
    const scopedCookieKey = getEntriesCookieKey(authUser)

    saveEntriesToCookie(entries, scopedCookieKey)
    saveEntriesToStorage(entries, scopedStorageKey)
  }, [entries, authUser, entriesHydrated])

  useEffect(() => {
    let isActive = true

    if (!SHOULD_USE_REMOTE_AUTH) {
      return () => {
        isActive = false
      }
    }

    const loadSession = async () => {
      try {
        const response = await fetch(`${AUTH_API_BASE}/me`, {
          credentials: 'include',
        })

        const payload = await response.json()

        if (!isActive) return

        if (response.ok) {
          applyAuthenticatedUser(payload.user)
          setLocalSessionUser(payload.user)
        } else {
          if (ALLOW_LOCAL_AUTH_FALLBACK) {
            const localSessionUser = getLocalSessionUser()
            if (localSessionUser) {
              applyAuthenticatedUser(localSessionUser)
            } else {
              clearAuthenticatedUser()
            }
          } else {
            clearAuthenticatedUser()
          }
        }
      } catch {
        if (isActive) {
          if (ALLOW_LOCAL_AUTH_FALLBACK) {
            const localSessionUser = getLocalSessionUser()
            if (localSessionUser) {
              applyAuthenticatedUser(localSessionUser)
            } else {
              clearAuthenticatedUser()
            }
          } else {
            clearAuthenticatedUser()
          }
        }
      } finally {
        if (isActive) {
          setAuthLoading(false)
        }
      }
    }

    loadSession()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    if (!SHOULD_USE_REMOTE_AUTH || !authUser) {
      return () => {
        isActive = false
      }
    }

    const loadEntries = async () => {
      try {
        const response = await fetch(ENTRIES_API_BASE, {
          credentials: 'include',
        })
        const payload = await response.json()

        if (!isActive) return

        if (!response.ok) {
          setEntries([])
          setEntriesHydrated(true)
          return
        }

        const mappedEntries = Array.isArray(payload.entries)
          ? payload.entries.map(mapApiEntryToUiEntry)
          : []

        setEntries(mappedEntries)
        setEntriesHydrated(true)
      } catch {
        if (isActive) {
          setEntries([])
          setEntriesHydrated(true)
        }
      }
    }

    loadEntries()

    return () => {
      isActive = false
    }
  }, [authUser])

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const clearForm = () => {
    setFormData(DEFAULT_FORM_DATA)
  }

  const handleEditInputChange = (event) => {
    const { name, value, type, checked } = event.target
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleAuthInputChange = (event) => {
    const { name, value } = event.target
    setAuthForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()

    setAuthSubmitting(true)
    setAuthMessage('')

    const validationError = validateAuthFields(authForm.username, authForm.password)
    if (validationError) {
      setAuthMessage(validationError)
      setAuthSubmitting(false)
      return
    }

    if (!SHOULD_USE_REMOTE_AUTH) {
      const result =
        authMode === 'register'
          ? localRegister(authForm.username, authForm.password)
          : localLogin(authForm.username, authForm.password)

      if (!result.ok) {
        setAuthMessage(result.message)
      } else {
        applyAuthenticatedUser(result.user)
        setAuthForm({ username: '', password: '' })
        setAuthMessage('')
      }

      setAuthSubmitting(false)
      return
    }

    try {
      const response = await fetch(
        `${AUTH_API_BASE}/${authMode === 'register' ? 'register' : 'login'}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(authForm),
        },
      )

      const payload = await response.json()

      if (!response.ok) {
        if (authMode === 'login' && ALLOW_LOCAL_AUTH_FALLBACK) {
          const localResult = localLogin(authForm.username, authForm.password)

          if (localResult.ok) {
            applyAuthenticatedUser(localResult.user)
            setAuthForm({ username: '', password: '' })
            setAuthMessage('')
            return
          }
        }

        setAuthMessage(getAuthErrorMessage(payload))
        return
      }

      applyAuthenticatedUser(payload.user)
      setLocalSessionUser(payload.user)
      setAuthForm({ username: '', password: '' })
      setAuthMessage('')
    } catch {
      if (!ALLOW_LOCAL_AUTH_FALLBACK) {
        setAuthMessage('Unable to connect to the authentication server.')
        return
      }

      const result =
        authMode === 'register'
          ? localRegister(authForm.username, authForm.password)
          : localLogin(authForm.username, authForm.password)

      if (!result.ok) {
        setAuthMessage(result.message)
        return
      }

      applyAuthenticatedUser(result.user)
      setAuthForm({ username: '', password: '' })
      setAuthMessage('')
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (SHOULD_USE_REMOTE_AUTH) {
        await fetch(`${AUTH_API_BASE}/logout`, {
          method: 'POST',
          credentials: 'include',
        })
      }
    } finally {
      clearLocalSessionUser()
      clearAuthenticatedUser()
      setAuthMode('login')
      setAuthMessage('')
    }
  }

  const handleAddEntry = async (event) => {
    event.preventDefault()

    if (!formData.noOjtClass) {
      const hasMissingTime =
        !formData.morningIn ||
        !formData.morningOut ||
        !formData.afternoonIn ||
        !formData.afternoonOut

      if (hasMissingTime) {
        window.alert('Please complete all time fields, or check "No OJT class".')
        return
      }
    }

    const morningHours = formData.noOjtClass
      ? 0
      : getSessionHours(formData.morningIn, formData.morningOut)
    const afternoonHours = formData.noOjtClass
      ? 0
      : getSessionHours(formData.afternoonIn, formData.afternoonOut)

    const newEntry = {
      id: `${currentDate.getTime()}-${entries.length}`,
      workDate: formatDateKey(currentDate),
      dateKey: formatDateKey(currentDate),
      date: formatDisplayDate(currentDate),
      morningIn: formData.morningIn,
      morningOut: formData.morningOut,
      afternoonIn: formData.afternoonIn,
      afternoonOut: formData.afternoonOut,
      noOjtClass: formData.noOjtClass,
      totalHours: morningHours + afternoonHours,
      notes: '',
    }

    if (SHOULD_USE_REMOTE_AUTH) {
      try {
        const response = await fetch(ENTRIES_API_BASE, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mapUiEntryPayload(newEntry)),
        })
        const payload = await response.json()

        if (!response.ok) {
          window.alert(getAuthErrorMessage(payload))
          return
        }

        setEntries((prev) => [...prev, mapApiEntryToUiEntry(payload.entry)])
        clearForm()
        return
      } catch {
        window.alert('Unable to save entry to the server.')
        return
      }
    }

    setEntries((prev) => [...prev, newEntry])
    clearForm()
  }

  const handleDeleteEntry = async (entryId) => {
    if (SHOULD_USE_REMOTE_AUTH) {
      try {
        const response = await fetch(`${ENTRIES_API_BASE}/${entryId}`, {
          method: 'DELETE',
          credentials: 'include',
        })

        if (!response.ok) {
          const payload = await response.json()
          window.alert(getAuthErrorMessage(payload))
          return
        }
      } catch {
        window.alert('Unable to delete entry from the server.')
        return
      }
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== entryId))

    if (editingEntryId === entryId) {
      setEditingEntryId(null)
      setEditFormData(DEFAULT_FORM_DATA)
    }

    if (notesEntry && notesEntry.id === entryId) {
      setNotesEntry(null)
      setNotesDraft('')
    }
  }

  const handleStartEdit = (entry) => {
    setEditingEntryId(entry.id)
    setEditFormData({
      morningIn: entry.morningIn,
      morningOut: entry.morningOut,
      afternoonIn: entry.afternoonIn,
      afternoonOut: entry.afternoonOut,
      noOjtClass: entry.noOjtClass,
    })
  }

  const handleCancelEdit = () => {
    setEditingEntryId(null)
    setEditFormData(DEFAULT_FORM_DATA)
  }

  const handleOpenNotes = (entry) => {
    setNotesEntry(entry)
    setNotesDraft(entry.notes || '')
  }

  const handleCloseNotes = () => {
    if (notesSaving) return

    setNotesEntry(null)
    setNotesDraft('')
  }

  const handleNotesChange = (event) => {
    setNotesDraft(event.target.value)
  }

  const handleSaveNotes = async () => {
    if (!notesEntry || notesSaving) return

    const entryId = notesEntry.id
    const nextNotes = notesDraft.trim()
    setNotesSaving(true)

    try {
      if (SHOULD_USE_REMOTE_AUTH) {
        const response = await fetch(`${ENTRIES_API_BASE}/${entryId}/notes`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notes: nextNotes }),
        })
        const payload = await response.json()

        if (!response.ok) {
          window.alert(getAuthErrorMessage(payload))
          return
        }

        const mappedEntry = mapApiEntryToUiEntry(payload.entry)
        setEntries((prev) => prev.map((entry) => (entry.id === entryId ? mappedEntry : entry)))
      } else {
        setEntries((prev) =>
          prev.map((entry) => (entry.id === entryId ? { ...entry, notes: nextNotes } : entry)),
        )
      }

      setNotesEntry(null)
      setNotesDraft('')
    } catch {
      window.alert('Unable to save notes for this entry.')
    } finally {
      setNotesSaving(false)
    }
  }

  const handleSaveEdit = async (entryId) => {
    if (!editFormData.noOjtClass) {
      const hasMissingTime =
        !editFormData.morningIn ||
        !editFormData.morningOut ||
        !editFormData.afternoonIn ||
        !editFormData.afternoonOut

      if (hasMissingTime) {
        window.alert('Please complete all time fields, or check "No OJT class".')
        return
      }
    }

    const morningHours = editFormData.noOjtClass
      ? 0
      : getSessionHours(editFormData.morningIn, editFormData.morningOut)
    const afternoonHours = editFormData.noOjtClass
      ? 0
      : getSessionHours(editFormData.afternoonIn, editFormData.afternoonOut)

    if (SHOULD_USE_REMOTE_AUTH) {
      const existing = entries.find((entry) => entry.id === entryId)
      if (!existing) return

      const payloadEntry = {
        ...existing,
        morningIn: editFormData.morningIn,
        morningOut: editFormData.morningOut,
        afternoonIn: editFormData.afternoonIn,
        afternoonOut: editFormData.afternoonOut,
        noOjtClass: editFormData.noOjtClass,
      }

      try {
        const response = await fetch(`${ENTRIES_API_BASE}/${entryId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mapUiEntryPayload(payloadEntry)),
        })
        const payload = await response.json()

        if (!response.ok) {
          window.alert(getAuthErrorMessage(payload))
          return
        }

        const mappedEntry = mapApiEntryToUiEntry(payload.entry)
        setEntries((prev) => prev.map((entry) => (entry.id === entryId ? mappedEntry : entry)))
      } catch {
        window.alert('Unable to update entry on the server.')
        return
      }
    } else {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                morningIn: editFormData.morningIn,
                morningOut: editFormData.morningOut,
                afternoonIn: editFormData.afternoonIn,
                afternoonOut: editFormData.afternoonOut,
                noOjtClass: editFormData.noOjtClass,
                totalHours: morningHours + afternoonHours,
                notes: entry.notes || '',
              }
            : entry,
        ),
      )
    }

    setEditingEntryId(null)
    setEditFormData(DEFAULT_FORM_DATA)
  }

  if (authLoading) {
    return (
      <main className="tracker-page auth-page">
        <section className="tracker-card auth-card">
          <p className="auth-status">Checking session...</p>
        </section>
      </main>
    )
  }

  if (!authUser) {
    return (
      <main className="tracker-page auth-page">
        <section className="tracker-card auth-card">
          <div className="auth-header">
            <div>
              <h1>Account Access</h1>
              <p className="subtext">Register or log in with username and password only.</p>
            </div>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === 'login' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>
              Username
              <input
                type="text"
                name="username"
                value={authForm.username}
                onChange={handleAuthInputChange}
                autoComplete="username"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                value={authForm.password}
                onChange={handleAuthInputChange}
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
              />
            </label>

            {authMessage ? <p className="auth-message">{authMessage}</p> : null}

            <button type="submit" className="add-button" disabled={authSubmitting}>
              {authSubmitting ? 'Please wait...' : authMode === 'register' ? 'Create account' : 'Login'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="tracker-page">
      <section className="tracker-card">
        <div className="auth-header">
          <div>
            <h1>OJT Time Tracker</h1>
            <p className="subtext">Start date: Feb 2, 2026 | Auto-skips Fri, Sat, Sun</p>
          </div>

          <div className="account-chip">
            <span>{authUser.username}</span>
            <button type="button" className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div className="date-chip">Current entry date: {formatDisplayDate(currentDate)}</div>

        <form className="tracker-form" onSubmit={handleAddEntry}>
          <div className="time-grid">
            <div className="session-block">
              <h2>Morning</h2>
              <label>
                Time In
                <input
                  type="time"
                  name="morningIn"
                  value={formData.morningIn}
                  onChange={handleInputChange}
                  disabled={formData.noOjtClass}
                />
              </label>
              <label>
                Time Out
                <input
                  type="time"
                  name="morningOut"
                  value={formData.morningOut}
                  onChange={handleInputChange}
                  disabled={formData.noOjtClass}
                />
              </label>
            </div>

            <div className="session-block">
              <h2>Afternoon</h2>
              <label>
                Time In
                <input
                  type="time"
                  name="afternoonIn"
                  value={formData.afternoonIn}
                  onChange={handleInputChange}
                  disabled={formData.noOjtClass}
                />
              </label>
              <label>
                Time Out
                <input
                  type="time"
                  name="afternoonOut"
                  value={formData.afternoonOut}
                  onChange={handleInputChange}
                  disabled={formData.noOjtClass}
                />
              </label>
            </div>
          </div>

          <label className="no-ojt-toggle">
            <input
              type="checkbox"
              name="noOjtClass"
              checked={formData.noOjtClass}
              onChange={handleInputChange}
            />
            Mark as No OJT Class Day
          </label>

          <button type="submit" className="add-button">
            Add
          </button>
        </form>
      </section>

      <section className="entries-card">
        <h2>Entries</h2>
        {entries.length === 0 ? (
          <p className="empty-state">No entries yet.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Morning In</th>
                    <th>Morning Out</th>
                    <th>Afternoon In</th>
                    <th>Afternoon Out</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.date}</td>
                      <td>
                        {editingEntryId === entry.id ? (
                          <input
                            type="time"
                            name="morningIn"
                            value={editFormData.morningIn}
                            onChange={handleEditInputChange}
                            disabled={editFormData.noOjtClass}
                            className="table-time-input"
                          />
                        ) : (
                          entry.morningIn || '-'
                        )}
                      </td>
                      <td>
                        {editingEntryId === entry.id ? (
                          <input
                            type="time"
                            name="morningOut"
                            value={editFormData.morningOut}
                            onChange={handleEditInputChange}
                            disabled={editFormData.noOjtClass}
                            className="table-time-input"
                          />
                        ) : (
                          entry.morningOut || '-'
                        )}
                      </td>
                      <td>
                        {editingEntryId === entry.id ? (
                          <input
                            type="time"
                            name="afternoonIn"
                            value={editFormData.afternoonIn}
                            onChange={handleEditInputChange}
                            disabled={editFormData.noOjtClass}
                            className="table-time-input"
                          />
                        ) : (
                          entry.afternoonIn || '-'
                        )}
                      </td>
                      <td>
                        {editingEntryId === entry.id ? (
                          <input
                            type="time"
                            name="afternoonOut"
                            value={editFormData.afternoonOut}
                            onChange={handleEditInputChange}
                            disabled={editFormData.noOjtClass}
                            className="table-time-input"
                          />
                        ) : (
                          entry.afternoonOut || '-'
                        )}
                      </td>
                      <td>
                        {editingEntryId === entry.id ? (
                          <label className="table-toggle">
                            <input
                              type="checkbox"
                              name="noOjtClass"
                              checked={editFormData.noOjtClass}
                              onChange={handleEditInputChange}
                            />
                            No OJT
                          </label>
                        ) : entry.noOjtClass ? (
                          'No OJT Class'
                        ) : (
                          'OJT Day'
                        )}
                      </td>
                      <td>{formatDuration(entry.totalHours)}</td>
                      <td>
                        {editingEntryId === entry.id ? (
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="save-button"
                              onClick={() => handleSaveEdit(entry.id)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="cancel-button"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() => handleStartEdit(entry)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              Delete
                            </button>
                            {!entry.noOjtClass ? (
                              <button
                                type="button"
                                className="notes-button"
                                onClick={() => handleOpenNotes(entry)}
                              >
                                Notes
                              </button>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="grand-total">Grand Total: {formatDuration(grandTotalHours)}</p>
            <p className="target-total">Target: {formatDuration(TARGET_HOURS)}</p>
            <p className="remaining-total">
              Remaining (Target - Grand Total): {formatDuration(remainingHours)}
            </p>
          </>
        )}
      </section>

      {notesEntry ? (
        <div className="notes-overlay" role="presentation" onClick={handleCloseNotes}>
          <div
            className="notes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notes-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="notes-modal-header">
              <div>
                <h2 id="notes-modal-title">Entry Notes</h2>
                <p className="subtext">{notesEntry.date}</p>
              </div>
              <button type="button" className="cancel-button" onClick={handleCloseNotes}>
                Close
              </button>
            </div>

            <label className="notes-label">
              Notes
              <textarea
                value={notesDraft}
                onChange={handleNotesChange}
                maxLength={1000}
                rows={7}
                placeholder="Add a note for this entry..."
              />
            </label>

            <div className="notes-modal-actions">
              <button type="button" className="save-button" onClick={handleSaveNotes}>
                {notesSaving ? 'Saving...' : 'Save Notes'}
              </button>
              <button type="button" className="cancel-button" onClick={handleCloseNotes}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default App
