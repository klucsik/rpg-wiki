"use client";
import React, { useEffect } from "react";
import { PageEditor } from "../../../components/editor";
import { useRouter } from "next/navigation";
import { useUser, isUserAuthenticated } from "../../../features/auth";

export default function CreatePage() {
  const { user } = useUser();
  const router = useRouter();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isUserAuthenticated(user)) {
      router.push("/auth/signin");
      return;
    }
  }, [user, router]);

  // Show loading state while redirecting unauthenticated users
  if (!isUserAuthenticated(user)) {
    return <div className="text-indigo-400 p-8">Redirecting to login...</div>;
  }

  return (
    <PageEditor
      mode="create"
      onSuccess={(page) => {
        if (page && page.id) router.push(`/pages/${page.id}`);
        else router.push("/pages");
      }}
      onCancel={() => router.push("/pages")}
    />
  );
}
