'use client';
import * as React from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

/** "Copy citation": copies the text, or selects it when the clipboard is not available. */
export function CopyCitation({ text, targetId }: { text: string; targetId: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Citation copied.');
    } catch {
      const el = document.getElementById(targetId);
      const sel = window.getSelection();
      if (el && sel) { const r = document.createRange(); r.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(r); }
      toast('The citation is selected: copy it with your keyboard or the context menu.', { tone: 'warn' });
    }
  };
  return <Button variant="outline" size="sm" onClick={copy} className="w-fit"><Copy aria-hidden />Copy citation</Button>;
}
