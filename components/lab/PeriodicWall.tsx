'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { BELT, STATION_POS, WALL_FACE_X } from '@/lib/layout';
import { ELEMENTS, TABLE_COLS, TABLE_GAP, TABLE_ROWS, isSlimeRecipe } from '@/lib/elements';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, setView, useView } from '@/lib/interaction';
import { chirp, elementHover, puzzleChime } from '@/lib/audio';
import { NO_HIT } from './StationGroup';

const CANVAS_W = 1792;
const CANVAS_H = 840;

/*
  Where the board hangs, derived from its two neighbours rather than measured off
  a screenshot: the staff door's head rail reaches 0.88 past the door's centre
  and the discharge hood 0.74 short of the belt, so the run of bare wall between
  them is known and the board is centred in it.
*/
const WALL_FROM = STATION_POS.staffDoor[2] + 0.88;
const WALL_TO = BELT.z - 0.74;
const BOARD_Z = (WALL_FROM + WALL_TO) / 2;

/**
 * Metres. The lightbox matches the canvas printed on it.
 *
 * The frame is 0.16 wider than the panel, so 3.3 is what leaves a clear hand's
 * width of wall at both ends of a 3.78 gap. Anything wider and it reads as
 * touching whichever neighbour it is nearest.
 */
const PANEL_W = 3.3;
const PANEL_H = PANEL_W * (CANVAS_H / CANVAS_W);

const PAD_X = 26;
/** Deep enough for a masthead rather than a caption. */
const TITLE_H = 104;
const STATUS_H = 56;

const COL_W = (CANVAS_W - PAD_X * 2) / TABLE_COLS;
const ROW_H = (CANVAS_H - TITLE_H - STATUS_H) / (TABLE_ROWS + TABLE_GAP);

const INK = '#3f4756';
const ORANGE = '#d9761a';
const GREEN = '#2f8f4e';

const GLOW_IDLE = new THREE.Color('#cfd6e4');
const GLOW_SOLVED = new THREE.Color('#8fd6a4');

interface Cell {
  symbol: string;
  z: number;
  /** The printed tile. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** What answers a press: the whole pitch, gaps included. */
  hx: number;
  hy: number;
}

/**
 * Where every element sits on the canvas.
 *
 * Built once, and used for both jobs: drawing the table, and working out which
 * element the visitor just pressed. One source for the two means a cell can
 * never be drawn somewhere it cannot be hit.
 */
const CELLS: Cell[] = ELEMENTS.map((element) => {
  const x = PAD_X + (element.col - 1) * COL_W;
  // the f-block is dropped half a row clear of the main body
  const y = TITLE_H + (element.row - 1 + (element.row >= 8 ? TABLE_GAP : 0)) * ROW_H;
  /*
    The tile is drawn inset from its pitch so the grid has gutters, but the press
    takes the whole pitch. On the wall a cell is about twenty-five pixels across,
    and giving four of those back to a gutter you cannot see is four too many.
  */
  return { symbol: element.symbol, z: element.z, x, y, w: COL_W - 8, h: ROW_H - 6, hx: x - 4, hy: y - 3 };
});

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Blobs on the backing, as [x, y, radius, colour]. Fixed, not thrown. */
const BLOBS: ReadonlyArray<readonly [number, number, number, string]> = [
  [170, 140, 165, 'rgba(243,143,180,0.62)'],
  [520, 600, 190, 'rgba(158,214,92,0.55)'],
  [900, 110, 145, 'rgba(120,201,232,0.55)'],
  [1300, 590, 180, 'rgba(246,206,88,0.55)'],
  [1630, 175, 150, 'rgba(178,152,229,0.52)'],
  [1080, 655, 130, 'rgba(243,143,180,0.45)'],
  [700, 320, 115, 'rgba(158,214,92,0.38)'],
  [1460, 350, 105, 'rgba(120,201,232,0.4)'],
];

/**
 * One blob, wobbled and dripping.
 *
 * The wobble is a sum of two sines driven by the blob's own coordinates rather
 * than by `Math.random`, so the shape is the same every time it is drawn. That
 * matters more than it looks: the backing is repainted on every hover, and a
 * random blob would writhe under the cursor.
 */
function slimeBlob(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, colour: string) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  const points = 30;
  for (let i = 0; i <= points; i += 1) {
    const a = (i / points) * Math.PI * 2;
    const wobble = 1 + Math.sin(a * 3 + cx * 0.01) * 0.12 + Math.sin(a * 5 + cy * 0.01) * 0.07;
    const x = cx + Math.cos(a) * r * wobble * 1.2;
    const y = cy + Math.sin(a) * r * wobble * 0.78;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // two drips, which is what makes a shape read as slime rather than as a cloud
  [-0.42, 0.3].forEach((offset, index) => {
    const dx = cx + offset * r * 1.1;
    const top = cy + r * 0.62;
    const length = r * (0.42 + index * 0.24);
    const width = r * (0.13 - index * 0.03);
    ctx.beginPath();
    ctx.moveTo(dx - width, top);
    ctx.quadraticCurveTo(dx - width * 0.8, top + length, dx, top + length);
    ctx.quadraticCurveTo(dx + width * 0.8, top + length, dx + width, top);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dx, top + length, width * 0.95, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * The printed backing, built once and blitted under the grid on every repaint.
 *
 * Kept off the live canvas because the grid is redrawn whenever the cursor moves
 * to a new element, and re-running eight blobs and their drips for that would be
 * work done sixty times a second to produce an identical result.
 */
function buildGround(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const wash = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  wash.addColorStop(0, '#ffe9f1');
  wash.addColorStop(0.5, '#fff6e0');
  wash.addColorStop(1, '#e2f5e6');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  BLOBS.forEach(([x, y, r, colour]) => slimeBlob(ctx, x, y, r, colour));

  // the diffuser's own brightness, laid back over the top so it stays a lightbox
  const glare = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  glare.addColorStop(0, 'rgba(255,255,255,0.26)');
  glare.addColorStop(0.45, 'rgba(255,255,255,0.04)');
  glare.addColorStop(1, 'rgba(255,255,255,0.2)');
  ctx.fillStyle = glare;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  return canvas;
}

const GROUND = buildGround();

const face = (size: number, weight = 'bold') =>
  `${weight} ${size}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;

/**
 * Draws the whole table.
 *
 * Cheap enough to redraw outright rather than track dirty cells — a hundred and
 * eighteen rounded rectangles and their labels is about a millisecond — and it
 * only happens when the selection or the hovered cell actually changes, which is
 * a handful of times a second at worst.
 */
function paint(
  ctx: CanvasRenderingContext2D,
  chosen: readonly string[],
  solved: boolean,
  hover: number | null,
) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  if (GROUND) ctx.drawImage(GROUND, 0, 0);

  ctx.textBaseline = 'middle';

  /* ---- masthead -------------------------------------------------------- */
  ctx.textAlign = 'center';
  ctx.font = face(58);
  // the title is one of the board's letters too, so it turns with the rest
  ctx.fillStyle = solved ? GREEN : INK;
  ctx.fillText('PERIODIC TABLE', CANVAS_W / 2, 44);

  ctx.font = face(20, '600');
  ctx.fillStyle = solved ? 'rgba(47,143,78,0.6)' : 'rgba(63,71,86,0.42)';
  ctx.fillText('SLIMEBERRY LAB · R&D', CANVAS_W / 2, 84);

  /* ---- the table ------------------------------------------------------- */
  CELLS.forEach((cell, index) => {
    const picked = chosen.includes(cell.symbol);

    /*
      The tiles are frosted rather than tinted: the backing underneath is
      coloured, and a letter has to stay readable over whichever blob it happens
      to be sitting on.
    */
    let fill = 'rgba(255,255,255,0.7)';
    let stroke = 'rgba(63,71,86,0.13)';
    let letter = INK;

    if (solved) {
      // everything goes green, and the five that did it go a shade stronger
      fill = picked ? 'rgba(214,244,222,0.94)' : 'rgba(240,252,243,0.8)';
      stroke = picked ? 'rgba(47,143,78,0.7)' : 'rgba(47,143,78,0.28)';
      letter = GREEN;
    } else if (picked) {
      fill = 'rgba(255,235,212,0.94)';
      stroke = 'rgba(217,118,26,0.8)';
      letter = ORANGE;
    }

    if (index === hover && !picked && !solved) {
      fill = 'rgba(255,255,255,0.92)';
      stroke = 'rgba(63,71,86,0.45)';
    }

    ctx.fillStyle = fill;
    roundedRect(ctx, cell.x, cell.y, cell.w, cell.h, 9);
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = index === hover ? 2.4 : 1.4;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = face(13, '600');
    ctx.fillStyle = solved || picked ? letter : 'rgba(63,71,86,0.55)';
    ctx.fillText(String(cell.z), cell.x + 7, cell.y + 13);

    ctx.textAlign = 'center';
    ctx.font = face(30);
    ctx.fillStyle = letter;
    ctx.fillText(cell.symbol, cell.x + cell.w / 2, cell.y + cell.h * 0.62);
  });

  /* ---- the line along the bottom --------------------------------------- */
  const baseline = CANVAS_H - STATUS_H / 2 - 2;
  ctx.textAlign = 'left';
  ctx.font = face(23, '600');

  if (solved) {
    ctx.fillStyle = GREEN;
    ctx.fillText('B · Na · O · C · H  =  SLIME', PAD_X, baseline);
  } else if (chosen.length > 0) {
    ctx.fillStyle = ORANGE;
    ctx.fillText(chosen.join('  ·  '), PAD_X, baseline);
  } else {
    ctx.fillStyle = 'rgba(63,71,86,0.5)';
    ctx.fillText('PRESS THE ELEMENTS SLIME IS MADE OF', PAD_X, baseline);
  }

  ctx.textAlign = 'right';
  ctx.font = face(19, '600');
  ctx.fillStyle = solved ? GREEN : 'rgba(63,71,86,0.35)';
  ctx.fillText(solved ? 'BATCH APPROVED' : `${chosen.length} SELECTED`, CANVAS_W - PAD_X, baseline);
}

/**
 * The periodic table on the lab wall, and the puzzle inside it.
 *
 * Hung on the west wall over the texture bench, which is the right room for it:
 * texture is where a batch is judged on what it is made of, and the board is the
 * list of everything it could be made of.
 *
 * A backlit white box with all hundred and eighteen elements printed on it —
 * one mesh, one canvas, one raycast target. Which element you pressed is worked
 * out from the UV of the hit rather than from a grid of little invisible
 * buttons: a hundred and eighteen extra objects in the scene would cost more
 * than the table does.
 *
 * The puzzle is the recipe. Boron, sodium, oxygen, carbon and hydrogen are
 * every element in borax and PVA glue, and pressing exactly those five — no
 * more, no fewer — turns the whole table green. Anything pressed goes orange on
 * the way, so a wrong guess is visible and reversible rather than a dead end.
 *
 * The first press on the wall frames it up rather than choosing an element. At
 * the room's default distance a cell is nine pixels across, which is not a
 * button; once the camera has come in it is thirty-five, which is.
 */
export function PeriodicWall() {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef<THREE.MeshBasicMaterial>(null);

  const [chosen, setChosen] = useState<string[]>([]);
  const solved = useMemo(() => isSlimeRecipe(chosen), [chosen]);
  /*
    Framed with a camera preset rather than by selecting it. Selecting a station
    opens its detail card, and a card floating over the middle of the board would
    cover the half of the puzzle you are trying to read. The hover card still
    explains the rules from across the room; once the wall is framed up, the
    chrome gets out of the way entirely.
  */
  const framed = useView() === 'periodic';

  /* Read from inside the pointer handlers, which are not re-created per press. */
  const chosenRef = useRef(chosen);
  chosenRef.current = chosen;
  const solvedRef = useRef(solved);
  solvedRef.current = solved;
  const hoverRef = useRef<number | null>(null);

  const painted = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return { ctx, texture };
  }, []);

  const repaint = useCallback(() => {
    if (!painted) return;
    paint(painted.ctx, chosenRef.current, solvedRef.current, hoverRef.current);
    painted.texture.needsUpdate = true;
  }, [painted]);

  useEffect(repaint, [repaint, chosen, solved]);
  useEffect(() => () => painted?.texture.dispose(), [painted]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    registerAnchor('station', 'periodic', group);
    return () => {
      unregisterAnchor('station', 'periodic');
      document.body.style.cursor = 'auto';
    };
  }, []);

  // the moment it comes together
  useEffect(() => {
    if (solved) puzzleChime();
  }, [solved]);

  // the hover highlight is only meaningful once the wall has been framed up
  useEffect(() => {
    if (framed) return;
    if (hoverRef.current === null) return;
    hoverRef.current = null;
    repaint();
  }, [framed, repaint]);

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30);
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = THREE.MathUtils.damp(
        materialRef.current.emissiveIntensity,
        solved ? 0.95 : 0.58,
        5,
        step,
      );
    }
    if (glowRef.current) {
      glowRef.current.color.lerp(solved ? GLOW_SOLVED : GLOW_IDLE, Math.min(1, step * 4));
      glowRef.current.opacity = THREE.MathUtils.damp(
        glowRef.current.opacity,
        solved ? 0.34 : 0.15,
        5,
        step,
      );
    }
  });

  /** Which element is under a hit, from its place on the printed face. */
  const cellAt = (uv: THREE.Vector2 | undefined): number | null => {
    if (!uv) return null;
    const px = uv.x * CANVAS_W;
    // the texture's origin is the bottom left; the canvas's is the top left
    const py = (1 - uv.y) * CANVAS_H;
    const index = CELLS.findIndex(
      (cell) => px >= cell.hx && px <= cell.hx + COL_W && py >= cell.hy && py <= cell.hy + ROW_H,
    );
    return index === -1 ? null : index;
  };

  const press = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (!framed) {
      // bring the wall forward first; at arm's length the cells are buttons
      hoverEntity(null);
      setView('periodic');
      return;
    }
    const index = cellAt(event.uv);
    if (index === null) return;
    const symbol = CELLS[index].symbol;
    chirp(chosenRef.current.includes(symbol));
    setChosen((current) =>
      current.includes(symbol)
        ? current.filter((entry) => entry !== symbol)
        : [...current, symbol],
    );
  };

  if (!painted) return null;

  return (
    <group
      ref={groupRef}
      /*
        On the west wall, directly over the texture bench — which tops out at 1.6,
        so the board starts at 2.0 and there is daylight between them.

        The group sits a metre and a bit below the panel on purpose: the camera
        frames a station by looking at its anchor plus 1.1, so putting the origin
        here is what centres the table in the shot rather than the wall above it.
      */
      position={[WALL_FACE_X + 0.1, 1.67, BOARD_Z]}
      rotation={[0, Math.PI / 2, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (!framed) hoverEntity({ kind: 'station', id: 'periodic' });
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverEntity(null);
        document.body.style.cursor = 'auto';
      }}
      onPointerMove={(event) => {
        if (!framed) return;
        const index = cellAt(event.uv);
        if (index === hoverRef.current) return;
        hoverRef.current = index;
        if (index !== null) elementHover(CELLS[index].z);
        repaint();
      }}
      onClick={press}
    >
      {/* spill onto the plaster, so it reads as a light and not a poster */}
      <mesh position={[0, 1.1, -0.06]} raycast={NO_HIT}>
        <planeGeometry args={[PANEL_W + 0.9, PANEL_H + 0.8]} />
        <meshBasicMaterial ref={glowRef} color="#cfd6e4" transparent opacity={0.15} depthWrite={false} />
      </mesh>

      {/* the box itself */}
      <RoundedBox
        args={[PANEL_W + 0.16, PANEL_H + 0.16, 0.1]}
        radius={0.04}
        smoothness={3}
        position={[0, 1.1, -0.05]}
        castShadow
        receiveShadow
        raycast={NO_HIT}
      >
        <meshStandardMaterial color={PALETTE.shell} roughness={0.55} />
      </RoundedBox>

      {/* the printed diffuser — the one thing here that answers the pointer */}
      <mesh position={[0, 1.1, 0.006]}>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshStandardMaterial
          ref={materialRef}
          map={painted.texture}
          emissiveMap={painted.texture}
          emissive="#ffffff"
          emissiveIntensity={0.58}
          roughness={0.95}
        />
      </mesh>

      {/* a fixing at each corner, so the box is bolted to something */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sy]) => (
        <mesh
          key={`${sx}${sy}`}
          position={[sx * (PANEL_W / 2 + 0.02), 1.1 + sy * (PANEL_H / 2 + 0.02), 0.03]}
          rotation={[Math.PI / 2, 0, 0]}
          raycast={NO_HIT}
        >
          <cylinderGeometry args={[0.026, 0.026, 0.05, 10]} />
          <meshStandardMaterial color={PALETTE.metal} roughness={0.35} metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}
