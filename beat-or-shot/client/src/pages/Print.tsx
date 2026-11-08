import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { TYPE_META } from '../../../shared/cards';
import type { CardDef } from '../../../shared/types';
import { CardBack, CardFace } from '../components/cards';

interface PrintCard {
  serial: number;
  edition: string;
  code: string;
  url: string;
  card: CardDef;
  svg?: string;
}

/**
 * Hojas listas para imprenta: 9 cartas por A4 a tamaño real (63 × 88 mm) con marcas de corte,
 * seguidas de la hoja de reversos alineada para impresión a doble cara.
 */
export default function PrintPage() {
  const [cards, setCards] = useState<PrintCard[] | null>(null);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    fetch('/api/cards')
      .then((r) => r.json())
      .then(async (list: PrintCard[]) => {
        for (const c of list) c.svg = await QRCode.toString(c.url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#FFFFFF' } });
        setCards(list);
      });
  }, []);
  if (!cards) return <div className="p-8 text-white">Generando 120 códigos QR…</div>;
  const shown = cards.filter((c) => filter === 'all' || c.card.type === filter);
  const pages: PrintCard[][] = [];
  for (let i = 0; i < shown.length; i += 9) pages.push(shown.slice(i, i + 9));

  return (
    <div className="bg-neutral-800 text-white print:bg-white">
      <style>{`@page { size: A4; margin: 0 } .sheet { width: 210mm; height: 297mm; padding: 16.5mm 10.5mm; display: grid; grid-template-columns: repeat(3, 63mm); grid-auto-rows: 88mm; gap: 0; page-break-after: always; background: white; margin: 0 auto 12px; box-sizing: border-box; } .cell { position: relative; width: 63mm; height: 88mm; outline: 0.2mm dashed #bbb; } .cell > div { border-radius: 3mm !important; } @media print { .sheet { margin: 0 } }`}</style>
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-ink/95 p-4">
        <b className="font-display">Hojas de impresión · Edición General (GEN1)</b>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="py-1.5">
          <option value="all">Todas (120)</option>
          {Object.keys(TYPE_META).map((t) => (
            <option key={t} value={t}>
              {TYPE_META[t as keyof typeof TYPE_META].label}
            </option>
          ))}
        </select>
        <button onClick={() => window.print()} className="rounded-xl bg-violet px-4 py-2 font-semibold">
          Imprimir / PDF
        </button>
        <span className="text-xs text-white/60">A4 · 63×88 mm · imprime a doble cara volteando por el borde largo. Para imprenta profesional añade 3 mm de sangrado.</span>
      </div>
      {pages.map((page, pi) => (
        <div key={pi}>
          <div className="sheet">
            {page.map((c) => (
              <div key={c.serial} className="cell">
                <CardFace
                  card={c.card}
                  compact
                  className="!rounded-[3mm]"
                  footer={
                    <div className="flex items-end justify-between gap-2">
                      <div className="h-[17mm] w-[17mm] shrink-0 rounded bg-white p-[1mm]" dangerouslySetInnerHTML={{ __html: c.svg ?? '' }} />
                      <div className="text-right text-[7px] leading-tight text-white/60">
                        <div className="font-mono text-[8px] text-white">{c.code}</div>
                        <div>{c.edition} · {String(c.serial).padStart(3, '0')}/120</div>
                      </div>
                    </div>
                  }
                />
              </div>
            ))}
          </div>
          {/* Reversos en orden espejo para doble cara */}
          <div className="sheet">
            {Array.from({ length: 9 }).map((_, i) => {
              const row = Math.floor(i / 3);
              const col = 2 - (i % 3);
              const c = page[row * 3 + col];
              return <div key={i} className="cell">{c && <CardBack className="!rounded-[3mm]" label={c.edition} />}</div>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
