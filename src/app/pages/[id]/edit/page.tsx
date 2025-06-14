// This edit route is now deprecated. All editing is handled in-place in PagesView.tsx.
// You can safely remove this file, or leave this redirect for legacy links.

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

export default function DeprecatedEditPage() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    // Redirect to the main page view for this page
    router.replace(`/pages/${params?.id}`);
  }, [params, router]);
  return null;
}
