"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Pages from "./pages";
import { authenticatedFetch } from "../lib/api/apiHelpers";

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Check if there's a default page set
    authenticatedFetch("/api/admin/settings")
      .then((res) => {
        if (!res.ok) {
          // If settings fetch fails, show normal page list
          setLoading(false);
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.defaultPageId) {
          // Redirect to the default page
          setShouldRedirect(true);
          router.push(`/pages/${data.defaultPageId}`);
        } else {
          // No default page, show the page list
          setLoading(false);
        }
      })
      .catch(() => {
        // On error, show normal page list
        setLoading(false);
      });
  }, [router]);

  if (loading || shouldRedirect) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-indigo-400">Loading...</div>
      </div>
    );
  }

  return <Pages />;
}
