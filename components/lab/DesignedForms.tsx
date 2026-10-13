'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { NO_HIT } from './StationGroup';
export type Profile = ReadonlyArray<readonly [
    number,
    number
]>;
/** Turned and moulded parts, with the actual lip, shoulder and foot in silhouette. */
export function TurnedForm({ profile, color, metalness = 0, roughness = .65, segments = 32 }: {
    profile: Profile;
    color: string;
    metalness?: number;
    roughness?: number;
    segments?: number;
}) {
    const geometry = useMemo(() => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments), [profile, segments]);
    useEffect(() => () => geometry.dispose(), [geometry]);
    return <mesh geometry={geometry} castShadow receiveShadow raycast={NO_HIT}>
    <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} side={THREE.DoubleSide}/>
  </mesh>;
}
/** A broad shoulder, chamfered top and tucked-in toe instead of a rounded cube. */
export function Housing({ width, height, depth, color, children }: {
    width: number;
    height: number;
    depth: number;
    color: string;
    children?: React.ReactNode;
}) {
    const geometry = useMemo(() => {
        const w = width / 2, h = height / 2;
        const shape = new THREE.Shape();
        shape.moveTo(-w * .88, -h);
        shape.lineTo(w * .88, -h);
        shape.lineTo(w, -h * .68);
        shape.lineTo(w, h * .64);
        shape.quadraticCurveTo(w, h, w * .72, h);
        shape.lineTo(-w * .7, h);
        shape.lineTo(-w, h * .54);
        shape.lineTo(-w, -h * .68);
        shape.closePath();
        const result = new THREE.ExtrudeGeometry(shape, { depth: depth - .06, bevelEnabled: true,
            bevelSize: .025, bevelThickness: .03, bevelSegments: 2, steps: 1, curveSegments: 6 });
        result.translate(0, 0, -depth / 2 + .03);
        return result;
    }, [width, height, depth]);
    useEffect(() => () => geometry.dispose(), [geometry]);
    return <mesh geometry={geometry} castShadow receiveShadow>
    <meshStandardMaterial color={color} roughness={.48} metalness={.12}/>{children}
  </mesh>;
}
export const POT_PROFILE: Profile = [[0, 0], [.18, 0], [.2, .025], [.205, .06], [.235, .12], [.26, .32],
    [.26, .41], [.278, .435], [.278, .465], [.244, .465], [.24, .42], [.22, .12], [.17, .055], [0, .055]];
export const TABLE_FOOT: Profile = [[0, 0], [.43, 0], [.49, .025], [.5, .06], [.46, .09], [.3, .13],
    [.18, .2], [.11, .38], [.1, .65], [.14, .84], [.26, .89], [0, .89]];
export const STOOL_SEAT: Profile = [[0, -.05], [.2, -.05], [.24, -.025], [.25, .01], [.235, .05], [.17, .055], [.1, .035], [0, .03]];
export const MUG_PROFILE: Profile = [[0, 0], [.051, 0], [.062, .01], [.069, .055], [.074, .13], [.07, .144],
    [.06, .144], [.059, .125], [.054, .03], [0, .026]];
export function InsetTray({ width, depth, color }: {
    width: number;
    depth: number;
    color: string;
}) {
    return <group>
    <mesh position={[0, .006, 0]} raycast={NO_HIT}><boxGeometry args={[width, .012, depth]}/>
      <meshStandardMaterial color={color} roughness={.75}/></mesh>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * (width / 2 - .008), .035, 0]} rotation={[0, 0, side * -.12]} raycast={NO_HIT}>
        <boxGeometry args={[.016, .065, depth]}/><meshStandardMaterial color={color} roughness={.65}/></mesh>
      <mesh position={[0, .035, side * (depth / 2 - .008)]} raycast={NO_HIT}>
        <boxGeometry args={[width, .065, .016]}/><meshStandardMaterial color={color} roughness={.65}/></mesh>
    </group>)}
  </group>;
}
/** Recessed access door, ventilation slots and a turned pull give a panel purpose. */
export function ServicePanel({ width = .65, height = .38 }: {
    width?: number;
    height?: number;
}) {
    return <group>
    <mesh raycast={NO_HIT}><boxGeometry args={[width, height, .016]}/><meshStandardMaterial color="#c8cbbf" roughness={.75}/></mesh>
    <mesh position={[0, 0, .012]} raycast={NO_HIT}><boxGeometry args={[width - .03, height - .03, .01]}/><meshStandardMaterial color="#ecebe1" roughness={.7}/></mesh>
    {[0, 1, 2, 3].map(i => <mesh key={i} position={[-width * .16, (i - 1.5) * height * .14, .021]} raycast={NO_HIT}>
      <boxGeometry args={[width * .48, .012, .007]}/><meshStandardMaterial color="#7d8885" roughness={.8}/></mesh>)}
    <mesh position={[width * .32, 0, .035]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_HIT}>
      <cylinderGeometry args={[.024, .024, .025, 10]}/><meshStandardMaterial color="#8f9c99" metalness={.55} roughness={.35}/></mesh>
  </group>;
}
