"use client";
import React, { useEffect, useState } from "react";

type Group = { id: number; name: string };
type User = { 
  id: string; 
  name: string; 
  username: string; 
  email?: string;
  groups: Group[] 
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [newUser, setNewUser] = useState<{ 
    name: string; 
    username: string; 
    password: string; 
    groupIds: number[] 
  }>({ name: "", username: "", password: "", groupIds: [] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<{ 
    name: string; 
    username: string; 
    password: string; 
    groupIds: number[] 
  }>({ name: "", username: "", password: "", groupIds: [] });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users").then(res => res.json()).then(data => {
      console.log('Users loaded:', data);
      setUsers(Array.isArray(data) ? data : []);
    });
    fetch("/api/groups").then(res => res.json()).then(data => {
      console.log('Groups loaded:', data);
      setGroups(Array.isArray(data) ? data : []);
    });
  }, []);

  const handleCreate = async () => {
    if (!newUser.username || !newUser.password) return;
    
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    
    if (res.ok) {
      const created = await res.json();
      setUsers(u => Array.isArray(u) ? [...u, created] : [created]);
      setNewUser({ name: "", username: "", password: "", groupIds: [] });
    } else {
      const error = await res.json();
      alert(`Error creating user: ${error.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete(id);
  };
  
  const confirmDeleteUser = async (id: string) => {
    // Prevent deletion of admin user (by username)
    const user = users.find(u => u.id === id);
    if (user && user.username === 'admin') {
      setConfirmDelete(null);
      return;
    }
    
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers(users.filter(u => u.id !== id));
    } else {
      const error = await res.json();
      alert(`Error deleting user: ${error.error}`);
    }
    setConfirmDelete(null);
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditUser({
      name: user.name,
      username: user.username,
      password: "",
      groupIds: user.groups.map((g: Group) => g.id),
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const res = await fetch(`/api/users/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editUser),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers(users => users.map(u => u.id === editingId ? updated : u));
      setEditingId(null);
      setEditUser({ name: "", username: "", password: "", groupIds: [] });
    } else {
      const error = await res.json();
      alert(`Error updating user: ${error.error}`);
    }
  };

  return (
    <div className="bg-gray-900/80 rounded-lg p-8 shadow-lg border border-gray-800 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Manage Users</h2>
      <div className="mb-6">
        <input 
          className="px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm mb-1 mr-2 block mb-2" 
          placeholder="Display Name" 
          value={newUser.name} 
          onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} 
        />
        <input 
          className="px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm mb-1 mr-2 block mb-2" 
          placeholder="Username" 
          value={newUser.username} 
          onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} 
        />
        <input 
          className="px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm mb-1 mr-2 block mb-2" 
          placeholder="Password" 
          type="password" 
          value={newUser.password} 
          onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} 
        />
        <select 
          multiple 
          className="px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm mb-1 mr-2 block mb-2"
          value={newUser.groupIds.map(String)}
          onChange={e => setNewUser(u => ({ ...u, groupIds: Array.from(e.target.selectedOptions, o => Number(o.value)) }))}>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button className="bg-green-700 text-white px-3 py-1 rounded font-semibold shadow hover:bg-green-800 transition text-sm" onClick={handleCreate}>Add User</button>
      </div>
      <table className="w-full text-indigo-100">
        <thead>
          <tr>
            <th className="text-left">Display Name</th>
            <th className="text-left">Username</th>
            <th>Groups</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{editingId === user.id ? (
                <input className="px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm" value={editUser.name} onChange={e => setEditUser(u => ({ ...u, name: e.target.value }))} />
              ) : user.name}</td>
              <td>{editingId === user.id ? (
                <input className="px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm" value={editUser.username} onChange={e => setEditUser(u => ({ ...u, username: e.target.value }))} />
              ) : user.username}</td>
              <td>{editingId === user.id ? (
                <div className="space-y-1">
                  <input 
                    className="px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm block w-full" 
                    placeholder="New password (leave empty to keep current)" 
                    type="password"
                    value={editUser.password} 
                    onChange={e => setEditUser(u => ({ ...u, password: e.target.value }))} 
                  />
                  <select multiple className="px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm w-full" value={editUser.groupIds.map(String)} onChange={e => setEditUser(u => ({ ...u, groupIds: Array.from(e.target.selectedOptions, o => Number(o.value)) }))}>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              ) : user.groups.map((g) => g.name).join(", ")}</td>
              <td>
                {editingId === user.id ? (
                  <>
                    <button className="bg-indigo-700 text-white px-2 py-1 rounded mr-2" onClick={handleUpdate}>Save</button>
                    <button className="bg-gray-700 text-white px-2 py-1 rounded" onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="bg-yellow-700 text-white px-2 py-1 rounded mr-2" onClick={() => handleEdit(user)}>Edit</button>
                    <button
                      className="px-2 py-1 text-xs rounded bg-red-700 hover:bg-red-800 text-white font-semibold shadow border border-red-900"
                      style={{ minWidth: 0 }}
                      onClick={() => handleDelete(user.id)}
                    >
                      Delete
                    </button>
                    {confirmDelete === user.id && (
                      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-lg text-center">
                          <h2 className="text-lg font-bold text-red-400 mb-4">
                            {user.username === 'admin'
                              ? 'The admin user cannot be deleted.'
                              : `Are you sure you want to delete user "${user.name}" (${user.username})?`}
                          </h2>
                          <div className="flex gap-4 justify-center">
                            {user.username !== 'admin' && (
                              <button
                                className="px-4 py-1 rounded bg-red-700 hover:bg-red-800 text-white font-semibold shadow border border-red-900"
                                onClick={() => confirmDeleteUser(user.id)}
                              >
                                Yes, Delete
                              </button>
                            )}
                            <button
                              className="px-4 py-1 rounded bg-gray-700 hover:bg-gray-800 text-white font-semibold shadow border border-gray-900"
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
