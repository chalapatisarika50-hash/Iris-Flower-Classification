import React, { useRef, useEffect, useState, useMemo } from 'react';
import { IrisData, Species, ModelType } from '../types';
import { SPECIES_DETAILS } from '../data';
import { Maximize2, Crosshair, HelpCircle } from 'lucide-react';

interface DecisionBoundaryProps {
  trainData: IrisData[];
  testData: IrisData[];
  modelType: ModelType;
  predictFn: (point: { sepalLength: number; sepalWidth: number; petalLength: number; petalWidth: number }) => Species;
  currentInputs: {
    sepalLength: number;
    sepalWidth: number;
    petalLength: number;
    petalWidth: number;
  };
  highlightedPoint?: IrisData | null;
  onHoverPoint?: (point: IrisData | null) => void;
}

const FEATURE_METADATA = [
  { id: 0, key: 'sepalLength' as keyof IrisData, name: 'Sepal Length (cm)', min: 4.0, max: 8.0 },
  { id: 1, key: 'sepalWidth' as keyof IrisData, name: 'Sepal Width (cm)', min: 1.8, max: 4.6 },
  { id: 2, key: 'petalLength' as keyof IrisData, name: 'Petal Length (cm)', min: 0.8, max: 7.2 },
  { id: 3, key: 'petalWidth' as keyof IrisData, name: 'Petal Width (cm)', min: 0.0, max: 2.8 }
];

export default function DecisionBoundary({
  trainData,
  testData,
  modelType,
  predictFn,
  currentInputs,
  highlightedPoint,
  onHoverPoint
}: DecisionBoundaryProps) {
  const [xAxisId, setXAxisId] = useState(2); // Default: Petal Length
  const [yAxisId, setYAxisId] = useState(3); // Default: Petal Width
  const [dataSplitView, setDataSplitView] = useState<'all' | 'train' | 'test'>('all');
  const [showGrid, setShowGrid] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 400 });
  const [hoveredPoint, setHoveredPoint] = useState<IrisData | null>(null);
  const [mouseCoord, setMouseCoord] = useState<{ x: number, y: number } | null>(null);

  const xMeta = FEATURE_METADATA[xAxisId];
  const yMeta = FEATURE_METADATA[yAxisId];

  // Handle ResizeObserver to keep canvas responsive
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Maintain aspect ratio 5:4 or 4:3
      const height = Math.max(300, Math.min(480, width * 0.75));
      setDimensions({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter plotted points based on view choice
  const plottedPoints = useMemo(() => {
    switch (dataSplitView) {
      case 'train': return trainData;
      case 'test': return testData;
      case 'all': default: return [...trainData, ...testData];
    }
  }, [trainData, testData, dataSplitView]);

  // Coordinate mapping utilities (data coordinates to canvas pixel coordinates)
  const mapX = (val: number, width: number) => {
    const margin = 50;
    return margin + ((val - xMeta.min) / (xMeta.max - xMeta.min)) * (width - margin * 2);
  };

  const mapY = (val: number, height: number) => {
    const margin = 50;
    return height - margin - ((val - yMeta.min) / (yMeta.max - yMeta.min)) * (height - margin * 2);
  };

  const unmapX = (px: number, width: number) => {
    const margin = 50;
    const ratio = (px - margin) / (width - margin * 2);
    return xMeta.min + ratio * (xMeta.max - xMeta.min);
  };

  const unmapY = (px: number, height: number) => {
    const margin = 50;
    const ratio = (height - margin - px) / (height - margin * 2);
    return yMeta.min + ratio * (yMeta.max - yMeta.min);
  };

  // Redraw canvas (boundaries + grid + points)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const margin = 50;

    // Clear and set sizing
    ctx.clearRect(0, 0, width, height);
    
    // 1. Draw Decision Boundary Regions
    // We create a grid in pixel space, find data coordinates, run model predict, and fill rect
    const gridSize = 4; // size in pixels for grid squares
    const numX = Math.ceil((width - margin * 2) / gridSize);
    const numY = Math.ceil((height - margin * 2) / gridSize);

    for (let i = 0; i < numX; i++) {
      const px = margin + i * gridSize;
      const xVal = unmapX(px + gridSize / 2, width);

      for (let j = 0; j < numY; j++) {
        const py = height - margin - (j + 1) * gridSize;
        const yVal = unmapY(py + gridSize / 2, height);

        // Build sample holding other features constant at current sliding value
        const testSample = {
          sepalLength: currentInputs.sepalLength,
          sepalWidth: currentInputs.sepalWidth,
          petalLength: currentInputs.petalLength,
          petalWidth: currentInputs.petalWidth
        };

        // Inject grid values
        if (xMeta.key === 'sepalLength') testSample.sepalLength = xVal;
        else if (xMeta.key === 'sepalWidth') testSample.sepalWidth = xVal;
        else if (xMeta.key === 'petalLength') testSample.petalLength = xVal;
        else if (xMeta.key === 'petalWidth') testSample.petalWidth = xVal;

        if (yMeta.key === 'sepalLength') testSample.sepalLength = yVal;
        else if (yMeta.key === 'sepalWidth') testSample.sepalWidth = yVal;
        else if (yMeta.key === 'petalLength') testSample.petalLength = yVal;
        else if (yMeta.key === 'petalWidth') testSample.petalWidth = yVal;

        const predictedSpecies = predictFn(testSample);

        // Color mapped to prediction region
        if (predictedSpecies === 'setosa') ctx.fillStyle = 'rgba(125, 132, 113, 0.08)';
        else if (predictedSpecies === 'versicolor') ctx.fillStyle = 'rgba(138, 133, 124, 0.08)';
        else if (predictedSpecies === 'virginica') ctx.fillStyle = 'rgba(198, 139, 119, 0.08)';
        else ctx.fillStyle = 'transparent';

        ctx.fillRect(px, py, gridSize, gridSize);
      }
    }

    // 2. Draw Axes, Grids and Labels
    ctx.strokeStyle = '#E5E1D8'; // Natural warm border light
    ctx.lineWidth = 1;

    if (showGrid) {
      // X-grid lines & labels
      const xStep = (xMeta.max - xMeta.min) / 4;
      for (let i = 0; i <= 4; i++) {
        const val = xMeta.min + i * xStep;
        const cx = mapX(val, width);
        
        ctx.beginPath();
        ctx.moveTo(cx, margin);
        ctx.lineTo(cx, height - margin);
        ctx.stroke();

        ctx.fillStyle = '#8A857C'; // Natural Taupe
        ctx.font = '10px var(--font-mono), monospace';
        ctx.textAlign = 'center';
        ctx.fillText(val.toFixed(1), cx, height - margin + 15);
      }

      // Y-grid lines & labels
      const yStep = (yMeta.max - yMeta.min) / 4;
      for (let i = 0; i <= 4; i++) {
        const val = yMeta.min + i * yStep;
        const cy = mapY(val, height);

        ctx.beginPath();
        ctx.moveTo(margin, cy);
        ctx.lineTo(width - margin, cy);
        ctx.stroke();

        ctx.fillStyle = '#8A857C';
        ctx.font = '10px var(--font-mono), monospace';
        ctx.textAlign = 'right';
        ctx.fillText(val.toFixed(1), margin - 8, cy + 3);
      }
    }

    // Outer Axis Box
    ctx.strokeStyle = '#DCD7CC'; // Natural border
    ctx.lineWidth = 1.5;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

    // X Axis Title
    ctx.fillStyle = '#5A5A40'; // Natural Olive
    ctx.font = '12px var(--font-sans), sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(xMeta.name, width / 2, height - 12);

    // Y Axis Title
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#5A5A40';
    ctx.font = '12px var(--font-sans), sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(yMeta.name, 0, 0);
    ctx.restore();

    // 3. Draw original data points
    plottedPoints.forEach(item => {
      const px = mapX(item[xMeta.key] as number, width);
      const py = mapY(item[yMeta.key] as number, height);
      
      const sDetails = SPECIES_DETAILS[item.species];
      
      // Determine if highlighted
      const isHighlighted = highlightedPoint?.id === item.id || hoveredPoint?.id === item.id;
      const radius = isHighlighted ? 7 : 4.5;

      // Predict to check if model classifies it correctly
      const pointPred = predictFn({
        sepalLength: item.sepalLength,
        sepalWidth: item.sepalWidth,
        petalLength: item.petalLength,
        petalWidth: item.petalWidth
      });
      const isCorrect = pointPred === item.species;

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = sDetails.color;
      ctx.fill();

      // Outer rings
      if (!isCorrect) {
        // Terracotta double ring for misclassified
        ctx.strokeStyle = '#A35C48';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(px, py, radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(163, 92, 72, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Subtle outline for correct
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(px, py, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = sDetails.color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // 4. Draw Current Sliding Predictor Point as a beautiful target crosshair
    const curXVal = currentInputs[xMeta.key as keyof typeof currentInputs];
    const curYVal = currentInputs[yMeta.key as keyof typeof currentInputs];
    const targetX = mapX(curXVal, width);
    const targetY = mapY(curYVal, height);

    // Outer pulsating circle
    const time = Date.now() * 0.003;
    const pulseRadius = 10 + Math.sin(time) * 3;

    ctx.beginPath();
    ctx.arc(targetX, targetY, pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#5A5A40'; // Natural Olive
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Inner crosshairs
    ctx.strokeStyle = '#5A5A40';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(targetX - 12, targetY);
    ctx.lineTo(targetX + 12, targetY);
    ctx.moveTo(targetX, targetY - 12);
    ctx.lineTo(targetX, targetY + 12);
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#5A5A40';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.stroke();

  }, [dimensions, xAxisId, yAxisId, currentInputs, plottedPoints, predictFn, showGrid, highlightedPoint, hoveredPoint]);

  // Handle canvas mouse move to select/hover data points
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { width, height } = dimensions;

    // Detect if mouse is close to any data point
    let closestPoint: IrisData | null = null;
    let minDistance = 12; // hover tolerance in pixels

    plottedPoints.forEach(item => {
      const px = mapX(item[xMeta.key] as number, width);
      const py = mapY(item[yMeta.key] as number, height);
      const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = item;
      }
    });

    setHoveredPoint(closestPoint);
    onHoverPoint?.(closestPoint);
    setMouseCoord(mx > 50 && mx < width - 50 && my > 50 && my < height - 50 ? { x: mx, y: my } : null);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    onHoverPoint?.(null);
    setMouseCoord(null);
  };

  // Switch axes
  const handleXAxisChange = (idx: number) => {
    if (idx !== yAxisId) {
      setXAxisId(idx);
    }
  };

  const handleYAxisChange = (idx: number) => {
    if (idx !== xAxisId) {
      setYAxisId(idx);
    }
  };

  return (
    <div id="decision-boundary-container" className="bg-white rounded-[32px] border border-natural-border/60 shadow-sm p-8 flex flex-col gap-6">
      {/* Visual Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h3 className="font-serif italic text-xl text-natural-olive flex items-center gap-2">
            2D Decision Boundary Space
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-natural-badge text-natural-olive font-semibold">Interactive Canvas</span>
          </h3>
          <p className="text-xs text-natural-muted">
            Click coordinate tags to switch dimensions. Shaded regions depict active model decision boundaries.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Data split toggle */}
          <div className="inline-flex rounded-xl border border-natural-border p-0.5 bg-natural-bg/50">
            {(['all', 'train', 'test'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setDataSplitView(mode)}
                className={`px-3 py-1 text-xs rounded-lg font-medium capitalize cursor-pointer transition-all ${
                  dataSplitView === mode
                    ? 'bg-white text-natural-text shadow-xs font-semibold'
                    : 'text-natural-taupe hover:text-natural-muted'
                }`}
              >
                {mode === 'all' ? 'All Samples' : `${mode}ing Set`}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-3 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
              showGrid
                ? 'bg-white text-natural-olive border-natural-border font-semibold shadow-2xs'
                : 'bg-natural-bg/40 text-natural-taupe border-natural-border/60'
            }`}
          >
            Grid lines
          </button>
        </div>
      </div>

      {/* Axis Selection Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-natural-bg/30 p-5 rounded-[24px] border border-natural-border/50">
        <div>
          <span className="text-xs uppercase tracking-widest text-natural-taupe block mb-2 font-bold">X-Axis Coordinate</span>
          <div className="flex gap-1.5 flex-wrap">
            {FEATURE_METADATA.map(meta => (
              <button
                key={meta.id}
                disabled={yAxisId === meta.id}
                onClick={() => handleXAxisChange(meta.id)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  xAxisId === meta.id
                    ? 'bg-natural-olive text-white shadow-2xs'
                    : 'bg-white border border-natural-border/80 text-natural-muted hover:border-natural-border'
                }`}
              >
                {meta.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs uppercase tracking-widest text-natural-taupe block mb-2 font-bold">Y-Axis Coordinate</span>
          <div className="flex gap-1.5 flex-wrap">
            {FEATURE_METADATA.map(meta => (
              <button
                key={meta.id}
                disabled={xAxisId === meta.id}
                onClick={() => handleYAxisChange(meta.id)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  yAxisId === meta.id
                    ? 'bg-natural-olive text-white shadow-2xs'
                    : 'bg-white border border-natural-border/80 text-natural-muted hover:border-natural-border'
                }`}
              >
                {meta.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas Box */}
      <div ref={containerRef} className="relative w-full border border-natural-border/60 bg-natural-bg/20 rounded-2xl flex items-center justify-center p-3">
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="bg-white rounded-xl cursor-crosshair shadow-2xs border border-natural-border/40"
        />

        {/* Hover Coordinate Overlay tooltip */}
        {mouseCoord && hoveredPoint && (
          <div
            className="absolute z-10 bg-natural-text text-white p-3.5 rounded-xl text-xs shadow-md pointer-events-none border border-natural-muted/50 flex flex-col gap-1 w-48"
            style={{ left: mouseCoord.x + 15, top: mouseCoord.y - 15 }}
          >
            <div className="flex items-center gap-2 border-b border-white/10 pb-1.5 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SPECIES_DETAILS[hoveredPoint.species].color }} />
              <span className="font-serif italic text-sm">{SPECIES_DETAILS[hoveredPoint.species].name}</span>
            </div>
            <div className="font-mono text-[10px] text-white/85 flex flex-col gap-0.5">
              <div>SL: {hoveredPoint.sepalLength.toFixed(1)}cm | SW: {hoveredPoint.sepalWidth.toFixed(1)}cm</div>
              <div>PL: {hoveredPoint.petalLength.toFixed(1)}cm | PW: {hoveredPoint.petalWidth.toFixed(1)}cm</div>
            </div>
          </div>
        )}

        {/* Floating legend overlay on bottom right */}
        <div className="absolute bottom-6 right-6 bg-white/95 p-4 rounded-xl border border-natural-border/60 shadow-sm flex flex-col gap-2 text-[10px] font-semibold text-natural-muted">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7D8471]" />
            <span className="font-serif italic">Setosa</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8A857C]" />
            <span className="font-serif italic">Versicolor</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C68B77]" />
            <span className="font-serif italic">Virginica</span>
          </div>
          <div className="border-t border-natural-border/40 pt-2 flex items-center gap-2 mt-1 text-natural-taupe">
            <span className="w-2.5 h-2.5 rounded-full border border-[#A35C48] bg-[#A35C48]/30 flex-shrink-0" />
            Misclassified
          </div>
          <div className="flex items-center gap-2 text-natural-taupe">
            <span className="w-2.5 h-2.5 border border-natural-olive border-dashed rounded-full flex-shrink-0" />
            Input Marker
          </div>
        </div>
      </div>

      {/* Guide Note */}
      <div className="flex gap-3 items-start p-4 bg-natural-bg/50 rounded-2xl text-xs text-natural-muted border border-natural-border/50">
        <HelpCircle className="w-4 h-4 text-natural-olive mt-0.5 flex-shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-natural-text">How to read this plot:</strong> The colored background zones show what flower species the <strong className="font-serif italic text-natural-text">{modelType === 'knn' ? 'K-Nearest Neighbors' : modelType === 'decision_tree' ? 'Decision Tree' : 'Neural Network'}</strong> model will predict for any point. Drag the sliders in the <strong className="text-natural-olive font-bold">Botanical Measurement Simulator</strong>, and you'll see the <strong className="text-natural-text">Input Marker</strong> slide in real time. Circles with burgundy borders represent instances that the model misclassified.
        </p>
      </div>
    </div>
  );
}
