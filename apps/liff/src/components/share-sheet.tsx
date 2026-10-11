'use client';
import { Copy, MessageCircle, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  canShareNatively,
  copyShareText,
  shareElsewhere,
  shareToLine,
  toastShareResult,
  type ShareResult,
} from '@/lib/share';

/**
 * Share choices: a LINE card (friend/group picker), the phone's share sheet for other apps,
 * or copy the text. People who open the link still need LINE — the app signs in with it.
 */
export function ShareSheet({
  open,
  onClose,
  title,
  lineMessage,
  url,
  text,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  lineMessage: object;
  url: string;
  text: string;
}) {
  const [native, setNative] = useState(false);
  useEffect(() => setNative(canShareNatively()), []);

  async function run(share: () => Promise<ShareResult>) {
    onClose();
    toastShareResult(await share());
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Option
            icon={<MessageCircle className="h-5 w-5 text-[#06C755]" />}
            label="ส่งใน LINE"
            hint="ส่งเป็นการ์ดเข้าแชทหรือกลุ่ม"
            onClick={() => run(() => shareToLine(lineMessage, url))}
          />
          {native && (
            <Option
              icon={<Share2 className="h-5 w-5 text-amber-600" />}
              label="แชร์ไปแอปอื่น…"
              hint="Messenger, Discord, IG และแอปอื่นในเครื่อง"
              onClick={() => run(() => shareElsewhere(text))}
            />
          )}
          <Option
            icon={<Copy className="h-5 w-5 text-stone-500" />}
            label="คัดลอกข้อความ + ลิงก์"
            hint="ไปวางที่ไหนก็ได้"
            onClick={() => run(() => copyShareText(text))}
          />
        </div>
        <p className="text-center text-[11px] text-muted-foreground">คนที่กดลิงก์ต้องมี LINE ถึงจะลงชื่อได้</p>
      </DialogContent>
    </Dialog>
  );
}

function Option({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition hover:bg-amber-50 active:scale-[0.98]"
    >
      {icon}
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
