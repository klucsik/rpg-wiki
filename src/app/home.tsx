"use client";
import React, { useState } from "react";

const DEMO_USERS = [
  { id: '1', name: 'Alice', groups: ['admins'] },
  { id: '2', name: 'Bob', groups: ['editors'] },
  { id: '3', name: 'Charlie', groups: [] },
];
const DEMO_GROUPS = ['admins', 'editors', 'players'];

export default function Home() {
  const [user, setUser] = useState<{ id: string; name: string; groups: string[] } | null>(null);
  const [users, setUsers] = useState(DEMO_USERS);
  const [groups, setGroups] = useState(DEMO_GROUPS);
  const [newGroup, setNewGroup] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  const login = (userId: string) => {
    const u = users.find(u => u.id === userId) || null;
    setUser(u);
  };
  const logout = () => setUser(null);
  const addGroup = (group: string) => setGroups(g => g.includes(group) ? g : [...g, group]);
  const assignUserToGroup = (userId: string, group: string) => setUsers(us => us.map(u => u.id === userId && !u.groups.includes(group) ? { ...u, groups: [...u.groups, group] } : u));

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
