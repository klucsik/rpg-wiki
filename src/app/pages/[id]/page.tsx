"use client";
import { PagesView } from "../../../features/pages";
import { useParams } from "next/navigation";

export default function PageIdRoute() {
  const params = useParams();
  const id = params?.id ? Number(params.id) : null;
  return <PagesView initialId={id} />;
}
