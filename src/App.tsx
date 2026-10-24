import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  ArrowLeft, ArrowRight, BookOpen, BrainCircuit, CalendarDays, Check,
  Download, FileText, LogOut, Plus, Scale, Search, Table2, Trash2, X,
} from 'lucide-react'
import { cloudStore, isCloudConfigured, previewStore, supabase, type NoteStore } from './data'
import {
  categories, categoryName, filterNotes, formatDate, localToday, sortNotes,
  validateNote, type Category, type Note, type NoteInput,
} from './model'

type View = 'today' | 'library'
type EditorTarget = { category: Category; note?: Note }

const categoryIcons = { excel: Table2, psychology: BrainCircuit, law: Scale }

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请检查网络后重试。'
}

function AuthScreen({ recovery, onRecovered }: { recovery: boolean; onRecovered: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'reset' | 'new-password'>(recovery ? 'new-password' : 'login')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { if (recovery) setMode('new-password') }, [recovery])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'reset') {
        const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).href,
        })
        if (error) throw error
        setMessage('重置邮件已发送，请查看邮箱。')
      } else if (mode === 'new-password') {
        if (password.length < 8) throw new Error('新密码至少需要 8 位。')
        const { error } = await supabase!.auth.updateUser({ password })
        if (error) throw error
        setMode('login')
        setMessage('密码已更新，请重新登录。')
        await supabase!.auth.signOut()
        onRecovered()
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      }
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-brand"><span className="brand-symbol"><BookOpen size={22} /></span><span>每日所学</span></div>
      <section className="auth-panel">
        <p className="eyebrow">私人知识库</p>
        <h1>{mode === 'login' ? '继续记录今天所学' : mode === 'reset' ? '找回密码' : '设置新密码'}</h1>
        <form onSubmit={submit}>
          {mode !== 'new-password' && <label className="field-label">邮箱<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>}
          {mode !== 'reset' && <label className="field-label">{mode === 'new-password' ? '新密码' : '密码'}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'new-password' ? 8 : undefined} required /></label>}
          {message && <p className="form-message" role="status">{message}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? '请稍候…' : mode === 'login' ? '登录' : mode === 'reset' ? '发送重置邮件' : '更新密码'}<ArrowRight size={17} /></button>
        </form>
        {mode !== 'new-password' && <button className="text-button auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'reset' : 'login'); setMessage('') }}>{mode === 'login' ? '忘记密码？' : '返回登录'}</button>}
      </section>
    </main>
  )
}

function Editor({ target, onClose, onSave }: { target: EditorTarget; onClose: () => void; onSave: (input: NoteInput, id?: string) => Promise<void> }) {
  const draftKey = `daily-learning-draft-${target.note?.id ?? 'new'}`
  const [input, setInput] = useState<NoteInput>(() => {
    const base: NoteInput = target.note ? {
      category: target.note.category, title: target.note.title, body: target.note.body,
      source_url: target.note.source_url, learned_on: target.note.learned_on,
    } : { category: target.category, title: '', body: '', source_url: null, learned_on: localToday() }
    try {
      const saved = sessionStorage.getItem(draftKey)
      return saved ? { ...base, ...JSON.parse(saved) as NoteInput } : base
    } catch {
      return base
    }
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    sessionStorage.setItem(draftKey, JSON.stringify(input))
  }, [draftKey, input])

  function change<K extends keyof NoteInput>(key: K, value: NoteInput[K]) {
    setInput((current) => ({ ...current, [key]: value }))
    setError('')
  }

  function discard() {
    sessionStorage.removeItem(draftKey)
    onClose()
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const clean: NoteInput = {
      ...input, title: input.title.trim(), body: input.body.trim(),
      source_url: input.source_url?.trim() || null,
    }
    const issue = validateNote(clean)
    if (issue) { setError(issue); return }
    setBusy(true)
    try {
      await onSave(clean, target.note?.id)
      sessionStorage.removeItem(draftKey)
      onClose()
    } catch (caught) {
      setError(`保存失败：${errorMessage(caught)} 草稿仍在此页面，可重试。`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) discard() }}>
      <section className="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <div className="dialog-heading"><div><p className="eyebrow">学习记录</p><h2 id="editor-title">{target.note ? '编辑知识' : '记录新知识'}</h2></div><button className="icon-button" type="button" title="关闭" aria-label="关闭" onClick={discard} disabled={busy}><X size={19} /></button></div>
        <form onSubmit={submit} className="editor-form">
          <div className="field-group"><span className="field-caption">类别</span><div className="category-options" role="group" aria-label="知识类别">{categories.map((category) => <button key={category.id} type="button" className={`category-option ${input.category === category.id ? 'selected' : ''}`} onClick={() => change('category', category.id)} aria-pressed={input.category === category.id}>{category.shortName}</button>)}</div></div>
          <label className="field-label">标题<input autoFocus value={input.title} onChange={(event) => change('title', event.target.value)} maxLength={160} placeholder="这条知识的名称" required /></label>
          <label className="field-label">学习日期<input type="date" value={input.learned_on} onChange={(event) => change('learned_on', event.target.value)} required /></label>
          <label className="field-label">学习内容<textarea value={input.body} onChange={(event) => change('body', event.target.value)} rows={9} placeholder={categories.find((category) => category.id === input.category)?.hint} required /></label>
          <label className="field-label">来源链接 <span className="optional">选填</span><input type="url" value={input.source_url ?? ''} onChange={(event) => change('source_url', event.target.value)} placeholder="https://" /></label>
          {error && <p className="form-message error" role="alert">{error}</p>}
          <div className="dialog-actions"><button type="button" className="secondary-button" onClick={discard} disabled={busy}>取消</button><button type="submit" className="primary-button" disabled={busy}>{busy ? '保存中…' : target.note ? '保存修改' : '保存记录'}<Check size={17} /></button></div>
        </form>
      </section>
    </div>
  )
}

function NoteDetail({ note, onClose, onEdit, onDelete }: { note: Note; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const Icon = categoryIcons[note.category]
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <div className="detail-top"><button className="text-button back-button" type="button" onClick={onClose}><ArrowLeft size={17} />返回</button><div className="detail-tools"><button className="secondary-button compact" type="button" onClick={onEdit}>编辑</button><button className="icon-button danger" type="button" onClick={onDelete} title="删除记录" aria-label="删除记录"><Trash2 size={18} /></button></div></div>
        <div className={`detail-category ${note.category}`}><Icon size={18} />{categoryName(note.category)}<span className="detail-dot">·</span>{formatDate(note.learned_on)}</div>
        <h2 id="detail-title">{note.title}</h2>
        <div className="detail-body">{note.body}</div>
        {note.source_url && <div className="detail-source"><span>来源</span><a href={note.source_url} target="_blank" rel="noopener noreferrer">{note.source_url}</a></div>}
      </section>
    </div>
  )
}

function NoteRow({ note, onOpen }: { note: Note; onOpen: () => void }) {
  return <button className="note-row" type="button" onClick={onOpen}><div className={`note-marker ${note.category}`} /><span className="note-row-main"><strong>{note.title}</strong><span>{note.body.replace(/\s+/g, ' ').slice(0, 95)}</span></span><span className="note-row-date">{note.learned_on.slice(5).replace('-', '/')}</span><ArrowRight className="row-arrow" size={17} /></button>
}

function Workspace({ store, preview, email, onSignOut }: { store: NoteStore; preview: boolean; email?: string; onSignOut?: () => void }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [view, setView] = useState<View>('today')
  const [today, setToday] = useState(localToday())
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [date, setDate] = useState('')
  const [detail, setDetail] = useState<Note | null>(null)
  const [editor, setEditor] = useState<EditorTarget | null>(null)
  const [notice, setNotice] = useState('')

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    try {
      setNotes(sortNotes(await store.list()))
      setLoadError('')
    } catch (error) {
      setLoadError(`记录加载失败：${errorMessage(error)}`)
    } finally {
      if (initial) setLoading(false)
    }
  }, [store])

  useEffect(() => {
    void load(true)
    const timer = window.setInterval(() => { setToday(localToday()); void load() }, 30000)
    const focused = () => { setToday(localToday()); void load() }
    window.addEventListener('focus', focused)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', focused) }
  }, [load])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const todayNotes = useMemo(() => notes.filter((note) => note.learned_on === today), [notes, today])
  const visibleNotes = useMemo(() => filterNotes(notes, search, category, date), [notes, search, category, date])
  const recordedCategories = categories.filter((item) => todayNotes.some((note) => note.category === item.id)).length

  async function save(input: NoteInput, id?: string) {
    const saved = id ? await store.update(id, input) : await store.create(input)
    setNotes((current) => sortNotes(id ? current.map((note) => note.id === id ? saved : note) : [...current, saved]))
    setDetail(null)
    setNotice(id ? '修改已保存' : '记录已保存')
  }

  async function remove(note: Note) {
    if (!window.confirm(`确定删除「${note.title}」吗？删除后无法恢复。`)) return
    try {
      await store.remove(note.id)
      setNotes((current) => current.filter((item) => item.id !== note.id))
      setDetail(null)
      setNotice('记录已删除')
    } catch (error) {
      setNotice(`删除失败：${errorMessage(error)}`)
    }
  }

  function exportNotes() {
    const content = JSON.stringify({ exported_at: new Date().toISOString(), notes }, null, 2)
    const href = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = href
    link.download = `每日所学-${localToday()}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(href), 1000)
    setNotice('记录已导出')
  }

  function openCategory(categoryId: Category) {
    setCategory(categoryId)
    setDate(today)
    setSearch('')
    setView('library')
  }

  return (
    <div className="app-shell">
      <header className="site-header"><div className="header-inner"><div className="brand"><span className="brand-symbol"><BookOpen size={20} /></span><span>每日所学</span></div><nav className="main-nav" aria-label="主导航"><button className={view === 'today' ? 'active' : ''} onClick={() => setView('today')}>今天</button><button className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>知识库</button></nav><div className="header-actions"><button className="icon-button" type="button" onClick={exportNotes} disabled={loading || Boolean(loadError)} title={loadError ? '记录加载失败，暂不能导出' : '导出全部记录'} aria-label="导出全部记录"><Download size={19} /></button>{onSignOut && <button className="icon-button" type="button" onClick={onSignOut} title={`退出登录 ${email ?? ''}`} aria-label="退出登录"><LogOut size={19} /></button>}</div></div></header>
      {preview && <div className="preview-banner"><span className="preview-dot" />本机预览：记录只保存在当前浏览器，尚未跨设备同步。</div>}
      <main className="content">
        {loadError && <div className="load-error" role="alert">{loadError}<button className="text-button" onClick={() => void load(true)}>重试</button></div>}
        {view === 'today' ? <>
          <div className="page-heading"><div><p className="eyebrow">{formatDate(today)}</p><h1>今天所学<span className="heading-accent">.</span></h1><p className="heading-meta">{recordedCategories === 0 ? '今天还没有记录' : `今天已记录 ${recordedCategories} 类 · ${todayNotes.length} 条知识`}</p></div><button className="primary-button top-add" type="button" onClick={() => setEditor({ category: 'excel' })}><Plus size={18} />新增记录</button></div>
          <div className="section-heading"><span>三个方向</span><span>今日记录</span></div>
          <div className="category-list">{categories.map((item) => {
            const Icon = categoryIcons[item.id]
            const group = todayNotes.filter((note) => note.category === item.id)
            return <section className={`category-section ${item.id}`} key={item.id}><div className="category-main"><div className="category-identity"><span className="category-icon"><Icon size={22} /></span><div><h2>{item.name}</h2><span>{item.hint}</span></div></div><div className="category-controls"><button className="count-button" type="button" onClick={() => openCategory(item.id)} title={`查看今天的${item.name}记录`}>{group.length} 条<ArrowRight size={16} /></button><button className="add-small" type="button" onClick={() => setEditor({ category: item.id })} title={`新增${item.name}记录`} aria-label={`新增${item.name}记录`}><Plus size={19} /></button></div></div>{group.length > 0 && <div className="category-notes">{group.map((note) => <button type="button" key={note.id} onClick={() => setDetail(note)}><span>{note.title}</span><ArrowRight size={15} /></button>)}</div>}</section>
          })}</div>
          <section className="recent-section"><div className="recent-heading"><div><p className="eyebrow">历史</p><h2>最近记录</h2></div><button className="text-button" type="button" onClick={() => { setView('library'); setCategory('all'); setDate('') }}>查看全部<ArrowRight size={16} /></button></div>{loading ? <p className="empty-copy">正在加载记录…</p> : notes.length === 0 ? <div className="empty-state"><FileText size={22} /><p>还没有学习记录。从今天的第一条开始。</p></div> : <div className="note-list">{notes.slice(0, 5).map((note) => <NoteRow key={note.id} note={note} onOpen={() => setDetail(note)} />)}</div>}</section>
        </> : <>
          <div className="page-heading library-heading"><div><p className="eyebrow">全部记录</p><h1>知识库<span className="heading-accent">.</span></h1><p className="heading-meta">{notes.length} 条知识，随时找回。</p></div><button className="primary-button top-add" type="button" onClick={() => setEditor({ category: category === 'all' ? 'excel' : category })}><Plus size={18} />新增记录</button></div>
          <div className="filter-bar"><label className="search-field"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索标题或内容" aria-label="搜索标题或内容" />{search && <button type="button" onClick={() => setSearch('')} title="清除搜索" aria-label="清除搜索"><X size={16} /></button>}</label><label className="date-filter"><CalendarDays size={18} /><input type="date" aria-label="筛选学习日期" value={date} onChange={(event) => setDate(event.target.value)} /></label></div>
          <div className="filter-tabs" role="group" aria-label="类别筛选"><button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>全部</button>{categories.map((item) => <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}>{item.shortName}</button>)}</div>
          <div className="result-heading"><span>记录</span><span>{visibleNotes.length} 条结果</span></div>
          {loading ? <p className="empty-copy">正在加载记录…</p> : visibleNotes.length === 0 ? <div className="empty-state"><Search size={23} /><p>{notes.length === 0 ? '还没有记录，添加第一条知识吧。' : '没有找到符合条件的记录。'}</p>{notes.length > 0 && <button type="button" className="text-button" onClick={() => { setSearch(''); setCategory('all'); setDate('') }}>清除筛选</button>}</div> : <div className="note-list">{visibleNotes.map((note) => <NoteRow key={note.id} note={note} onOpen={() => setDetail(note)} />)}</div>}
        </>}
      </main>
      {notice && <div className="toast" role="status">{notice}</div>}
      {detail && <NoteDetail note={detail} onClose={() => setDetail(null)} onEdit={() => { setEditor({ category: detail.category, note: detail }); setDetail(null) }} onDelete={() => void remove(detail)} />}
      {editor && <Editor target={editor} onClose={() => setEditor(null)} onSave={save} />}
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(isCloudConfigured)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false) })
    const { data } = supabase.auth.onAuthStateChange((event, current) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(current)
      setChecking(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const store = useMemo(() => supabase ? cloudStore(supabase) : previewStore, [])
  if (checking) return <div className="loading-shell">正在打开每日所学…</div>
  if (isCloudConfigured && (!session || recovering)) return <AuthScreen recovery={recovering} onRecovered={() => setRecovering(false)} />
  return <Workspace store={store} preview={!isCloudConfigured} email={session?.user.email} onSignOut={supabase ? () => void supabase!.auth.signOut() : undefined} />
}
