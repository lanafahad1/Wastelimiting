'use client';
import { Notice } from '@/components/ui/notice';
import { Button } from '@/components/ui/button';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page flex flex-col gap-4 py-16">
      <Notice tone="danger" title="This page could not be displayed.">Something went wrong on our side. Your data has not been changed.</Notice>
      <div><Button onClick={() => reset()}>Try again</Button></div>
    </div>
  );
}
