"use client";
import React, { useEffect } from "react";
import PageEditor from "../../../PageEditor";
import { useRouter } from "next/navigation";
import { useUser } from "../../../userContext";

export default function CreatePage() {
  const { user } = useUser();
  const router = useRouter();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (user.group === "public") {
      router.push("/login");
      return;
    }
  }, [user, router]);

  // Show loading state while redirecting unauthenticated users
  if (user.group === "public") {
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
