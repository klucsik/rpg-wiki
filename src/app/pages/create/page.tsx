"use client";
import React from "react";
import PageEditor from "../../../PageEditor";
import { useRouter } from "next/navigation";
import { useUser } from "../../../userContext";

export default function CreatePage() {
  const { user } = useUser();
  const router = useRouter();
  if (user.group === "public") return null;
  return (
        <PageEditor
          mode="create"
          onSuccess={(page) => router.push(`/pages/${page.id}`)}
          onCancel={() => router.push("/pages")}
        />
  );
}
