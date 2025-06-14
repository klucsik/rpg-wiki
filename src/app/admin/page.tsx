"use client";
import { useUser } from "../../userContext";
import React from "react";
import GroupsAdminPage from "../groups/page";

function AdminSidebar() {
  return (
    <aside className="w-64 min-w-56 max-w-xs bg-gray-900/90 border-r border-gray-800 h-full p-6 flex flex-col gap-4 sticky top-0">
      <h2 className="text-xl font-bold text-indigo-200 mb-2">Admin Menu</h2>
      <nav className="flex flex-col gap-2">
        <a href="#users" className="text-indigo-300 hover:text-indigo-100 transition font-medium">User Management</a>
        <a href="#groups" className="text-indigo-300 hover:text-indigo-100 transition font-medium">Group Management</a>
        <a href="#settings" className="text-indigo-300 hover:text-indigo-100 transition font-medium">Site Settings</a>
        {/* Add more admin options here as needed */}
      </nav>
    </aside>
  );
}

export default function AdminPage() {
  const { user } = useUser();
  if (user?.group !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-lg text-center">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Unauthorized</h1>
          <p className="text-indigo-100 mb-2">You do not have permission to access the admin page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <section id="users" className="mb-12">
          <h1 className="text-3xl font-bold text-indigo-200 mb-6">User Management</h1>
          <p className="text-indigo-100 mb-4">(Coming soon: manage users here.)</p>
        </section>
        <section id="groups" className="mb-12">
          <h1 className="text-3xl font-bold text-indigo-200 mb-6">Group Management</h1>
          <GroupsAdminPage />
        </section>
        <section id="settings">
          <h1 className="text-3xl font-bold text-indigo-200 mb-6">Site Settings</h1>
          <p className="text-indigo-100 mb-4">(Coming soon: site-wide settings and options.)</p>
        </section>
      </main>
    </div>
  );
}
