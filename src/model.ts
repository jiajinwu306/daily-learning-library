export type Category = 'excel' | 'psychology' | 'law'

export type Note = {
  id: string
  category: Category
  title: string
  body: string
  source_url: string | null
  learned_on: string
  created_at: string
  updated_at: string
}

export type NoteInput = Pick<Note, 'category' | 'title' | 'body' | 'source_url' | 'learned_on'>

export const categories: { id: Category; name: string; shortName: string; hint: string }[] = [
  { id: 'excel', name: 'Excel 技能', shortName: 'Excel', hint: '公式、快捷键、操作步骤' },
  { id: 'psychology', name: '心理学技巧', shortName: '心理学', hint: '概念、观察、实际应用' },
  { id: 'law', name: '法律知识', shortName: '法律', hint: '主题、要点、资料来源' },
]

export const categoryName = (category: Category) =>
  categories.find((item) => item.id === category)?.name ?? category

export function localToday(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`
}

export function validateNote(input: NoteInput): string | null {
  if (!input.title.trim()) return '请填写知识标题。'
  if (!input.body.trim()) return '请填写学习内容。'
  const date = /^\d{4}-(\d{2})-(\d{2})$/.exec(input.learned_on)
  const parsed = date ? new Date(`${input.learned_on}T00:00:00`) : null
  if (!date || !parsed || Number.isNaN(parsed.getTime()) || localToday(parsed) !== input.learned_on) {
    return '请选择有效的学习日期。'
  }
  if (input.source_url) {
    try {
      const url = new URL(input.source_url)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '来源链接须以 http:// 或 https:// 开头。'
    } catch {
      return '来源链接格式不正确。'
    }
  }
  return null
}

export function filterNotes(notes: Note[], search: string, category: Category | 'all', date: string): Note[] {
  const query = search.trim().toLocaleLowerCase()
  return notes.filter((note) =>
    (category === 'all' || note.category === category) &&
    (!date || note.learned_on === date) &&
    (!query || `${note.title}\n${note.body}`.toLocaleLowerCase().includes(query)),
  )
}

export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) =>
    b.learned_on.localeCompare(a.learned_on) || b.created_at.localeCompare(a.created_at),
  )
}
