"use client";
import PagesView from "../../../PagesView";
import { useParams } from "next/navigation";

export default function PageIdRoute() {
  const params = useParams();
  const id = params?.id ? Number(params.id) : null;
  return <PagesView initialId={id} />;
}
