import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, ChevronDown, CircleHelp, Clock3, FileText, Headphones, Layers3, Mic, Pause, Play, Plus, Search, Sparkles, Square, Upload, Volume2, X } from 'lucide-react'

const initialLessons = [
  { id: 1, title: 'The Human Cell: Structure & Function', course: 'Biology 101', date: 'Today · 10:30 AM', duration: '42 min', color: 'lavender', transcript: 'Today we are going to look at the structure of a cell. The cell membrane controls what enters and leaves the cell. The nucleus contains DNA, which carries genetic instructions. Mitochondria produce energy through cellular respiration. Remember that ribosomes are responsible for protein synthesis.' },
  { id: 2, title: 'Foundations of Linear Algebra', course: 'Mathematics', date: 'Yesterday · 2:00 PM', duration: '56 min', color: 'peach', transcript: 'A vector is an object that has both magnitude and direction. Vectors can be added component-wise. A matrix is a rectangular array of numbers and can represent a linear transformation. We use matrix multiplication to compose transformations.' },
  { id: 3, title: 'The Industrial Revolution', course: 'World History', date: 'Mon, Oct 21 · 9:00 AM', duration: '38 min', color: 'mint', transcript: 'The Industrial Revolution began in Britain in the late eighteenth century. New manufacturing processes and steam power transformed production. Urbanization accelerated as people moved to cities for factory work. These changes reshaped society, labor, and global trade.' },
]
const summarize = text => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  return sentences.map(s => s.trim()).filter(Boolean).slice(0, 4)
}
const makeQuestions = text => summarize(text).slice(0, 3).map((s, i) => ({ q: `What is a key idea from this lesson?`, a: s, id: i }))

export default function App() {
  const [lessons, setLessons] = useState(() => {
    try { return JSON.parse(localStorage.getItem('student-study-lessons')) || initialLessons } catch { return initialLessons }
  })
  const [selectedId, setSelectedId] = useState(1)
  const [tab, setTab] = useState('Overview')
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [recordingTitle, setRecordingTitle] = useState('')
  const [notice, setNotice] = useState('')
  const [flashIndex, setFlashIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [quizAnswer, setQuizAnswer] = useState(null)
  const [search, setSearch] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [summary, setSummary] = useState(false)
  const recognitionRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const selected = lessons.find(l => l.id === selectedId) || lessons[0]
  const lessonText = selected?.transcript || ''
  const questions = makeQuestions(lessonText)
  const filtered = lessons.filter(l => `${l.title} ${l.course}`.toLowerCase().includes(search.toLowerCase()))
  useEffect(() => { localStorage.setItem('student-study-lessons', JSON.stringify(lessons)) }, [lessons])
  useEffect(() => { if (!recording) return; const timer = setInterval(() => setElapsed(v => v + 1), 1000); return () => clearInterval(timer) }, [recording])
  useEffect(() => () => { recognitionRef.current?.stop(); streamRef.current?.getTracks().forEach(t => t.stop()) }, [])

  const startRecording = async () => {
    setNotice('')
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setNotice('Audio recording is not supported in this browser. Try a current version of Chrome or Edge over HTTPS.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
      recorder.start()
      setElapsed(0); setTranscript(''); setRecording(true)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US'
        recognition.onresult = e => { let text = ''; for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + (e.results[i].isFinal ? '. ' : ' '); setTranscript(text.trim()) }
        recognition.onerror = e => { if (e.error !== 'no-speech') setNotice(`Transcription note: ${e.error}. Recording can continue.`) }
        recognition.start(); recognitionRef.current = recognition
      } else setNotice('Recording started. Live transcription is not supported in this browser; your audio will still be saved.')
    } catch (e) { setNotice(e.name === 'NotAllowedError' ? 'Microphone access was denied. Allow microphone access in your browser and try again.' : 'Could not start recording. Check your microphone and try again.') }
  }
  const stopRecording = () => {
    setRecording(false); recognitionRef.current?.stop(); recognitionRef.current = null
    const recorder = recorderRef.current
    if (!recorder) return
    recorder.onstop = () => {
      const audioUrl = URL.createObjectURL(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }))
      const title = recordingTitle.trim() || `Lecture recording ${new Date().toLocaleDateString()}`
      const newLesson = { id: Date.now(), title, course: 'New recording', date: 'Just now', duration: `${Math.max(1, Math.round(elapsed / 60))} min`, color: 'lavender', transcript: transcript.trim() || 'No transcript was captured. Your recording is saved; live speech recognition availability varies by browser.' , audioUrl }
      setLessons(prev => [newLesson, ...prev]); setSelectedId(newLesson.id); setTab('Overview'); setRecordingTitle(''); setNotice('Recording saved.'); streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null
    }
    recorder.stop()
  }
  const uploadAudio = e => {
    const file = e.target.files?.[0]; if (!file) return
    const title = file.name.replace(/\.[^.]+$/, '')
    const lesson = { id: Date.now(), title, course: 'Uploaded audio', date: 'Just now', duration: 'Audio file', color: 'peach', transcript: 'Audio uploaded successfully. Browser-only transcription of existing audio files is not consistently supported. Use live recording with a supported browser for speech-to-text, or add a transcription service for uploaded audio.', audioUrl: URL.createObjectURL(file) }
    setLessons(prev => [lesson, ...prev]); setSelectedId(lesson.id); setTab('Overview'); setNotice('Audio file added. Browser-only transcription of uploaded audio is not available consistently.'); e.target.value = ''
  }
  const copyText = async text => { try { await navigator.clipboard.writeText(text); setNotice('Copied to clipboard.') } catch { setNotice('Clipboard access is unavailable.') } }
  const formatTime = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
  const downloadNotes = () => { const blob = new Blob([`${selected.title}\n${selected.course}\n\nSUMMARY\n${summarize(lessonText).map(x => `• ${x}`).join('\n')}\n\nTRANSCRIPT\n${lessonText}`], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${selected.title.replace(/[^a-z0-9]+/gi, '-')}-notes.txt`; a.click(); URL.revokeObjectURL(a.href) }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#home"><span className="brand-mark"><BookOpen size={19}/></span><span>student<span className="brand-light">study</span></span></a>
      <div className="side-label">WORKSPACE</div>
      <button className="nav-item active"><Layers3 size={18}/> My lessons</button>
      <button className="nav-item" onClick={() => setNotice('Your study tools are generated from each lesson. Select a lesson to get started.')}><Sparkles size={18}/> Study tools</button>
      <div className="side-label recent-label">RECENT LESSONS <button aria-label="Add lesson" onClick={() => document.getElementById('upload-audio')?.click()}><Plus size={16}/></button></div>
      <div className="lesson-list">{lessons.slice(0, 6).map(l => <button key={l.id} onClick={() => {setSelectedId(l.id);setTab('Overview')}} className={`lesson-nav ${l.id === selectedId ? 'chosen' : ''}`}><span className={`lesson-dot ${l.color}`}></span><span>{l.title}</span></button>)}</div>
      <div className="sidebar-bottom"><div className="upgrade-card"><span className="upgrade-icon"><Sparkles size={17}/></span><strong>Your study space</strong><p>Lessons are saved locally in this browser.</p><span className="local-badge"><span/> PRIVATE & LOCAL</span></div><div className="profile"><div className="avatar">S</div><div><strong>Student</strong><small>My workspace</small></div><ChevronDown size={16}/></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumbs">My lessons <span>/</span> <strong>{selected?.title || 'New lesson'}</strong></div><div className="top-actions"><div className="search-box"><Search size={16}/><input aria-label="Search lessons" placeholder="Search lessons..." value={search} onChange={e => setSearch(e.target.value)}/><kbd>⌘ K</kbd></div><button className="icon-btn" aria-label="Help" onClick={() => setNotice('Tip: record over HTTPS and allow microphone access. Live transcription depends on browser support.')}><CircleHelp size={19}/></button><div className="avatar small-avatar">S</div></div></header>
      <div className="page-wrap">
        <section className="welcome-row"><div><div className="eyebrow"><span className="wave">✳</span> YOUR PERSONAL LEARNING SPACE</div><h1>Good morning, Alex <span>✦</span></h1><p className="subheading">Ready to make today’s lessons stick?</p></div><div className="date-chip"><span className="date-icon">◷</span> Tuesday, October 22</div></section>
        <section className="record-card"><div className="record-info"><div className="record-icon"><Mic size={21}/></div><div><h2>Capture a new lesson</h2><p>Record a lecture or bring in an audio file to get started.</p></div></div><div className="record-controls">{recording ? <><div className="recording-status"><span className="live-dot"/> Recording {formatTime(elapsed)}</div><button className="stop-btn" onClick={stopRecording}><Square size={15} fill="currentColor"/> Finish</button></> : <><input className="title-input" aria-label="Recording title" placeholder="Lesson title (optional)" value={recordingTitle} onChange={e => setRecordingTitle(e.target.value)}/><button className="record-btn" onClick={startRecording}><Mic size={16}/> Record</button><label className="upload-btn"><Upload size={16}/> Upload audio<input id="upload-audio" type="file" accept="audio/*" hidden onChange={uploadAudio}/></label></>}</div></section>
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}
        {recording && <div className="transcribing"><span className="pulse"/> <div><strong>Lecture in progress</strong><p>{transcript || 'Listening for speech… Allow microphone access and speak clearly.'}</p></div></div>}
        <section className="section-heading"><div><div className="section-overline">PICK UP WHERE YOU LEFT OFF</div><h2>Your lessons <span className="count-pill">{filtered.length}</span></h2></div><button className="sort-button">Recently added <ChevronDown size={15}/></button></section>
        <section className="lesson-grid">{filtered.map((l, i) => <article key={l.id} className={`lesson-card ${l.id === selectedId ? 'selected-card' : ''}`} onClick={() => {setSelectedId(l.id);setTab('Overview')}}><div className={`card-art ${l.color}`}><div className="art-orb orb-one"/><div className="art-orb orb-two"/><span className="card-art-icon">{i % 3 === 0 ? '✳' : i % 3 === 1 ? '∑' : '◈'}</span><button className="more-btn" aria-label="More options" onClick={e => {e.stopPropagation();setNotice('Lesson options: open a lesson to review or export its notes.')}}>···</button></div><div className="card-body"><div className="course-name">{l.course}</div><h3>{l.title}</h3><div className="card-meta"><span><Clock3 size={14}/>{l.duration}</span><span>{l.date}</span></div><div className="card-divider"/><div className="card-footer"><span className="ready-status"><span/> Ready to study</span><button className="arrow-btn" aria-label={`Open ${l.title}`} onClick={e => {e.stopPropagation();setSelectedId(l.id);setTab('Overview')}}>↗</button></div></div></article>)}{filtered.length === 0 && <div className="empty-state">No lessons match “{search}”.</div>}</section>
        <section className="detail-panel"><div className="detail-top"><div><div className="course-name">{selected?.course}</div><h2>{selected?.title}</h2><p className="detail-meta">{selected?.date} <span>·</span> {selected?.duration}</p></div><button className="export-btn" onClick={downloadNotes}><FileText size={16}/> Export notes</button></div><nav className="tabs">{['Overview', 'Transcript', 'Flashcards', 'Quiz'].map(t => <button key={t} className={tab === t ? 'tab-active' : ''} onClick={() => {setTab(t);setFlipped(false);setQuizAnswer(null)}}>{t === 'Overview' ? <Sparkles size={15}/> : t === 'Transcript' ? <FileText size={15}/> : t === 'Flashcards' ? <Layers3 size={15}/> : <CircleHelp size={15}/>} {t}</button>)}</nav>
          {tab === 'Overview' && <div className="overview-content"><div className="summary-column"><h3><span className="mini-spark">✦</span> Lesson summary <span className="ai-tag">BROWSER GENERATED</span></h3><ul>{summarize(lessonText).map((s,i) => <li key={i}>{s}</li>)}</ul><button className="text-action" onClick={() => {setSummary(true);setNotice('Summary is generated from the saved transcript in your browser.')}}>{summary ? 'Summary refreshed ✓' : 'Refresh summary'} <Sparkles size={14}/></button></div><div className="key-points"><h3>Key concepts</h3>{summarize(lessonText).slice(0,3).map((s,i) => <div className="concept" key={i}><span>{String(i + 1).padStart(2,'0')}</span><p>{s.replace(/[.!?]$/, '')}</p></div>)}</div></div>}
          {tab === 'Transcript' && <div className="transcript-content"><div className="transcript-heading"><h3><Headphones size={17}/> Lecture transcript</h3><button className="text-action" onClick={() => copyText(lessonText)}>Copy text</button></div><p>{lessonText || 'No transcript available for this lesson yet.'}</p>{selected?.audioUrl && <audio controls src={selected.audioUrl} className="audio-player"><Volume2 size={16}/></audio>}</div>}
          {tab === 'Flashcards' && <div className="study-area"><div className="study-kicker">FLASHCARD {questions.length ? flashIndex + 1 : 0} OF {questions.length}</div><button className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(v => !v)}><span className="flash-label">{flipped ? 'ANSWER' : 'QUESTION'}</span><strong>{questions.length ? (flipped ? questions[flashIndex]?.a : questions[flashIndex]?.q) : 'Add a transcript to create flashcards'}</strong><small>Click card to flip</small></button><div className="study-nav"><button disabled={flashIndex === 0} onClick={() => {setFlashIndex(i => Math.max(0,i-1));setFlipped(false)}}>← Previous</button><button disabled={flashIndex >= questions.length - 1} onClick={() => {setFlashIndex(i => Math.min(questions.length - 1,i+1));setFlipped(false)}}>Next →</button></div></div>}
          {tab === 'Quiz' && <div className="quiz-area">{questions.length ? <><div className="study-kicker">QUICK CHECK · QUESTION 1 OF 1</div><h3>{questions[0]?.q}</h3><div className="quiz-options">{[questions[0]?.a, 'This concept is unrelated to the lesson.', 'The lesson does not mention this topic.'].map((a,i) => <button key={i} className={quizAnswer === i ? (i === 0 ? 'correct' : 'incorrect') : ''} onClick={() => setQuizAnswer(i)}>{String.fromCharCode(65+i)}<span>{a}</span>{quizAnswer === i && i === 0 ? <Check size={17}/> : null}</button>)}</div>{quizAnswer !== null && <p className="feedback">{quizAnswer === 0 ? 'Correct — nice work!' : 'Not quite. Review the lesson summary and try again.'}</p>}</> : <p>Add a transcript to generate a quiz.</p>}</div>}
        </section>
        <footer className="footer-note"><span>✦</span> A little progress adds up. Keep showing up for yourself.</footer>
      </div>
    </main>
  </div>
}
