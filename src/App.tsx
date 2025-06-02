import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'

function Home() {
  return <h2>Welcome to RPG Wiki</h2>
}

function Pages() {
  return <h2>Pages List (to be implemented)</h2>
}

function Editor() {
  return <h2>Editor (to be implemented)</h2>
}

function App() {
  return (
    <Router>
      <nav style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <Link to="/">Home</Link>
        <Link to="/pages">Pages</Link>
        <Link to="/editor">Editor</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pages" element={<Pages />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </Router>
  )
}

export default App
