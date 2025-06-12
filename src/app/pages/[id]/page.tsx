"use client";
import { useParams } from "next/navigation";
import PageViewer from "../pageviewer";

export default function PageRoute() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  return <PageViewer pageId={id} />;
}
