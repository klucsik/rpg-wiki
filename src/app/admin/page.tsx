"use client";
import { useSession, signOut, signIn } from "next-auth/react";
import Link from "next/link";
import React from "react";
import GroupsAdminPage from "../groups/page";
import UsersAdminPage from "../users/UsersAdminPage";
import { BackupSettingsPage } from "../../features/backup";

function AdminSidebar() {
  return (
    <aside className="w-64 min-w-56 max-w-xs bg-gray-900/90 border-r border-gray-800 h-full p-6 flex flex-col gap-4 sticky top-0">
      <h2 className="text-xl font-bold text-indigo-200 mb-2">Admin Menu</h2>
      <nav className="flex flex-col gap-2">
        <a href="#users" className="text-indigo-300 hover:text-indigo-100 transition font-medium">User Management</a>
        <a href="#groups" className="text-indigo-300 hover:text-indigo-100 transition font-medium">Group Management</a>
        <a href="#backup" className="text-indigo-300 hover:text-indigo-100 transition font-medium">Git Backup Settings</a>
        <a href="#settings" className="text-indigo-300 hover:text-indigo-100 transition font-medium">Site Settings</a>
        <a href="#session-info" className="text-indigo-300 hover:text-indigo-100 transition font-medium">Session Info</a>
        {/* Add more admin options here as needed */}
      </nav>
      
      <div className="mt-auto pt-4 border-t border-gray-700 space-y-2">
        <Link 
          href="/" 
          className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition font-medium"
        >
          ← Back to Wiki
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition font-medium"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-indigo-200 mb-4">Loading...</h1>
          <p className="text-indigo-100">Please wait while we verify your permissions.</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-lg text-center">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Unauthorized</h1>
          <p className="text-indigo-100 mb-4">You must be logged in to access the admin page.</p>
          <button 
            onClick={() => signIn()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Check if user has admin permissions
  const isAdmin = session.user.groups?.includes('admin');
  
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-lg text-center">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Unauthorized</h1>
          <p className="text-indigo-100 mb-2">You do not have permission to access the admin page.</p>
          <p className="text-indigo-100/80 text-sm">Current groups: {session.user.groups?.join(', ') || 'None'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-indigo-100 mb-2">Admin Dashboard</h1>
          <p className="text-indigo-300">Welcome back, <span className="font-semibold">{session.user.username}</span>!</p>
        </div>
        
        <section id="users" className="mb-12">
          <h1 className="text-3xl font-bold text-indigo-200 mb-6">User Management</h1>
          <UsersAdminPage />
        </section>
        <section id="groups" className="mb-12">
          <h1 className="text-3xl font-bold text-indigo-200 mb-6">Group Management</h1>
          <GroupsAdminPage />
        </section>
        <section id="backup" className="mb-12">
          <h1 className="text-3xl font-bold text-indigo-200 mb-6">Git Backup Settings</h1>
          <BackupSettingsPage />
        </section>
        <section id="settings">
          <h1 className="text-3xl font-bold text-indigo-200 mb-6">Site Settings</h1>
          <p className="text-indigo-100 mb-4">(Coming soon: site-wide settings and options.)</p>
        </section>
        
        <section id="session-info" className="mb-12">
          <h1 className="text-3xl font-bold text-indigo-200 mb-6">Session Information</h1>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-indigo-300 mb-4">Current User Session</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-indigo-400 font-medium">Username:</span> <span className="text-indigo-100">{session.user.username}</span></p>
              <p><span className="text-indigo-400 font-medium">Email:</span> <span className="text-indigo-100">{session.user.email}</span></p>
              <p><span className="text-indigo-400 font-medium">Groups:</span> <span className="text-indigo-100">{session.user.groups?.join(', ') || 'None'}</span></p>
              <p><span className="text-indigo-400 font-medium">All Groups:</span> <span className="text-indigo-100">{session.user.groups?.join(', ') || 'None'}</span></p>
              <p><span className="text-indigo-400 font-medium">User ID:</span> <span className="text-indigo-100 font-mono text-xs">{session.user.id}</span></p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
