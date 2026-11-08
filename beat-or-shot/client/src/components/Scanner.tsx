import jsQR from 'jsqr';
import { Camera, Keyboard } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Btn } from './ui';

/**
 * Escáner QR con la cámara trasera. Usa BarcodeDetector si existe (Android/Chrome)
 * y jsQR como respaldo universal (iPhone/Safari). Siempre hay entrada manual.
 */
export function Scanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'denied' | 'unsupported'>('starting');
  const [manual, setManual] = useState('');
  const done = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) return setStatus('unsupported');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        setStatus('scanning');
        tick();
      } catch {
        setStatus('denied');
      }
    }
    let last = 0;
    async function tick() {
      if (stopped || done.current) return;
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      if (now - last < 220) return;
      last = now;
      const v = video.current;
      if (!v || v.readyState < 2) return;
      try {
        if (detector) {
          const found = await detector.detect(v);
          if (found[0]?.rawValue) return hit(found[0].rawValue);
        } else {
          const c = canvas.current!;
          const w = 480;
          const h = Math.round((v.videoHeight / v.videoWidth) * w) || 360;
          c.width = w;
          c.height = h;
          const g = c.getContext('2d', { willReadFrequently: true })!;
          g.drawImage(v, 0, 0, w, h);
          const img = g.getImageData(0, 0, w, h);
          const qr = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
          if (qr?.data) hit(qr.data);
        }
      } catch {
        /* fotograma ilegible */
      }
    }
    function hit(text: string) {
      if (done.current) return;
      done.current = true;
      if ('vibrate' in navigator) navigator.vibrate(30);
      onCode(text);
    }
    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-black">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        <canvas ref={canvas} className="hidden" />
        <div className="pointer-events-none absolute inset-[18%] rounded-3xl border-2 border-cyan shadow-[0_0_0_9999px_rgba(0,0,0,.45)]" />
        {status !== 'scanning' && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/70">
            {status === 'starting' && (
              <span className="flex items-center gap-2">
                <Camera size={18} /> Activando cámara…
              </span>
            )}
            {status === 'denied' && 'No hay permiso para usar la cámara. Actívalo en el navegador o escribe el código impreso bajo el QR.'}
            {status === 'unsupported' && 'Este navegador no permite usar la cámara aquí (requiere HTTPS). Escribe el código impreso bajo el QR.'}
          </div>
        )}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onCode(manual.trim());
        }}
      >
        <div className="relative flex-1">
          <Keyboard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} placeholder="XXXX-XXXX" className="w-full pl-9 font-display tracking-widest" aria-label="Código de carta" />
        </div>
        <Btn size="md" type="submit" disabled={manual.replace(/[^A-Z0-9]/g, '').length < 8}>
          OK
        </Btn>
      </form>
    </div>
  );
}
