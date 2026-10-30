import { Suspense } from "react";
import { InboxView } from "./_components/inbox-view";

export default function InboxPage() {
  // InboxView đọc ?c= bằng useSearchParams
  return (
    <Suspense>
      <InboxView />
    </Suspense>
  );
}
