"use client";

import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import React, { useState } from "react";
import UserMenu from "../UserMenu";
import { UserProvider } from "../userContext";
import { GroupsProvider } from "../groupsContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GroupsProvider>
          <UserProvider>
            <header className="w-full bg-gray-900 border-b border-gray-800 shadow flex items-center justify-between px-6 py-3 sticky top-0 z-50">
              <nav className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-indigo-300 font-bold text-lg hover:text-indigo-100 transition"
                >
                  RPG Wiki
                </Link>
                <Link
                  href="/pages"
                  className="text-indigo-300 hover:text-indigo-100 transition"
                >
                  Pages
                </Link>
                <Link
                  href="/groups"
                  className="text-indigo-300 hover:text-indigo-100 transition"
                >
                  Groups
                </Link>
              </nav>
              <UserMenu />
            </header>
            <main className="w-full flex-1 min-h-0">{children}</main>
          </UserProvider>
        </GroupsProvider>
      </body>
    </html>
  );
}
