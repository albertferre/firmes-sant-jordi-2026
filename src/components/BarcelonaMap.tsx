import { useState, useCallback, useMemo } from 'react';
import type { LocationMarker } from './MapView';

interface BarcelonaMapProps {
  locations: LocationMarker[];
  selectedLocation: string | null;
  onLocationClick: (locationName: string) => void;
}

/** Convert real lat/lng to SVG coordinates within the viewBox. */
function toSvg(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - 2.150) / (2.180 - 2.150)) * 800;
  const y = ((41.407 - lat) / (41.407 - 41.380)) * 600;
  return { x, y };
}

/** Compute marker radius from signing count (min 8, max 22). */
function markerRadius(count: number): number {
  if (count === 0) return 5;
  const min = 12;
  const max = 28;
  return Math.min(max, min + (count / 50) * (max - min));
}

// ---- Pre-computed landmark positions ----
const PL_CATALUNYA = toSvg(41.387, 2.170);
const CCCB_POS = toSvg(41.3833, 2.1660);

// ---- Street geometry (as SVG path data) ----

// Passeig de Gracia: runs roughly N-S along lng ~2.1650
const PG_GRACIA_START = toSvg(41.382, 2.1648);
const PG_GRACIA_MID = toSvg(41.390, 2.1650);
const PG_GRACIA_END = toSvg(41.404, 2.1655);
const PG_GRACIA_PATH = `M ${PG_GRACIA_START.x} ${PG_GRACIA_START.y} L ${PG_GRACIA_MID.x} ${PG_GRACIA_MID.y} L ${PG_GRACIA_END.x} ${PG_GRACIA_END.y}`;

// La Rambla: angled SW from Pl. Catalunya
const RAMBLA_START = toSvg(41.387, 2.170);
const RAMBLA_END = toSvg(41.3805, 2.1735);
const RAMBLA_PATH = `M ${RAMBLA_START.x} ${RAMBLA_START.y} L ${RAMBLA_END.x} ${RAMBLA_END.y}`;

// Avinguda Diagonal: cuts NW to SE across the top
const DIAG_START = toSvg(41.402, 2.150);
const DIAG_MID = toSvg(41.397, 2.165);
const DIAG_END = toSvg(41.392, 2.180);
const DIAGONAL_PATH = `M ${DIAG_START.x} ${DIAG_START.y} L ${DIAG_MID.x} ${DIAG_MID.y} L ${DIAG_END.x} ${DIAG_END.y}`;

// Gran Via: roughly horizontal, crosses Pg. de Gracia at ~lat 41.388
const GRANVIA_START = toSvg(41.388, 2.150);
const GRANVIA_MID = toSvg(41.3878, 2.165);
const GRANVIA_END = toSvg(41.3875, 2.180);
const GRANVIA_PATH = `M ${GRANVIA_START.x} ${GRANVIA_START.y} L ${GRANVIA_MID.x} ${GRANVIA_MID.y} L ${GRANVIA_END.x} ${GRANVIA_END.y}`;

// Passeig de Sant Joan: vertical, east of Pg. de Gracia at lng ~2.175
const PSJ_START = toSvg(41.384, 2.1755);
const PSJ_END = toSvg(41.404, 2.1765);
const PSJ_PATH = `M ${PSJ_START.x} ${PSJ_START.y} L ${PSJ_END.x} ${PSJ_END.y}`;

// Ronda de Sant Pere / Ronda Universitat: curves around Pl. Catalunya (north side)
const RONDA_START = toSvg(41.389, 2.162);
const RONDA_CP1 = toSvg(41.391, 2.166);
const RONDA_CP2 = toSvg(41.391, 2.172);
const RONDA_END = toSvg(41.389, 2.176);
const RONDA_PATH = `M ${RONDA_START.x} ${RONDA_START.y} C ${RONDA_CP1.x} ${RONDA_CP1.y} ${RONDA_CP2.x} ${RONDA_CP2.y} ${RONDA_END.x} ${RONDA_END.y}`;

// Carrer d'Arago (secondary): horizontal at ~lat 41.3915
const ARAGO_START = toSvg(41.3915, 2.150);
const ARAGO_END = toSvg(41.3915, 2.180);
const ARAGO_PATH = `M ${ARAGO_START.x} ${ARAGO_START.y} L ${ARAGO_END.x} ${ARAGO_END.y}`;

// Carrer de Valencia (secondary): horizontal at ~lat 41.3938
const VALENCIA_START = toSvg(41.3938, 2.150);
const VALENCIA_END = toSvg(41.3938, 2.180);
const VALENCIA_PATH = `M ${VALENCIA_START.x} ${VALENCIA_START.y} L ${VALENCIA_END.x} ${VALENCIA_END.y}`;

// Carrer de Mallorca (secondary): horizontal at ~lat 41.3958
const MALLORCA_START = toSvg(41.3958, 2.150);
const MALLORCA_END = toSvg(41.3958, 2.180);
const MALLORCA_PATH = `M ${MALLORCA_START.x} ${MALLORCA_START.y} L ${MALLORCA_END.x} ${MALLORCA_END.y}`;

// Carrer de Provenca (secondary): horizontal at ~lat 41.3978
const PROVENCA_START = toSvg(41.3978, 2.150);
const PROVENCA_END = toSvg(41.3978, 2.180);
const PROVENCA_PATH = `M ${PROVENCA_START.x} ${PROVENCA_START.y} L ${PROVENCA_END.x} ${PROVENCA_END.y}`;

// Carrer del Consell de Cent (secondary): horizontal at ~lat 41.389
const CONSELL_START = toSvg(41.3895, 2.150);
const CONSELL_END = toSvg(41.3895, 2.180);
const CONSELL_PATH = `M ${CONSELL_START.x} ${CONSELL_START.y} L ${CONSELL_END.x} ${CONSELL_END.y}`;

// Carrer de la Diputacio (secondary): horizontal at ~lat 41.39
const DIPUTACIO_START = toSvg(41.390, 2.150);
const DIPUTACIO_END = toSvg(41.390, 2.180);
const DIPUTACIO_PATH = `M ${DIPUTACIO_START.x} ${DIPUTACIO_START.y} L ${DIPUTACIO_END.x} ${DIPUTACIO_END.y}`;

// Rambla de Catalunya: vertical, between Pg. de Gracia and La Rambla at lng ~2.162
const RAMBLA_CAT_START = toSvg(41.387, 2.162);
const RAMBLA_CAT_END = toSvg(41.400, 2.162);
const RAMBLA_CAT_PATH = `M ${RAMBLA_CAT_START.x} ${RAMBLA_CAT_START.y} L ${RAMBLA_CAT_END.x} ${RAMBLA_CAT_END.y}`;

// Carrer de Pau Claris: vertical at lng ~2.170
const PAU_CLARIS_START = toSvg(41.387, 2.170);
const PAU_CLARIS_END = toSvg(41.400, 2.1705);
const PAU_CLARIS_PATH = `M ${PAU_CLARIS_START.x} ${PAU_CLARIS_START.y} L ${PAU_CLARIS_END.x} ${PAU_CLARIS_END.y}`;

// ---- Eixample block positions for chamfered square decoration ----
function eixampleBlock(lat: number, lng: number): string {
  const c = toSvg(lat, lng);
  const s = 10; // half-size of block
  const ch = 3; // chamfer
  return `M ${c.x - s + ch} ${c.y - s} L ${c.x + s - ch} ${c.y - s} L ${c.x + s} ${c.y - s + ch} L ${c.x + s} ${c.y + s - ch} L ${c.x + s - ch} ${c.y + s} L ${c.x - s + ch} ${c.y + s} L ${c.x - s} ${c.y + s - ch} L ${c.x - s} ${c.y - s + ch} Z`;
}

// Create a grid of Eixample blocks
const EIXAMPLE_BLOCKS: string[] = [];
for (let latI = 0; latI < 8; latI++) {
  for (let lngI = 0; lngI < 6; lngI++) {
    const lat = 41.3905 + latI * 0.0023;
    const lng = 2.1545 + lngI * 0.005;
    // Skip blocks that overlap with streets or landmarks
    const pos = toSvg(lat, lng);
    if (pos.x < 20 || pos.x > 780 || pos.y < 20 || pos.y > 520) continue;
    EIXAMPLE_BLOCKS.push(eixampleBlock(lat, lng));
  }
}

// Street label positions
const STREET_LABELS = [
  { text: 'Pg. de Gràcia', pos: toSvg(41.397, 2.1643), angle: -88 },
  { text: 'La Rambla', pos: toSvg(41.3838, 2.1717), angle: -60 },
  { text: 'Av. Diagonal', pos: toSvg(41.3975, 2.1575), angle: -20 },
  { text: 'Gran Via', pos: toSvg(41.3886, 2.1575), angle: -1 },
  { text: 'Pg. de Sant Joan', pos: toSvg(41.397, 2.1748), angle: -88 },
  { text: 'Rda. de Sant Pere', pos: toSvg(41.3905, 2.169), angle: 0 },
  { text: 'Rb. de Catalunya', pos: toSvg(41.395, 2.1613), angle: -88 },
];

export function BarcelonaMap({ locations, selectedLocation, onLocationClick }: BarcelonaMapProps) {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = useCallback((name: string, svgX: number, svgY: number) => {
    setHoveredLocation(name);
    setTooltipPos({ x: svgX, y: svgY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredLocation(null);
    setTooltipPos(null);
  }, []);

  const markerElements = useMemo(() => {
    return locations.map((loc) => {
      const pos = toSvg(loc.coordinates.lat, loc.coordinates.lng);
      const isSelected = selectedLocation === loc.location;
      const isHovered = hoveredLocation === loc.location;
      const isEmpty = loc.signingCount === 0;
      const r = markerRadius(loc.signingCount);

      return (
        <g
          key={loc.location}
          className="cursor-pointer"
          onClick={() => onLocationClick(loc.location)}
          onMouseEnter={() => handleMouseEnter(loc.location, pos.x, pos.y)}
          onMouseLeave={handleMouseLeave}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onLocationClick(loc.location);
            }
          }}
          aria-label={`${loc.location}: ${loc.signingCount} firmes`}
        >
          {/* Pulse ring for selected marker */}
          {isSelected && !isEmpty && (
            <>
              <circle cx={pos.x} cy={pos.y} r={r + 4} fill="none" stroke="#86001b" strokeWidth="2" opacity="0.6">
                <animate attributeName="r" from={String(r + 2)} to={String(r + 18)} dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={pos.x} cy={pos.y} r={r + 4} fill="none" stroke="#86001b" strokeWidth="1.5" opacity="0.3">
                <animate attributeName="r" from={String(r + 2)} to={String(r + 24)} dur="1.5s" begin="0.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
              </circle>
            </>
          )}

          {/* Shadow under marker */}
          {!isEmpty && (
            <ellipse
              cx={pos.x}
              cy={pos.y + r * 0.6}
              rx={r * 0.7}
              ry={r * 0.25}
              fill="rgba(28,28,24,0.12)"
            />
          )}

          {/* Main marker circle */}
          <circle
            cx={pos.x}
            cy={pos.y}
            r={isEmpty ? 5 : r}
            fill={isEmpty ? '#a0a0a0' : '#86001b'}
            fillOpacity={isEmpty ? 0.4 : Math.min(1, 0.55 + (loc.signingCount / 50) * 0.45)}
            stroke={isEmpty ? 'none' : '#fff'}
            strokeWidth={isEmpty ? 0 : 2.5}
            style={{
              transition: 'transform 0.2s ease, fill-opacity 0.2s ease',
              transformOrigin: `${pos.x}px ${pos.y}px`,
              transform: isHovered && !isEmpty ? 'scale(1.15)' : 'scale(1)',
            }}
          />

          {/* Inner highlight for depth */}
          {!isEmpty && (
            <circle
              cx={pos.x - r * 0.2}
              cy={pos.y - r * 0.2}
              r={r * 0.35}
              fill="rgba(255,255,255,0.2)"
              pointerEvents="none"
            />
          )}

          {/* Count label */}
          {!isEmpty && (
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fff"
              fontSize={r < 14 ? 9 : r < 18 ? 11 : 13}
              fontFamily="'Manrope', sans-serif"
              fontWeight="700"
              pointerEvents="none"
            >
              {loc.signingCount}
            </text>
          )}

          {/* Selected indicator ring */}
          {isSelected && !isEmpty && (
            <circle
              cx={pos.x}
              cy={pos.y}
              r={r + 4}
              fill="none"
              stroke="#86001b"
              strokeWidth="2.5"
              strokeDasharray="4 3"
              pointerEvents="none"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 ${pos.x} ${pos.y}`}
                to={`360 ${pos.x} ${pos.y}`}
                dur="8s"
                repeatCount="indefinite"
              />
            </circle>
          )}
        </g>
      );
    });
  }, [locations, selectedLocation, hoveredLocation, onLocationClick, handleMouseEnter, handleMouseLeave]);

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 800 600"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        role="img"
        aria-label="Mapa il-lustrat de Barcelona amb les ubicacions de firmes de Sant Jordi 2026"
      >
        <defs>
          {/* Paper texture filter */}
          <filter id="paper-texture" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="2" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="bwNoise" />
            <feBlend in="SourceGraphic" in2="bwNoise" mode="multiply" result="textured" />
            <feComponentTransfer in="textured">
              <feFuncA type="linear" slope="1" />
            </feComponentTransfer>
          </filter>

          {/* Soft glow for landmarks */}
          <filter id="landmark-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>

          {/* Rose petal gradient */}
          <radialGradient id="rose-fill" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#c4324e" />
            <stop offset="100%" stopColor="#86001b" />
          </radialGradient>

          {/* Stem gradient */}
          <linearGradient id="stem-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2d5a27" />
            <stop offset="100%" stopColor="#1a6b5a" />
          </linearGradient>
        </defs>

        {/* ========== BACKGROUND ========== */}
        <rect width="800" height="600" fill="#f5f0e8" rx="8" />

        {/* Subtle warm overlay gradient */}
        <rect width="800" height="600" fill="url(#paper-bg)" opacity="0.5" rx="8" />
        <defs>
          <radialGradient id="paper-bg" cx="30%" cy="20%" r="80%">
            <stop offset="0%" stopColor="#f9f3e6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ede6d6" stopOpacity="0.3" />
          </radialGradient>
        </defs>

        {/* Faint grid lines to suggest Eixample regularity */}
        <g opacity="0.06" stroke="#8b7355" strokeWidth="0.5">
          {/* Horizontal guide lines */}
          {Array.from({ length: 12 }, (_, i) => (
            <line key={`hg-${i}`} x1="0" y1={50 + i * 45} x2="800" y2={50 + i * 45} />
          ))}
          {/* Vertical guide lines */}
          {Array.from({ length: 16 }, (_, i) => (
            <line key={`vg-${i}`} x1={50 + i * 50} y1="0" x2={50 + i * 50} y2="600" />
          ))}
        </g>

        {/* ========== EIXAMPLE BLOCKS (chamfered squares) ========== */}
        <g opacity="0.08" fill="#8b7355" stroke="#8b7355" strokeWidth="0.3">
          {EIXAMPLE_BLOCKS.map((d, i) => (
            <path key={`block-${i}`} d={d} />
          ))}
        </g>

        {/* ========== SECONDARY STREETS ========== */}
        <g stroke="#c9bea8" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.45">
          <path d={ARAGO_PATH} />
          <path d={VALENCIA_PATH} />
          <path d={MALLORCA_PATH} />
          <path d={PROVENCA_PATH} />
          <path d={CONSELL_PATH} />
          <path d={DIPUTACIO_PATH} />
          <path d={RAMBLA_CAT_PATH} />
          <path d={PAU_CLARIS_PATH} />
        </g>

        {/* ========== MAIN STREETS ========== */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Passeig de Gracia - main axis, thickest */}
          <path d={PG_GRACIA_PATH} stroke="#a89878" strokeWidth="5" opacity="0.35" />
          <path d={PG_GRACIA_PATH} stroke="#c4b898" strokeWidth="3" opacity="0.6" />

          {/* Avinguda Diagonal */}
          <path d={DIAGONAL_PATH} stroke="#a89878" strokeWidth="4" opacity="0.3" />
          <path d={DIAGONAL_PATH} stroke="#c4b898" strokeWidth="2.5" opacity="0.55" />

          {/* Gran Via */}
          <path d={GRANVIA_PATH} stroke="#a89878" strokeWidth="4" opacity="0.3" />
          <path d={GRANVIA_PATH} stroke="#c4b898" strokeWidth="2.5" opacity="0.55" />

          {/* Passeig de Sant Joan */}
          <path d={PSJ_PATH} stroke="#a89878" strokeWidth="3.5" opacity="0.25" />
          <path d={PSJ_PATH} stroke="#c4b898" strokeWidth="2" opacity="0.5" />

          {/* La Rambla */}
          <path d={RAMBLA_PATH} stroke="#a89878" strokeWidth="4" opacity="0.3" />
          <path d={RAMBLA_PATH} stroke="#c4b898" strokeWidth="2.5" opacity="0.55" />

          {/* Ronda de Sant Pere / Universitat */}
          <path d={RONDA_PATH} stroke="#a89878" strokeWidth="3" opacity="0.25" />
          <path d={RONDA_PATH} stroke="#c4b898" strokeWidth="2" opacity="0.5" />
        </g>

        {/* ========== LANDMARKS ========== */}

        {/* Placa Catalunya - large oval */}
        <ellipse
          cx={PL_CATALUNYA.x}
          cy={PL_CATALUNYA.y}
          rx="28"
          ry="20"
          fill="#e2dac6"
          stroke="#c4b898"
          strokeWidth="1.5"
          opacity="0.7"
        />
        <ellipse
          cx={PL_CATALUNYA.x}
          cy={PL_CATALUNYA.y}
          rx="22"
          ry="15"
          fill="none"
          stroke="#b5a88e"
          strokeWidth="0.5"
          strokeDasharray="3 2"
          opacity="0.5"
        />
        <text
          x={PL_CATALUNYA.x}
          y={PL_CATALUNYA.y + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="7"
          fontFamily="'Newsreader', serif"
          fontStyle="italic"
          fill="#6b5d48"
          opacity="0.85"
        >
          Pl. Catalunya
        </text>

        {/* CCCB area - small rectangle */}
        <rect
          x={CCCB_POS.x - 14}
          y={CCCB_POS.y - 10}
          width="28"
          height="20"
          rx="2"
          fill="#e2dac6"
          stroke="#c4b898"
          strokeWidth="1"
          opacity="0.6"
        />
        <text
          x={CCCB_POS.x}
          y={CCCB_POS.y + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="6.5"
          fontFamily="'Newsreader', serif"
          fontStyle="italic"
          fill="#6b5d48"
          opacity="0.8"
        >
          CCCB
        </text>

        {/* ========== STREET LABELS ========== */}
        <g>
          {STREET_LABELS.map((label) => (
            <text
              key={label.text}
              x={label.pos.x}
              y={label.pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="7.5"
              fontFamily="'Newsreader', serif"
              fontStyle="italic"
              fill="#8b7355"
              opacity="0.65"
              letterSpacing="0.5"
              transform={`rotate(${label.angle} ${label.pos.x} ${label.pos.y})`}
            >
              {label.text}
            </text>
          ))}
        </g>

        {/* ========== DECORATIVE COMPASS ROSE (top-right) ========== */}
        <g transform="translate(745, 45)" opacity="0.3">
          <circle cx="0" cy="0" r="14" fill="none" stroke="#8b7355" strokeWidth="0.7" />
          <line x1="0" y1="-12" x2="0" y2="12" stroke="#8b7355" strokeWidth="0.7" />
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#8b7355" strokeWidth="0.7" />
          <polygon points="0,-11 -2.5,-3 2.5,-3" fill="#86001b" opacity="0.7" />
          <polygon points="0,11 -2.5,3 2.5,3" fill="#8b7355" opacity="0.5" />
          <text x="0" y="-17" textAnchor="middle" fontSize="6" fontFamily="'Newsreader', serif" fontStyle="italic" fill="#8b7355">N</text>
        </g>

        {/* ========== LOCATION MARKERS ========== */}
        {markerElements}

        {/* ========== TOOLTIP ========== */}
        {hoveredLocation && tooltipPos && (
          <g pointerEvents="none">
            {/* Tooltip background */}
            <rect
              x={tooltipPos.x - 80}
              y={tooltipPos.y - 42}
              width="160"
              height="24"
              rx="6"
              fill="#1c1c18"
              fillOpacity="0.88"
            />
            {/* Tooltip arrow */}
            <polygon
              points={`${tooltipPos.x - 5},${tooltipPos.y - 18} ${tooltipPos.x + 5},${tooltipPos.y - 18} ${tooltipPos.x},${tooltipPos.y - 12}`}
              fill="#1c1c18"
              fillOpacity="0.88"
            />
            {/* Tooltip text */}
            <text
              x={tooltipPos.x}
              y={tooltipPos.y - 27}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fff"
              fontSize="8"
              fontFamily="'Manrope', sans-serif"
              fontWeight="600"
            >
              {hoveredLocation.length > 32
                ? hoveredLocation.slice(0, 30) + '...'
                : hoveredLocation}
            </text>
          </g>
        )}

        {/* ========== DECORATIVE ROSE (bottom-left corner) ========== */}
        <g transform="translate(52, 556) scale(0.75)">
          {/* Stem */}
          <path
            d="M 0 0 Q -3 -14 -1 -30"
            stroke="url(#stem-fill)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* Leaf left */}
          <path
            d="M -2 -14 Q -12 -20 -14 -14 Q -10 -10 -2 -14"
            fill="#2d5a27"
            opacity="0.7"
          />
          {/* Leaf right */}
          <path
            d="M -1 -20 Q 8 -28 11 -22 Q 6 -18 -1 -20"
            fill="#2d5a27"
            opacity="0.6"
          />
          {/* Outer petals */}
          <path
            d="M -1 -30 Q -10 -42 -4 -50 Q 0 -44 -1 -30"
            fill="url(#rose-fill)"
            opacity="0.85"
          />
          <path
            d="M -1 -30 Q 8 -42 4 -50 Q -2 -44 -1 -30"
            fill="url(#rose-fill)"
            opacity="0.9"
          />
          <path
            d="M -1 -30 Q -14 -36 -12 -46 Q -5 -40 -1 -30"
            fill="#a0102a"
            opacity="0.7"
          />
          <path
            d="M -1 -30 Q 12 -34 12 -44 Q 4 -38 -1 -30"
            fill="#a0102a"
            opacity="0.65"
          />
          {/* Inner petals */}
          <path
            d="M -1 -34 Q -5 -42 -2 -47 Q 0 -41 -1 -34"
            fill="#c4324e"
            opacity="0.8"
          />
          <path
            d="M -1 -34 Q 3 -42 1 -47 Q -1 -41 -1 -34"
            fill="#c4324e"
            opacity="0.85"
          />
          {/* Center */}
          <circle cx="-1" cy="-35" r="2" fill="#86001b" opacity="0.9" />
        </g>

        {/* ========== TITLE LABEL (bottom) ========== */}
        <text
          x="400"
          y="580"
          textAnchor="middle"
          fontSize="14"
          fontFamily="'Newsreader', serif"
          fontStyle="italic"
          fill="#86001b"
          opacity="0.55"
          letterSpacing="2"
        >
          Sant Jordi 2026
        </text>

        {/* Subtle border */}
        <rect
          x="1"
          y="1"
          width="798"
          height="598"
          rx="8"
          fill="none"
          stroke="#c4b898"
          strokeWidth="1.5"
          opacity="0.25"
        />
        {/* Inner decorative border */}
        <rect
          x="8"
          y="8"
          width="784"
          height="584"
          rx="4"
          fill="none"
          stroke="#c4b898"
          strokeWidth="0.5"
          opacity="0.15"
        />
      </svg>
    </div>
  );
}
