import { Suspense } from "react";
import { ConversacionesClient } from "./conversaciones-client";

export default function ConversacionesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>}>
      <ConversacionesClient />
    </Suspense>
  );
}
