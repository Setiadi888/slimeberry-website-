'use client';

import { PALETTE } from '@/lib/palette';
import { NO_HIT } from './StationGroup';

/**
 * A bench microscope, about 0.3 tall.
 *
 * Built the way one actually reads at a glance: a heavy foot, a limb curving up
 * behind the stage, the turret of objectives hanging over it, and the eyepiece
 * tube raked back toward whoever is sitting down. The slide on the stage is a
 * white rectangle with a smear of something pink on it, which is the only part
 * of this that has anything to do with slime.
 */
export function Microscope({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  const metal = PALETTE.metalDark;
  const body = '#e9edf2';

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* foot */}
      <mesh position={[0, 0.014, -0.01]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.17, 0.028, 0.15]} />
        <meshStandardMaterial color={metal} roughness={0.45} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.032, -0.01]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.13, 0.014, 0.11]} />
        <meshStandardMaterial color={body} roughness={0.5} />
      </mesh>

      {/* the limb, up the back and curving over the stage */}
      <mesh position={[0, 0.13, -0.055]} rotation={[0.12, 0, 0]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.055, 0.2, 0.045]} />
        <meshStandardMaterial color={body} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.232, -0.043]} castShadow raycast={NO_HIT}>
        <sphereGeometry args={[0.032, 14, 12]} />
        <meshStandardMaterial color={body} roughness={0.5} />
      </mesh>

      {/* focus knobs, one either side */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.042, 0.088, -0.05]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
          raycast={NO_HIT}
        >
          <cylinderGeometry args={[0.024, 0.024, 0.016, 14]} />
          <meshStandardMaterial color={metal} roughness={0.4} metalness={0.4} />
        </mesh>
      ))}

      {/* stage, its clips, and the slide */}
      <mesh position={[0, 0.112, 0.012]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.135, 0.012, 0.115]} />
        <meshStandardMaterial color={metal} roughness={0.42} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.119, 0.016]} raycast={NO_HIT}>
        <boxGeometry args={[0.055, 0.003, 0.028]} />
        <meshStandardMaterial color="#fdfbf6" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.121, 0.016]} raycast={NO_HIT}>
        <boxGeometry args={[0.016, 0.001, 0.014]} />
        <meshStandardMaterial color="#f2a8c4" roughness={0.35} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.038, 0.122, 0.0]} raycast={NO_HIT}>
          <boxGeometry args={[0.01, 0.006, 0.05]} />
          <meshStandardMaterial color={metal} roughness={0.4} metalness={0.4} />
        </mesh>
      ))}

      {/* the lamp housing under the stage */}
      <mesh position={[0, 0.062, 0.012]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.028, 0.032, 0.03, 14]} />
        <meshStandardMaterial color={body} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.079, 0.012]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.018, 0.018, 0.004, 14]} />
        <meshStandardMaterial color="#fff6dd" emissive="#ffe9b8" emissiveIntensity={0.8} roughness={0.3} />
      </mesh>

      {/* turret and three objectives */}
      <mesh position={[0, 0.192, 0.012]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.036, 0.036, 0.022, 16]} />
        <meshStandardMaterial color={metal} roughness={0.4} metalness={0.45} />
      </mesh>
      {[-0.55, 0, 0.55].map((angle, index) => (
        <mesh
          key={index}
          position={[Math.sin(angle) * 0.022, 0.166, 0.012 + Math.cos(angle) * 0.022]}
          rotation={[angle * 0.25, 0, 0]}
          castShadow
          raycast={NO_HIT}
        >
          <cylinderGeometry args={[0.009, 0.011, 0.038, 12]} />
          <meshStandardMaterial color={index === 1 ? '#c8d2de' : metal} roughness={0.35} metalness={0.5} />
        </mesh>
      ))}

      {/* eyepiece tube, raked back toward the bench stool */}
      <group position={[0, 0.222, -0.018]} rotation={[-0.55, 0, 0]}>
        <mesh position={[0, 0.045, 0]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.019, 0.023, 0.095, 14]} />
          <meshStandardMaterial color={body} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.1, 0]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.024, 0.021, 0.028, 14]} />
          <meshStandardMaterial color={metal} roughness={0.4} metalness={0.45} />
        </mesh>
        <mesh position={[0, 0.115, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={NO_HIT}>
          <circleGeometry args={[0.019, 14]} />
          <meshPhysicalMaterial color="#2a3038" roughness={0.1} clearcoat={1} />
        </mesh>
      </group>
    </group>
  );
}
