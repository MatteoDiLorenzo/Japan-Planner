import type { DayPlan } from '@/types';
import { attractions, calculateCompleteRoute } from '@/data/attractions';
import { formatEurFromJpy, formatJpy } from '@/lib/currency';

const timeSlots = [
  { id: 'morning', label: 'Mattina', timeRange: '09:00 - 12:00', icon: '🌅' },
  { id: 'afternoon', label: 'Pomeriggio', timeRange: '12:00 - 15:00', icon: '☀️' },
  { id: 'evening', label: 'Sera', timeRange: '15:00 - 18:00', icon: '🌇' },
  { id: 'night', label: 'Notte', timeRange: '18:00 - 21:00', icon: '🌙' },
];

function getAttractionsForSlot(day: DayPlan, slotId: string) {
  const slot = timeSlots.find((s) => s.id === slotId);
  if (!slot) return [];

  const [startHour] = slot.timeRange.split(' - ')[0].split(':').map(Number);
  const [endHour] = slot.timeRange.split(' - ')[1].split(':').map(Number);

  return day.activities
    .filter((a) => {
      const [activityHour] = a.startTime.split(':').map(Number);
      return activityHour >= startHour && activityHour < endHour;
    })
    .map((a) => ({
      activity: a,
      attraction: attractions.find((attr) => attr.id === a.attractionId),
    }))
    .filter((item): item is typeof item & { attraction: NonNullable<typeof item.attraction> } => !!item.attraction);
}

function loadImageCors(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function transportBlockHeight(fromId: string, toId: string, fromCity: string, toCity: string): number {
  const fromA = attractions.find((a) => a.id === fromId);
  const toA = attractions.find((a) => a.id === toId);
  if (!fromA || !toA) return 8;
  const route = calculateCompleteRoute(fromA.coordinates, toA.coordinates, fromCity, toCity);
  return 56 + route.segments.length * 14;
}

function drawTransportBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  fromId: string,
  toId: string,
  fromCity: string,
  toCity: string
): number {
  const fromA = attractions.find((a) => a.id === fromId);
  const toA = attractions.find((a) => a.id === toId);
  if (!fromA || !toA) return y;

  const route = calculateCompleteRoute(fromA.coordinates, toA.coordinates, fromCity, toCity);
  const h = transportBlockHeight(fromId, toId, fromCity, toCity);

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();

  let cy = y + 18;
  ctx.fillStyle = '#e5e5e5';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const mode =
    route.segments.length === 1 && route.segments[0].type === 'walk'
      ? 'A piedi'
      : route.segments.some((s) => s.type === 'bus')
        ? 'Bus / Metro'
        : 'Metro';
  ctx.fillText(mode, x + 14, cy);
  cy += 18;
  ctx.fillStyle = '#737373';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(`${route.totalDistance.toFixed(1)} km · ~${route.totalDuration} min`, x + 14, cy);
  cy += 16;

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.moveTo(x + 12, cy);
  ctx.lineTo(x + w - 12, cy);
  ctx.stroke();
  cy += 12;

  ctx.font = '10px system-ui, sans-serif';
  for (const seg of route.segments) {
    let line = '';
    if (seg.type === 'walk') {
      line = `🚶 ${seg.name} (~${seg.duration} min)`;
    } else if (seg.fromStation && seg.toStation) {
      line = `🚇 ${seg.fromStation.name} → ${seg.toStation.name} · ${seg.name.split('(')[0].trim()}`;
    } else {
      line = `${seg.name} (~${seg.duration} min)`;
    }
    if (line.length > 95) line = `${line.slice(0, 92)}…`;
    ctx.fillStyle = '#a3a3a3';
    ctx.fillText(line, x + 14, cy);
    cy += 14;
  }
  ctx.restore();

  return y + h + 10;
}

function measureCardHeight(dayPlans: DayPlan[]): number {
  const pad = 24;
  let y = pad + 72;
  for (const day of dayPlans) {
    y += 8 + 28;
    for (const slot of timeSlots) {
      const items = getAttractionsForSlot(day, slot.id);
      if (items.length === 0) continue;
      y += 48;
      for (let i = 0; i < items.length; i++) {
        if (i > 0) {
          const prev = items[i - 1].attraction;
          const cur = items[i].attraction;
          y += transportBlockHeight(prev.id, cur.id, prev.city, cur.city) + 10;
        }
        y += 86;
      }
      y += 16;
    }
    y += 16;
  }
  y += 96 + pad + 64;
  return y;
}

export async function renderItineraryCardPng(opts: {
  dayPlans: DayPlan[];
  totalBudgetJpy: number;
}): Promise<void> {
  const { dayPlans, totalBudgetJpy } = opts;
  const W = 760;
  const pad = 24;
  const contentW = W - pad * 2;

  const imageCache = new Map<string, HTMLImageElement | null>();
  const preloadUrls = new Set<string>();
  for (const day of dayPlans) {
    for (const a of day.activities) {
      const attr = attractions.find((x) => x.id === a.attractionId);
      if (attr?.image) preloadUrls.add(attr.image);
    }
  }
  await Promise.all(
    [...preloadUrls].map(async (u) => {
      imageCache.set(u, await loadImageCors(u));
    })
  );

  const H = Math.max(720, measureCardHeight(dayPlans));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#0a0a0b';
  ctx.fillRect(0, 0, W, H);

  let y = pad;
  ctx.fillStyle = '#fafafa';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Japan Planner', W / 2, y + 22);
  ctx.fillStyle = '#737373';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`Itinerario · ${new Date().toLocaleDateString('it-IT')}`, W / 2, y + 44);
  y += 72;

  let totalActs = 0;
  let totalCost = 0;
  for (const day of dayPlans) {
    totalActs += day.activities.length;
    for (const act of day.activities) {
      const at = attractions.find((a) => a.id === act.attractionId);
      totalCost += at?.price ?? 0;
    }
  }

  for (let d = 0; d < dayPlans.length; d++) {
    const day = dayPlans[d];
    ctx.fillStyle = '#fafafa';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Giorno ${d + 1}`, pad, y + 18);
    y += 32;

    for (const slot of timeSlots) {
      const slotItems = getAttractionsForSlot(day, slot.id);
      if (slotItems.length === 0) continue;

      ctx.fillStyle = '#1f1f23';
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(pad, y, contentW, 44, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fafafa';
      ctx.font = '600 14px system-ui, sans-serif';
      ctx.fillText(`${slot.icon} ${slot.label}`, pad + 14, y + 22);
      ctx.fillStyle = '#737373';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(slot.timeRange, pad + 14, y + 36);
      ctx.fillStyle = '#737373';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${slotItems.length} attività`, pad + contentW - 14, y + 28);
      ctx.textAlign = 'left';
      y += 52;

      for (let idx = 0; idx < slotItems.length; idx++) {
        const { activity, attraction } = slotItems[idx];
        if (idx > 0) {
          const prev = slotItems[idx - 1].attraction;
          y = drawTransportBlock(ctx, pad, y, contentW, prev.id, attraction.id, prev.city, attraction.city);
        }

        const rowH = 76;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.roundRect(pad, y, contentW, rowH, 12);
        ctx.fill();
        ctx.stroke();

        const imgX = pad + 12;
        const imgY = y + 10;
        const imgS = 56;
        ctx.fillStyle = '#262626';
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgS, imgS, 10);
        ctx.fill();

        const cached = attraction.image ? imageCache.get(attraction.image) : null;
        if (cached && cached.complete) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(imgX, imgY, imgS, imgS, 10);
          ctx.clip();
          ctx.drawImage(cached, imgX, imgY, imgS, imgS);
          ctx.restore();
        }

        const tx = imgX + imgS + 12;
        ctx.fillStyle = '#fafafa';
        ctx.font = '600 14px system-ui, sans-serif';
        const title = attraction.name.length > 40 ? `${attraction.name.slice(0, 38)}…` : attraction.name;
        ctx.fillText(title, tx, y + 28);

        ctx.fillStyle = '#a3a3a3';
        ctx.font = '11px system-ui, sans-serif';
        const priceStr =
          attraction.price > 0
            ? `${formatEurFromJpy(attraction.price, 0)} · ${formatJpy(attraction.price)}`
            : 'Gratis';
        ctx.fillText(
          `⏱ ${activity.startTime} – ${activity.endTime}  ·  ${attraction.duration}  ·  ${priceStr}`,
          tx,
          y + 50
        );

        y += rowH + 10;
      }
      y += 8;
    }
    y += 12;
  }

  ctx.fillStyle = 'rgba(239,68,68,0.12)';
  ctx.strokeStyle = 'rgba(239,68,68,0.25)';
  ctx.beginPath();
  ctx.roundRect(pad, y, contentW, 72, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fafafa';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Riepilogo', W / 2, y + 26);
  ctx.fillStyle = '#d4d4d4';
  ctx.font = '12px system-ui, sans-serif';
  const sumLine = `Attività: ${totalActs}  ·  Stima attrazioni: ${formatEurFromJpy(totalCost, 0)} (${formatJpy(totalCost)})  ·  Budget: ${formatEurFromJpy(totalBudgetJpy, 0)}`;
  ctx.fillText(sumLine, W / 2, y + 50);

  ctx.fillStyle = '#525252';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('Generato con Japan Planner', W / 2, H - 14);

  const link = document.createElement('a');
  link.download = `japan-trip-card-${new Date().toISOString().split('T')[0]}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
