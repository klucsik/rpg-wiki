"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../../userContext";
import Link from "next/link";

export default function LoginPage() {
  const { setUser } = useUser();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("Invalid username or password");
        return;
      }
      const user = await res.json();
      setUser(user);
      // Persist login for 1 day
      window.localStorage.setItem("rpgwiki_user", JSON.stringify(user));
      window.localStorage.setItem("rpgwiki_user_expiry", (Date.now() + 86400000).toString());
      router.replace("/pages");
    } catch {
      setError("Login failed");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <form onSubmit={handleLogin} className="bg-gray-900/90 border border-gray-800 rounded-lg p-10 shadow-lg w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-indigo-200 mb-4 text-center">Login</h1>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="px-4 py-2 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-lg"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="px-4 py-2 rounded border border-gray-700 bg-gray-900 text-indigo-100 text-lg"
          required
        />
        {error && <div className="text-red-400 text-center">{error}</div>}
        <button
          type="submit"
          className="bg-indigo-600 text-white font-bold px-6 py-2 rounded-lg shadow hover:bg-indigo-700 transition text-lg border border-indigo-700"
        >
          Login
        </button>
        <div className="text-center mt-2">
          <span className="text-indigo-300">Don&apos;t have an account? </span>
          <Link href="/register" className="text-indigo-400 hover:underline">Register</Link>
        </div>
      </form>
    </div>
  );
}
