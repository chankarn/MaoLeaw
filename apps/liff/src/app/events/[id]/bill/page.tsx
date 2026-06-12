// File: apps/liff/src/app/events/[id]/bill/page.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Clock, Copy, Download, Receipt, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import generatePayload from 'promptpay-qr';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ErrorState } from '@/components/error-state';
import { useClaimPaid, useMyBill } from '@/hooks/use-bill';
import { BANK_OPTIONS, type MyBillDto } from '@maoleaw/shared';
import { ApiError } from '@/lib/api';
import { cn, formatBaht } from '@/lib/utils';

export default function MyBillPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useMyBill(id);
  const { mutateAsync: claimPaid, isPending: claiming } = useClaimPaid(id);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [note, setNote] = useState('');
  // Fallback preview: full-size QR the user can long-press to save when the
  // WebView blocks programmatic downloads / file sharing.
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    if (data.payment.type === 'PROMPTPAY') {
      const payload = generatePayload(data.payment.promptpay!.id, { amount: data.payment.amount });
      QRCode.toCanvas(canvasRef.current, payload, { width: 240, margin: 1, color: { dark: '#1c1917' } }).catch(
        (err) => console.error('QR render failed', err),
      );
    }
  }, [data]);

  if (isLoading) return <BillSkeleton />;
  if (isError || !data) {
    const is404 = error instanceof ApiError && error.problem.status === 404;
    if (is404) return <BillNotFound onBack={() => router.push('/')} />;
    return <ErrorState onRetry={refetch} />;
  }

  const { bill, myShare, payment, lineItems } = data;
  const isPaid = myShare.paymentStatus === 'PAID';
  const isClaimed = myShare.paymentStatus === 'CLAIMED';

  async function handleSubmitClaim() {
    try {
      await claimPaid({ note: note.trim() || null });
      toast.success('แจ้งโอนแล้ว รอ admin ตรวจสอบ');
      setClaimOpen(false);
      setNote('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ไม่สามารถส่งได้');
    }
  }

  async function downloadQr() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1) Try the native share sheet with the actual PNG file. Inside the LINE
    //    in-app browser this is the only reliable "save to Photos" path —
    //    the <a download> trick is ignored by the iOS/Android WebView.
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    );
    if (blob) {
      const file = new File([blob], `maoleaw-qr-${id}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: bill.name });
          return;
        } catch {
          /* user cancelled — fall through to preview */
        }
      }
    }

    // 2) Fallback: show the QR full-size so the user can long-press → save.
    setQrPreview(canvas.toDataURL('image/png'));
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success('คัดลอกแล้ว');
  }

  return (
    <main
      className="mx-auto min-h-screen max-w-[480px] bg-amber-50 pb-32"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(217, 119, 6, 0.12) 1px, transparent 0)',
        backgroundSize: '18px 18px',
      }}
    >
      {/* ─── Hero ─── */}
      <header className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary via-amber-500 to-amber-400 px-5 pb-10 pt-5 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 left-12 h-28 w-28 rounded-full bg-white/10" />

        <div className="relative flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="rounded-full p-2 text-white/90 hover:bg-white/10"
            aria-label="กลับ"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Receipt className="h-3.5 w-3.5" />
            ใบเสร็จ
          </div>
        </div>

        <div className="relative mt-3 text-center">
          <h1 className="text-2xl font-bold leading-tight">{bill.name}</h1>
        </div>
      </header>

      {/* ─── Receipt card (with scallop top) ─── */}
      <section className="relative -mt-8 px-4">
        <div className="relative">
          {/* Scallop top edge */}
          <svg
            className="absolute -top-0 left-0 right-0 h-3 w-full"
            viewBox="0 0 400 12"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,12 L0,0 Q5,0 5,6 T15,12 Q20,12 20,6 T30,0 Q35,0 35,6 T45,12 Q50,12 50,6 T60,0 Q65,0 65,6 T75,12 Q80,12 80,6 T90,0 Q95,0 95,6 T105,12 Q110,12 110,6 T120,0 Q125,0 125,6 T135,12 Q140,12 140,6 T150,0 Q155,0 155,6 T165,12 Q170,12 170,6 T180,0 Q185,0 185,6 T195,12 Q200,12 200,6 T210,0 Q215,0 215,6 T225,12 Q230,12 230,6 T240,0 Q245,0 245,6 T255,12 Q260,12 260,6 T270,0 Q275,0 275,6 T285,12 Q290,12 290,6 T300,0 Q305,0 305,6 T315,12 Q320,12 320,6 T330,0 Q335,0 335,6 T345,12 Q350,12 350,6 T360,0 Q365,0 365,6 T375,12 Q380,12 380,6 T390,0 Q395,0 395,6 T400,12 Z"
              fill="white"
            />
          </svg>

          <div className="relative rounded-b-3xl rounded-t-none bg-white px-6 pb-6 pt-6 shadow-md">
            {/* Stamp if paid */}
            {isPaid && (
              <div className="pointer-events-none absolute right-4 top-4 rotate-12 select-none rounded-md border-2 border-emerald-600 px-3 py-1 text-emerald-600 opacity-80">
                <p className="text-sm font-bold tracking-wider">PAID ✓</p>
              </div>
            )}

            <p className="text-center text-xs uppercase tracking-wider text-muted-foreground">
              ยอดที่ต้องจ่าย
            </p>
            <p className="mt-2 text-center font-mono text-5xl font-bold tabular-nums text-stone-900">
              {formatBaht(myShare.amount)}
            </p>

            {/* Status pill */}
            <div className="mt-3 text-center">
              {isPaid ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  ชำระแล้ว (admin confirm)
                </span>
              ) : isClaimed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                  <Clock className="h-3.5 w-3.5" />
                  รอ admin ตรวจสอบ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  ⏳ รอชำระ
                </span>
              )}
            </div>

            {/* Claim note shown if claimed */}
            {isClaimed && myShare.claimedAt && (
              <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/50 p-3 text-xs">
                <p className="font-medium text-sky-900">
                  📨 แจ้งโอนเมื่อ {new Date(myShare.claimedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
                {myShare.claimNote && (
                  <p className="mt-1 text-sky-800">หมายเหตุ: {myShare.claimNote}</p>
                )}
              </div>
            )}

            {/* Dashed divider */}
            <div className="relative my-5">
              <div className="border-t border-dashed border-stone-300" />
              <div className="absolute -left-9 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-amber-50" />
              <div className="absolute -right-9 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-amber-50" />
            </div>

            {/* Breakdown — each bucket lists the items this member pays into */}
            <div className="space-y-3.5 text-sm">
              <BreakGroup
                icon="🍽️"
                label="ค่าอาหาร / หารทุกคน"
                total={myShare.sharedAmount}
                items={lineItems.filter((l) => l.bucket === 'shared')}
              />
              <BreakGroup
                icon="🍻"
                label="ค่าเครื่องดื่ม"
                total={myShare.drinkAmount}
                items={lineItems.filter((l) => l.bucket === 'drink')}
              />
              <BreakGroup
                icon="🧊"
                label="ค่ามิกเซอร์"
                total={myShare.mixerAmount}
                items={lineItems.filter((l) => l.bucket === 'mixer')}
              />
              <div className="flex items-center justify-between border-t border-stone-200 pt-2.5">
                <span className="font-semibold">รวมทั้งหมด</span>
                <span className="font-mono text-lg font-bold tabular-nums text-primary">
                  {formatBaht(myShare.amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Payment section ─── */}
      <section className="px-4 pt-5">
        {payment.type === 'PROMPTPAY' ? (
          <div className="rounded-3xl bg-white p-6 shadow-md">
            <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              สแกน QR เพื่อจ่าย
            </h2>

            {/* QR with corner brackets */}
            <div className="relative mx-auto h-64 w-64">
              <CornerBracket position="tl" />
              <CornerBracket position="tr" />
              <CornerBracket position="bl" />
              <CornerBracket position="br" />
              <div className="absolute inset-3 flex items-center justify-center rounded-xl bg-white">
                <canvas ref={canvasRef} className="h-full w-full" />
              </div>
            </div>

            {/* PromptPay ID + copy */}
            <div className="mt-5 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-amber-700">PromptPay</p>
                <p className="font-mono text-sm font-semibold text-stone-900">{payment.promptpay!.id}</p>
              </div>
              <button
                onClick={() => copyText(payment.promptpay!.id)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-600 hover:text-primary"
                aria-label="คัดลอก"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={downloadQr}>
                <Download className="mr-2 h-4 w-4" />
                บันทึก QR
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: bill.name,
                        text: `ยอด ${formatBaht(myShare.amount)} โอนผ่าน PromptPay ${payment.promptpay!.id}`,
                      });
                    } catch {
                      /* user cancelled */
                    }
                  } else {
                    copyText(payment.promptpay!.id);
                  }
                }}
              >
                <Share2 className="mr-2 h-4 w-4" />
                แชร์
              </Button>
            </div>
          </div>
        ) : (
          <BankCard payment={payment} onCopy={copyText} />
        )}
      </section>

      {/* ─── Sticky CTA (raised) ─── */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] rounded-t-3xl bg-white px-4 pb-5 pt-4"
        style={{
          boxShadow: '0 -8px 24px -8px rgba(0,0,0,0.12), 0 -2px 6px -2px rgba(0,0,0,0.06)',
        }}
      >
        <Button
          size="lg"
          className={cn(
            'w-full shadow-md',
            isPaid && 'bg-emerald-600 hover:bg-emerald-700',
            isClaimed && 'bg-sky-600 hover:bg-sky-700',
          )}
          disabled={isPaid}
          onClick={() => setClaimOpen(true)}
        >
          {isPaid
            ? '✓ ชำระเรียบร้อย'
            : isClaimed
              ? '📨 แจ้งโอนแล้ว · แก้ไข'
              : '✅ ฉันโอนแล้ว'}
        </Button>
      </div>

      {/* QR save fallback — long-press to save when sharing isn't available */}
      <Dialog open={!!qrPreview} onOpenChange={(open) => !open && setQrPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึก QR</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              กดค้างที่รูป แล้วเลือก “บันทึกรูปภาพ” เพื่อเซฟลงเครื่อง
            </p>
            {qrPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrPreview}
                alt="PromptPay QR"
                className="mx-auto h-64 w-64 rounded-xl border border-stone-200"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrPreview(null)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claim Dialog */}
      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แจ้งโอนเงิน</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              หลังกด admin จะเห็นว่าคุณแจ้งโอนแล้ว และจะตรวจสอบในบัญชีก่อนยืนยัน
            </p>
            <div className="rounded-xl bg-amber-50 p-3 text-sm">
              <p className="text-xs text-muted-foreground">ยอด</p>
              <p className="font-mono text-xl font-bold text-primary">
                {formatBaht(myShare.amount)}
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-800">
              <span className="mt-0.5 shrink-0 text-base">📸</span>
              <p>อย่าลืม<span className="font-semibold">ส่งรูปสลิปมาในแชท LINE OA</span> ด้วยนะ เพื่อให้ admin ตรวจสอบได้เร็วขึ้น</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">หมายเหตุ (ถ้ามี)</Label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                placeholder="เช่น โอนผ่าน TrueMoney, ref 12345, โอนตอน 21:30"
                rows={3}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-right text-xs text-muted-foreground">{note.length}/200</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSubmitClaim} disabled={claiming}>
              {claiming ? 'กำลังส่ง…' : 'แจ้งโอน'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function BreakGroup({
  icon,
  label,
  total,
  items,
}: {
  icon: string;
  label: string;
  total: number;
  items: MyBillDto['lineItems'];
}) {
  if (total <= 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-medium text-stone-700">
          <span className="text-base">{icon}</span>
          {label}
        </span>
        <span className="font-mono tabular-nums font-medium">{formatBaht(total)}</span>
      </div>
      {items.length > 0 && (
        <ul className="mt-1.5 space-y-1 pl-7 text-xs text-muted-foreground">
          {items.map((it, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <span className="truncate">{it.name}</span>
              <span className="shrink-0 font-mono tabular-nums">{formatBaht(it.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CornerBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base = 'absolute h-6 w-6 border-primary';
  const map = {
    tl: 'top-0 left-0 border-l-[3px] border-t-[3px] rounded-tl-xl',
    tr: 'top-0 right-0 border-r-[3px] border-t-[3px] rounded-tr-xl',
    bl: 'bottom-0 left-0 border-l-[3px] border-b-[3px] rounded-bl-xl',
    br: 'bottom-0 right-0 border-r-[3px] border-b-[3px] rounded-br-xl',
  };
  return <div className={cn(base, map[position])} />;
}

function BankCard({
  payment,
  onCopy,
}: {
  payment: Extract<MyBillDto['payment'], { type: 'BANK' }>;
  onCopy: (text: string) => void;
}) {
  const bank = BANK_OPTIONS.find((b) => b.value === payment.bank.code);
  return (
    <div className="rounded-3xl bg-white p-6 shadow-md">
      <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        โอนเงินผ่านธนาคาร
      </h2>

      <div className="rounded-2xl border-2 border-stone-100 p-5 text-center">
        <div
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow"
          style={{ backgroundColor: bank?.color ?? '#78716c' }}
        >
          🏦
        </div>
        <p className="font-semibold text-stone-800">{bank?.label ?? payment.bank.code}</p>
        <p className="mt-0.5 font-mono text-xs text-stone-500">{bank?.short ?? payment.bank.code}</p>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-stone-500">เลขบัญชี</p>
            <p className="font-mono text-base font-semibold text-stone-900">{payment.bank.accountNumber}</p>
          </div>
          <button
            onClick={() => onCopy(payment.bank.accountNumber)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-600 hover:text-primary"
            aria-label="คัดลอกเลขบัญชี"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-stone-500">ชื่อบัญชี</p>
            <p className="text-sm font-semibold text-stone-900">{payment.bank.accountName}</p>
          </div>
          <button
            onClick={() => onCopy(payment.bank.accountName)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-600 hover:text-primary"
            aria-label="คัดลอกชื่อบัญชี"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function BillSkeleton() {
  return (
    <main className="mx-auto max-w-[480px] space-y-4 bg-amber-50 px-4 py-4">
      <div className="h-40 animate-pulse rounded-3xl bg-muted" />
      <div className="h-64 animate-pulse rounded-3xl bg-muted" />
      <div className="h-32 animate-pulse rounded-3xl bg-muted" />
    </main>
  );
}

function BillNotFound({ onBack }: { onBack: () => void }) {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-[480px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-stone-100">
        <Receipt className="h-10 w-10 text-stone-400" />
      </div>
      <h2 className="mb-1.5 text-lg font-semibold">ไม่พบบิลนี้</h2>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">
        บิลอาจถูกลบไปแล้ว หรือคุณไม่ได้เป็นสมาชิกของบิลนี้
      </p>
      <Button onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        กลับหน้าหลัก
      </Button>
    </main>
  );
}
