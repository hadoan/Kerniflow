import React, { Suspense } from "react";
import { Chat } from "@/shared/components/Chat";

// Simple wrapper to render the shared Chat UI. We keep a Suspense boundary
// to mirror the pattern from the provided example.
export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Chat />
      </div>
    </Suspense>
  );
}
