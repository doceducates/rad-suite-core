export interface DrawSliceParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  slice: number;
  maxSlices: number;
  modality: string;
  preset: string;
  sequenceKey?: string;
  invert: boolean;
  rotate: number;
  flip: boolean;
  zoom?: number;
  pan?: { x: number; y: number };
}

export function drawMedicalDicomSlice({
  ctx,
  width: w,
  height: h,
  slice,
  maxSlices,
  modality,
  preset,
  sequenceKey = 'brain',
  invert,
  rotate,
  flip,
  zoom = 1,
  pan = { x: 0, y: 0 },
}: DrawSliceParams): void {
  ctx.clearRect(0, 0, w, h);
  ctx.save();

  // Background viewport
  ctx.fillStyle = invert ? '#f1f5f9' : '#020617';
  ctx.fillRect(0, 0, w, h);

  // Apply Pan, Zoom, Rotation, and Flip around center
  ctx.translate(w / 2 + pan.x, h / 2 + pan.y);
  ctx.scale(flip ? -zoom : zoom, zoom);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);

  const factor = (slice + 1) / Math.max(1, maxSlices);
  const cx = w / 2;
  const cy = h / 2;
  const modUpper = modality.toUpperCase();

  if (modUpper === 'MRI') {
    drawMriSequence(ctx, cx, cy, w, h, factor, sequenceKey, invert);
  } else if (modUpper === 'CR' || modUpper === 'DX') {
    drawXRaySlice(ctx, cx, cy, invert);
  } else {
    drawCtSequence(ctx, cx, cy, w, h, factor, preset, sequenceKey, invert);
  }

  ctx.restore();
}

function drawMriSequence(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, factor: number, seq: string, inv: boolean) {
  const isT2 = seq === 't2';
  const isFlair = seq === 'flair';
  const isStir = seq === 'stir';
  const isDwi = seq === 'dwi';
  const skullR = w * 0.33;

  // Calvarium / Scalp Fat
  ctx.strokeStyle = inv ? (isT2 || isStir ? '#475569' : '#0f172a') : (isT2 || isStir ? '#1e293b' : '#94a3b8');
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, skullR, skullR * 1.15, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Brain Parenchyma
  ctx.fillStyle = inv ? '#cbd5e1' : (isDwi ? '#090d16' : '#1e293b');
  ctx.beginPath();
  ctx.ellipse(cx, cy, skullR - 5, (skullR - 5) * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ventricles & CSF Signal
  const vSize = 20 + factor * 14;
  const csfColor = inv
    ? (isT2 ? '#020617' : isFlair || isDwi ? '#64748b' : '#475569')
    : (isT2 ? '#e2e8f0' : isFlair || isDwi ? '#050b14' : '#0b1324');
  ctx.fillStyle = csfColor;
  ctx.beginPath();
  ctx.ellipse(cx - 24, cy - 10, vSize * 0.5, vSize, -0.2, 0, Math.PI * 2);
  ctx.ellipse(cx + 24, cy - 10, vSize * 0.5, vSize, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // FLAIR / DWI Hyperintensity signal
  if (isFlair || isDwi) {
    ctx.fillStyle = inv ? '#0f172a' : '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(cx + 34, cy - 14, 12, 18, 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCtSequence(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, factor: number, preset: string, seq: string, inv: boolean) {
  const isBone = preset === 'bone' || seq === 'bone';
  const isLung = preset === 'lung' || seq === 'lung';
  const skullRx = w * 0.34;
  const skullRy = h * (0.36 + factor * 0.05);

  if (isLung) {
    drawXRaySlice(ctx, cx, cy, inv);
    return;
  }

  // Cortical bone
  ctx.strokeStyle = inv ? (isBone ? '#020617' : '#475569') : (isBone ? '#ffffff' : '#cbd5e1');
  ctx.lineWidth = isBone ? 10 : 6;
  ctx.beginPath();
  ctx.ellipse(cx, cy, skullRx, skullRy, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Brain Parenchyma
  ctx.fillStyle = inv ? '#f1f5f9' : (isBone ? '#020617' : '#1e293b');
  ctx.beginPath();
  ctx.ellipse(cx, cy, skullRx - (isBone ? 9 : 6), skullRy - (isBone ? 9 : 6), 0, 0, Math.PI * 2);
  ctx.fill();

  // Lateral ventricles
  if (!isBone) {
    const vSize = 18 + factor * 12;
    ctx.fillStyle = inv ? '#64748b' : '#020617';
    ctx.beginPath();
    ctx.ellipse(cx - 25, cy - 15, vSize * 0.5, vSize, -0.2, 0, Math.PI * 2);
    ctx.ellipse(cx + 25, cy - 15, vSize * 0.5, vSize, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Midline Falx
    ctx.strokeStyle = inv ? '#334155' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - skullRy + 12);
    ctx.lineTo(cx, cy + skullRy - 12);
    ctx.stroke();
  }
}

function drawXRaySlice(ctx: CanvasRenderingContext2D, cx: number, cy: number, inv: boolean) {
  ctx.fillStyle = inv ? '#cbd5e1' : '#0f172a';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 180, 200, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lungs
  ctx.fillStyle = inv ? '#f8fafc' : '#020617';
  ctx.beginPath();
  ctx.ellipse(cx - 70, cy - 20, 50, 120, -0.1, 0, Math.PI * 2);
  ctx.ellipse(cx + 70, cy - 20, 50, 120, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Cardiac silhouette
  ctx.fillStyle = inv ? '#475569' : '#1e293b';
  ctx.beginPath();
  ctx.ellipse(cx + 15, cy + 30, 65, 50, 0.3, 0, Math.PI * 2);
  ctx.fill();
}
