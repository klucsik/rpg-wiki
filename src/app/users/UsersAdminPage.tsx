"use client";
import React, { useEffect, useState } from "react";

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ name: "", password: "", groupIds: [] as number[] });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editUser, setEditUser] = useState({ name: "", password: "", groupIds: [] as number[] });

  useEffect(() => {
    fetch("/api/users").then(res => res.json()).then(data => {
      setUsers(Array.isArray(data) ? data : []);
    });
    fetch("/api/groups").then(res => res.json()).then(setGroups);
  }, []);

  const handleCreate = async () => {
    if (!newUser.name || !newUser.password) return;
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      const created = await res.json();
      setUsers(u => Array.isArray(u) ? [...u, created] : [created]);
      setNewUser({ name: "", password: "", groupIds: [] });
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    setUsers(users.filter(u => u.id !== id));
  };

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setEditUser({
      name: user.name,
      password: "",
      groupIds: user.groups.map((g: any) => g.id),
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
      setEditingId(null);
      setEditUser({ name: "", password: "", groupIds: [] });
      fetch("/api/users").then(res => res.json()).then(setUsers);
    }
  };

  return (
    <div className="bg-gray-900/80 rounded-lg p-8 shadow-lg border border-gray-800 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Manage Users</h2>
      <div className="mb-6">
        <input className="px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm mb-1 mr-2" placeholder="Username" value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} />
        <input className="px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm mb-1 mr-2" placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} />
        <select multiple className="px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm mb-1 mr-2" value={newUser.groupIds} onChange={e => setNewUser(u => ({ ...u, groupIds: Array.from(e.target.selectedOptions, o => Number(o.value)) }))}>
          {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button className="bg-green-700 text-white px-3 py-1 rounded font-semibold shadow hover:bg-green-800 transition text-sm" onClick={handleCreate}>Add User</button>
      </div>
      <table className="w-full text-indigo-100">
        <thead>
          <tr>
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
                <select multiple className="px-2 py-1 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-sm" value={editUser.groupIds} onChange={e => setEditUser(u => ({ ...u, groupIds: Array.from(e.target.selectedOptions, o => Number(o.value)) }))}>
                  {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              ) : user.groups.map((g: any) => g.name).join(", ")}</td>
              <td>
                {editingId === user.id ? (
                  <>
                    <button className="bg-indigo-700 text-white px-2 py-1 rounded mr-2" onClick={handleUpdate}>Save</button>
                    <button className="bg-gray-700 text-white px-2 py-1 rounded" onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="bg-yellow-700 text-white px-2 py-1 rounded mr-2" onClick={() => handleEdit(user)}>Edit</button>
                    <button className="bg-red-700 text-white px-2 py-1 rounded" onClick={() => handleDelete(user.id)}>Delete</button>
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
