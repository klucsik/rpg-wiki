import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, Navigate } from 'react-router-dom'
import './App.css'
import { useUserStore } from './userStore';
import { usePageStore } from './pageStore';
import { TiptapEditor } from './TiptapEditor';
import RestrictedBlockView from './RestrictedBlockView';

function Home() {
  const { user, users, groups, login, logout, addGroup, assignUserToGroup } = useUserStore();
  const [newGroup, setNewGroup] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  return (
    <div>
      <h2>Welcome to RPG Wiki</h2>
      {user ? (
        <div>
          <p>Logged in as <b>{user.name}</b> ({user.groups.join(', ') || 'no groups'})</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div>
          <p>Login as:</p>
          {users.map(u => (
            <button key={u.id} onClick={() => login(u.id)}>{u.name}</button>
          ))}
        </div>
      )}
      <hr />
      <h3>Groups</h3>
      <ul>
        {groups.map(g => <li key={g}>{g}</li>)}
      </ul>
      <input value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="New group" />
      <button onClick={() => { if(newGroup) { addGroup(newGroup); setNewGroup(''); } }}>Add Group</button>
      <hr />
      <h3>Assign User to Group</h3>
      <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
        <option value="">Select user</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <select id="group-select">
        <option value="">Select group</option>
        {groups.map(g => <option key={g} value={g}>{g}</option>)}
      </select>
      <button onClick={() => {
        const group = (document.getElementById('group-select') as HTMLSelectElement).value;
        if(selectedUser && group) assignUserToGroup(selectedUser, group);
      }}>Assign</button>
      <hr />
      <h3>All Users</h3>
      <ul>
        {users.map(u => (
          <li key={u.id}>{u.name} ({u.groups.join(', ') || 'no groups'})</li>
        ))}
      </ul>
    </div>
  );
}

function RestrictedBlock({ children, allowedGroups, userGroups, title }: { children: React.ReactNode; allowedGroups: string[]; userGroups: string[]; title: string }) {
  // userGroups is passed to RestrictedBlockView as usergroups
  return (
    <RestrictedBlockView title={title} usergroups={allowedGroups}>
      {children}
    </RestrictedBlockView>
  );
}

function parseHtmlWithRestrictedBlocks(html: string, userGroups: string[]) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  function walk(node: ChildNode): React.ReactNode {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.dataset.blockType === 'restricted') {
        const allowedGroups = JSON.parse(el.dataset.usergroups || '[]');
        const title = el.getAttribute('data-title') || 'Restricted Block';
        return (
          <RestrictedBlock allowedGroups={allowedGroups} userGroups={userGroups} title={title}>
            {Array.from(el.childNodes).map((child, i) => <span key={i}>{walk(child)}</span>)}
          </RestrictedBlock>
        );
      }
      // Convert style attribute from string to object for React
      const attribs = Object.fromEntries(Array.from(el.attributes).map(a => {
        if (a.name === 'style') {
          // Convert style string to object
          const styleObj = Object.fromEntries(
            a.value.split(';').filter(Boolean).map(rule => {
              const [key, value] = rule.split(':').map(s => s && s.trim());
              // Convert kebab-case to camelCase
              const camelKey = key.replace(/-([a-z])/g, g => g[1].toUpperCase());
              return [camelKey, value];
            })
          );
          return ['style', styleObj];
        }
        return [a.name, a.value];
      }));
      // Special handling for void elements (like img, br, hr, etc.)
      const voidElements = new Set([
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
      ]);
      if (voidElements.has(el.tagName.toLowerCase())) {
        return React.createElement(
          el.tagName.toLowerCase(),
          attribs
        );
      }
      return React.createElement(
        el.tagName.toLowerCase(),
        attribs,
        Array.from(el.childNodes).map((child, i) => <span key={i}>{walk(child)}</span>)
      );
    } else if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    return null;
  }
  return Array.from(doc.body.firstChild!.childNodes).map((n, i) => <span key={i}>{walk(n)}</span>);
}

function PageViewer({ page }: { page: { title: string; content: string } }) {
  // Use Zustand user store for current user
  const user = useUserStore(state => state.user);
  const userGroups = user ? user.groups : [];
  return (
    <div>
      <h1>{page.title}</h1>
      <div>{parseHtmlWithRestrictedBlocks(page.content, userGroups)}</div>
    </div>
  );
}

function Pages() {
  const { pages, addPage, deletePage, updatePage } = usePageStore();
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  function startEdit(page: { id: string; title: string; content: string }) {
    setEditId(page.id);
    setEditTitle(page.title);
    setEditContent(page.content);
  }

  function saveEdit() {
    if (editId && editTitle && editContent) {
      updatePage(editId, { title: editTitle, content: editContent });
      setEditId(null);
      setEditTitle('');
      setEditContent('');
    }
  }

  return (
    <div>
      <h2>Pages</h2>
      <div style={{ display: 'flex', gap: 32 }}>
        <div>
          <h3>All Pages</h3>
          <ul>
            {pages.map(p => (
              <li key={p.id}>
                <Link to={`/pages/${encodeURIComponent(p.id)}`} style={{ fontWeight: undefined }}>{p.title}</Link>
                <button onClick={() => deletePage(p.id)} style={{ marginLeft: 8, color: 'red' }}>Delete</button>
                <button onClick={() => startEdit(p)} style={{ marginLeft: 8 }}>Edit</button>
              </li>
            ))}
          </ul>
          <h4>Add New Page</h4>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title" />
          <TiptapEditor value={newContent} onChange={setNewContent} />
          <button onClick={() => {
            if (newTitle && newContent) {
              addPage({ id: newTitle.toLowerCase().replace(/\s+/g, '-'), title: newTitle, content: newContent });
              setNewTitle('');
              setNewContent('');
            }
          }}>Add Page</button>
        </div>
        <div style={{ flex: 1 }}>
          {editId ? (
            <div>
              <h3>Edit Page</h3>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" />
              <TiptapEditor value={editContent} onChange={setEditContent} />
              <button onClick={saveEdit}>Save</button>
              <button onClick={() => setEditId(null)} style={{ marginLeft: 8 }}>Cancel</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PageRoute() {
  const { slug } = useParams();
  const page = usePageStore(state => state.pages.find(p => p.id === slug));
  if (!page) return <Navigate to="/pages" replace />;
  return <PageViewer page={page} />;
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
        <Route path="/pages/:slug" element={<PageRoute />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </Router>
  )
}

export default App
