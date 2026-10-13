'use client';
import { RoundedBox } from '@react-three/drei';
import { PALETTE } from '@/lib/palette';
import { STATION_POS } from '@/lib/layout';
import { NO_HIT, StationGroup } from './StationGroup';
import { GreenhouseBed } from './GreenhouseBed';
/** A pitched propagation house, with five independent seed drawers. */
export function Greenhouse() {
    return <StationGroup id="greenhouse" position={STATION_POS.greenhouse} ringRadius={1.55} ringColor="#8fbc6d">
    <RoundedBox args={[3, .42, 1.5]} radius={.06} smoothness={3} position={[0, .21, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={PALETTE.wood} roughness={.85}/>
    </RoundedBox>
    <mesh position={[0, .44, 0]} raycast={NO_HIT}><boxGeometry args={[2.8, .06, 1.32]}/><meshStandardMaterial color="#65503f" roughness={1}/></mesh>
    {[0, 1, 2, 3, 4].map(i => <GreenhouseBed key={i} index={i}/>)}
    {[-1.5, 1.5].map(x => <group key={x} position={[x, 0, 0]}>
      {[-.72, .72].map(z => <mesh key={z} position={[0, 1.16, z]} raycast={NO_HIT}>
        <boxGeometry args={[.045, 1.45, .045]}/><meshStandardMaterial color="#d2dcd0" roughness={.5}/></mesh>)}
      {[-1, 1].map(side => <mesh key={side} position={[0, 2.0, side * .36]} rotation={[side * .39, 0, 0]} raycast={NO_HIT}>
        <boxGeometry args={[.045, .045, .82]}/><meshStandardMaterial color="#d2dcd0" roughness={.5}/></mesh>)}
    </group>)}
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[0, 2.0, side * .38]} rotation={[side * .39, 0, 0]} raycast={NO_HIT}>
        <boxGeometry args={[3.08, .02, .82]}/><meshPhysicalMaterial color="#e0eddf" transparent opacity={.18} roughness={.35} depthWrite={false}/></mesh>
      <mesh position={[0, 1.86, side * .76]} raycast={NO_HIT}><boxGeometry args={[3.12, .065, .065]}/><meshStandardMaterial color={PALETTE.mint} roughness={.7}/></mesh>
    </group>)}
    <mesh position={[0, 2.17, 0]} raycast={NO_HIT}><boxGeometry args={[3.14, .065, .08]}/><meshStandardMaterial color={PALETTE.mint} roughness={.7}/></mesh>
    {/* Low retaining lips hide each harvested crop as its drawer lowers. */}
    {[-.72, .72].map(z => <mesh key={z} position={[0, .52, z]} raycast={NO_HIT}>
      <boxGeometry args={[3, .12, .04]}/><meshStandardMaterial color={PALETTE.woodDark} roughness={.8}/></mesh>)}
  </StationGroup>;
}
