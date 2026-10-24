import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sortNotes, type Note, type NoteInput } from './model'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isCloudConfigured = Boolean(url && key)
export const supabase: SupabaseClient | null = isCloudConfigured ? createClient(url, key) : null

export interface NoteStore {
  list(): Promise<Note[]>
  create(input: NoteInput): Promise<Note>
  update(id: string, input: NoteInput): Promise<Note>
  remove(id: string): Promise<void>
}

const demoKey = 'daily-learning-preview-notes-v1'

function previewId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function readPreviewNotes(): Note[] {
  try {
    return sortNotes(JSON.parse(localStorage.getItem(demoKey) || '[]') as Note[])
  } catch {
    return []
  }
}

function writePreviewNotes(notes: Note[]) {
  localStorage.setItem(demoKey, JSON.stringify(sortNotes(notes)))
}

export const previewStore: NoteStore = {
  async list() {
    return readPreviewNotes()
  },
  async create(input) {
    const now = new Date().toISOString()
    const note = { ...input, id: previewId(), created_at: now, updated_at: now }
    writePreviewNotes([...readPreviewNotes(), note])
    return note
  },
  async update(id, input) {
    const notes = readPreviewNotes()
    const old = notes.find((note) => note.id === id)
    if (!old) throw new Error('这条记录已不存在，请刷新后重试。')
    const note = { ...old, ...input, updated_at: new Date().toISOString() }
    writePreviewNotes(notes.map((item) => item.id === id ? note : item))
    return note
  },
  async remove(id) {
    writePreviewNotes(readPreviewNotes().filter((note) => note.id !== id))
  },
}

export function cloudStore(client: SupabaseClient): NoteStore {
  return {
    async list() {
      const results: Note[] = []
      const pageSize = 500
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await client
          .from('notes')
          .select('id,category,title,body,source_url,learned_on,created_at,updated_at')
          .order('learned_on', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(offset, offset + pageSize - 1)
        if (error) throw error
        const page = data as Note[]
        results.push(...page)
        if (page.length < pageSize) break
      }
      return results
    },
    async create(input) {
      const { data: userResult, error: userError } = await client.auth.getUser()
      if (userError || !userResult.user) throw new Error('登录已失效，请重新登录。')
      const { data, error } = await client.from('notes')
        .insert({ ...input, user_id: userResult.user.id })
        .select('id,category,title,body,source_url,learned_on,created_at,updated_at')
        .single()
      if (error) throw error
      return data as Note
    },
    async update(id, input) {
      const { data, error } = await client.from('notes')
        .update(input)
        .eq('id', id)
        .select('id,category,title,body,source_url,learned_on,created_at,updated_at')
        .single()
      if (error) throw error
      return data as Note
    },
    async remove(id) {
      const { error } = await client.from('notes').delete().eq('id', id)
      if (error) throw error
    },
  }
}
