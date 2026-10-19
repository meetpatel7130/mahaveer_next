"use client";

import dynamic from "next/dynamic";

const LegacyApplication = dynamic(() => import("../../legacy/Application"), { ssr: false });

export default function ApplicationPage() {
  return <LegacyApplication />;
}
