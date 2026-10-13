'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { drawPlant, growthAt, PLANT_SPECIES, releasePlant, type LeafForm, type PlantSpecies } from '@/lib/greenhouse';
import { NO_HIT } from './StationGroup';
import { useLabQuality } from './QualityContext';
function leafGeometry(form: LeafForm): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    if (form === 'round')
        shape.absellipse(0, .42, .34, .39, 0, Math.PI * 2, false, 0);
    else {
        const points: THREE.Vector2[] = [];
        for (const side of [1, -1])
            for (let i = 0; i <= 32; i++) {
                const t = side === 1 ? i / 32 : 1 - i / 32;
                let w = Math.sin(Math.PI * t) ** .72 * (form === 'grass' ? .06 : form === 'lance' ? .14 : .3);
                if (form === 'heart')
                    w = Math.sin(Math.PI * t) ** .55 * .35 * (1 - t * .45);
                if (form === 'split')
                    for (const notch of [.3, .52, .72])
                        w *= 1 - .82 * Math.max(0, 1 - Math.abs(t - notch) / .043);
                points.push(new THREE.Vector2(side * w, t));
            }
        shape.setFromPoints(points);
    }
    const base = new THREE.ShapeGeometry(shape, 8);
    const attr = base.getAttribute('position');
    for (let i = 0; i < attr.count; i++)
        attr.setZ(i, Math.sin(attr.getY(i) * Math.PI) * .09 + Math.abs(attr.getX(i)) * .18);
    base.computeVertexNormals();
    if (form !== 'fern' && form !== 'palm')
        return base;
    const pieces: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 9; i++)
        for (const side of [-1, 1]) {
            const p = base.clone(), y = .1 + i * .09, size = (1 - y * .65) * (form === 'palm' ? .42 : .27);
            p.scale(size * .42, size, size);
            p.rotateZ(side * -.98);
            p.translate(0, y, 0);
            pieces.push(p);
        }
    base.dispose();
    const merged = mergeGeometries(pieces);
    pieces.forEach(p => p.dispose());
    return merged;
}
/** Each species is three draw calls: stems, leaves and flowers/fruit. */
function specimenGeometry(species: PlantSpecies) {
    const leaves: THREE.BufferGeometry[] = [], stems: THREE.BufferGeometry[] = [], flowers: THREE.BufferGeometry[] = [];
    const blade = leafGeometry(species.leaf);
    const transform = new THREE.Object3D();
    const stem = new THREE.CylinderGeometry(.008, .012, 1, 5).toNonIndexed();
    const leaf = blade.index ? blade.toNonIndexed() : blade.clone();
    blade.dispose();
    for (let i = 0; i < species.leaves; i++) {
        const angle = i * 2.399, tier = i % 4, length = (.38 + tier * .065) * species.spread;
        const y = .13 + tier * .095;
        transform.position.set(0, y, 0);
        transform.rotation.set(.6 + tier * .12, angle, 0);
        transform.scale.set(length, length, length);
        transform.updateMatrix();
        leaves.push(leaf.clone().applyMatrix4(transform.matrix));
        transform.position.set(0, y / 2, 0);
        transform.rotation.set(0, 0, 0);
        transform.scale.set(1, y, 1);
        transform.updateMatrix();
        stems.push(stem.clone().applyMatrix4(transform.matrix));
        if (['calathea', 'pothos', 'banana'].includes(species.id)) {
            const vein = new THREE.CylinderGeometry(.006, .008, length * .78, 4).toNonIndexed();
            transform.position.set(0, y, 0);
            transform.rotation.set(.6 + tier * .12, angle, 0);
            transform.scale.set(1, 1, 1);
            transform.updateMatrix();
            vein.translate(0, length * .39, .015).applyMatrix4(transform.matrix);
            stems.push(vein);
        }
    }
    const heads = species.id === 'sunflower' ? 1 : species.bloom === 'spike' ? 4 : 3;
    if (species.bloom !== 'none')
        for (let i = 0; i < heads; i++) {
            const angle = i * 2.4, x = Math.cos(angle) * .12, z = Math.sin(angle) * .12;
            const y = (species.bloom === 'berry' || species.bloom === 'pepper' ? .5 : .78) + i * .04;
            stems.push(stem.clone().scale(1, y, 1).translate(x, y / 2, z));
            if (species.bloom === 'berry' || species.bloom === 'pepper') {
                const fruit = new THREE.SphereGeometry(.062, 9, 7).toNonIndexed();
                fruit.scale(1, species.bloom === 'pepper' ? 2.6 : species.id === 'strawberry' ? 1.3 : 1, 1).translate(x, y, z);
                flowers.push(fruit);
            }
            else if (species.bloom === 'spike') {
                for (let j = 0; j < 6; j++)
                    flowers.push(new THREE.SphereGeometry(.038 * (1 - j * .09), 7, 5).toNonIndexed()
                        .scale(1, .8, 1).translate(x + Math.sin(j * 2.4) * .023, y + j * .048, z));
            }
            else {
                for (let p = 0; p < species.petals; p++) {
                    const theta = p / species.petals * Math.PI * 2;
                    const petal = new THREE.SphereGeometry(1, 9, 6).toNonIndexed();
                    const r = species.id === 'sunflower' ? .14 : .095;
                    petal.scale(r * .48, r, species.bloom === 'trumpet' ? .04 : .018);
                    petal.rotateZ(-theta);
                    petal.translate(x + Math.sin(theta) * r * .65, y + Math.cos(theta) * r * .65, z + (species.bloom === 'trumpet' ? .04 : 0));
                    flowers.push(petal);
                }
                stems.push(new THREE.SphereGeometry(.036, 9, 6).toNonIndexed().translate(x, y, z + .045));
            }
        }
    leaf.dispose();
    stem.dispose();
    const merge = (parts: THREE.BufferGeometry[]) => {
        if (!parts.length)
            return null;
        const result = mergeGeometries(parts);
        parts.forEach(p => p.dispose());
        return result;
    };
    return { leaves: merge(leaves)!, stems: merge(stems)!, flowers: merge(flowers) };
}
export function GreenhouseBed({ index }: {
    index: number;
}) {
    const { reducedMotion } = useLabQuality();
    const [species, setSpecies] = useState(PLANT_SPECIES[index]);
    const [revealed, setRevealed] = useState(false);
    const age = useRef(0), plant = useRef<THREE.Group>(null), bloom = useRef<THREE.Mesh>(null), shutter = useRef<THREE.Mesh>(null);
    const geometry = useMemo(() => specimenGeometry(species), [species]);
    useEffect(() => () => { geometry.leaves.dispose(); geometry.stems.dispose(); geometry.flowers?.dispose(); }, [geometry]);
    useEffect(() => { setSpecies(drawPlant(index)); return () => { releasePlant(index); }; }, [index]);
    const label = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 80;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#f1e8d7';
        ctx.fillRect(0, 0, 256, 80);
        ctx.fillStyle = '#52664a';
        ctx.textAlign = 'center';
        ctx.font = '600 23px system-ui';
        ctx.fillText(revealed || reducedMotion ? species.name : 'What will grow?', 128, 35, 240);
        ctx.font = '14px system-ui';
        ctx.fillText(`BED 0${index + 1} · ${revealed || reducedMotion ? 'BOTANICAL CLUB' : 'MYSTERY SEED'}`, 128, 62);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }, [species, index, revealed, reducedMotion]);
    useEffect(() => () => label.dispose(), [label]);
    useFrame((_, delta) => {
        if (!plant.current)
            return;
        if (reducedMotion) {
            plant.current.scale.setScalar(species.height);
            plant.current.position.y = 0;
            if (bloom.current) {
                bloom.current.visible = true;
                bloom.current.scale.setScalar(1);
            }
            if (shutter.current)
                shutter.current.scale.z = .01;
            return;
        }
        age.current += Math.min(delta, .1);
        const { growth, harvest, complete } = growthAt(age.current, index);
        const eased = THREE.MathUtils.smoothstep(growth, 0, 1);
        plant.current.scale.setScalar((.09 + eased * .91) * species.height);
        plant.current.rotation.z = Math.sin(age.current * .65 + index) * .018 * growth;
        plant.current.position.y = -THREE.MathUtils.smoothstep(harvest, 0, .75) * 1.35;
        if (bloom.current) {
            const opening = THREE.MathUtils.smoothstep(growth, .58, .84);
            bloom.current.visible = opening > .01;
            bloom.current.scale.setScalar(Math.max(.001, opening));
        }
        if (shutter.current)
            shutter.current.scale.z = .01 + .99 * THREE.MathUtils.smoothstep(harvest, .35, .9);
        if (!revealed && growth > .65)
            setRevealed(true);
        if (complete) {
            age.current = 0;
            setRevealed(false);
            setSpecies(drawPlant(index));
        }
    });
    return <group position={[-1.08 + index * .54, .49, 0]}>
    <group ref={plant} scale={.09}>
      <mesh geometry={geometry.stems} raycast={NO_HIT}><meshStandardMaterial color="#91a46a" roughness={.85}/></mesh>
      <mesh geometry={geometry.leaves} raycast={NO_HIT}><meshStandardMaterial color={species.green} side={THREE.DoubleSide} roughness={.8}/></mesh>
      {geometry.flowers && <mesh ref={bloom} geometry={geometry.flowers} visible={false} raycast={NO_HIT}>
        <meshStandardMaterial color={species.accent} roughness={.65}/></mesh>}
    </group>
    <mesh ref={shutter} position={[0, .008, 0]} scale={[1, 1, .01]} raycast={NO_HIT}>
      <boxGeometry args={[.48, .025, .9]}/><meshStandardMaterial color='#8faaa0' roughness={.75}/></mesh>
    <mesh position={[0, -.1, .756]} rotation={[-.15, 0, 0]} raycast={NO_HIT}>
      <planeGeometry args={[.46, .145]}/><meshStandardMaterial map={label} roughness={.8}/></mesh>
  </group>;
}
