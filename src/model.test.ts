import { describe, expect, it } from 'vitest'
import { filterNotes, localToday, sortNotes, validateNote, type Note } from './model'

const sample: Note[] = [
  { id: '1', category: 'excel', title: '快速填充', body: 'Ctrl + E\n=COUNTIF(B:B,B2)', source_url: null, learned_on: '2026-10-24', created_at: '2026-10-24T10:00:00Z', updated_at: '2026-10-24T10:00:00Z' },
  { id: '2', category: 'law', title: '保存证据', body: '保留完整聊天记录', source_url: null, learned_on: '2026-10-24', created_at: '2026-10-24T11:00:00Z', updated_at: '2026-10-24T11:00:00Z' },
  { id: '3', category: 'excel', title: '条件格式', body: '突出显示重复值', source_url: null, learned_on: '2026-10-23', created_at: '2026-10-23T10:00:00Z', updated_at: '2026-10-23T10:00:00Z' },
]

describe('学习记录', () => {
  it('按本地日期保存，不被 UTC 日期偏移影响', () => {
    expect(localToday(new Date(2026, 9, 24, 0, 5))).toBe('2026-10-24')
  })

  it('可按正文、类别和日期一起筛选，保留公式内容', () => {
    expect(filterNotes(sample, 'countif', 'excel', '2026-10-24').map((note) => note.id)).toEqual(['1'])
    expect(filterNotes(sample, '', 'excel', '').map((note) => note.id)).toEqual(['1', '3'])
  })

  it('同一天多条记录按创建时间排列', () => {
    expect(sortNotes(sample).map((note) => note.id)).toEqual(['2', '1', '3'])
  })

  it('拒绝空内容和不安全的来源链接', () => {
    expect(validateNote({ category: 'law', title: ' ', body: '内容', learned_on: '2026-10-24', source_url: null })).not.toBeNull()
    expect(validateNote({ category: 'law', title: '标题', body: '内容', learned_on: '2026-02-30', source_url: null })).not.toBeNull()
    expect(validateNote({ category: 'law', title: '标题', body: '内容', learned_on: '2026-10-24', source_url: 'javascript:alert(1)' })).not.toBeNull()
    expect(validateNote({ category: 'excel', title: '公式', body: '=COUNTIF(B:B,B2)', learned_on: '2026-10-24', source_url: null })).toBeNull()
  })
})
