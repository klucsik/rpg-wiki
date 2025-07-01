"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import { UserProvider } from "../userContext";
import { GroupsProvider } from "../groupsContext";
import HeaderNav from "../HeaderNav";
import { AuthProvider } from "../components/AuthProvider";

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
        <AuthProvider>
          <GroupsProvider>
            <UserProvider>
              <HeaderNav />
              <main className="w-full flex-1 min-h-0">{children}</main>
            </UserProvider>
          </GroupsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
