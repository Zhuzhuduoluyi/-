
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { ItemType } from '../types';
import { EGG_COLOR } from '../constants';

// --- Helper Components ---

const Arm = ({ isLeft }: { isLeft: boolean }) => {
  const curve = useMemo(() => {
    const sign = isLeft ? -1 : 1;
    // Create a smooth curve reaching from body to basket
    // P1: Shoulder (attached to body side, slightly up)
    // P2: Elbow (bending out and down for weight)
    // P3: Hand (curving up and in to grasp basket rim)
    const p1 = new THREE.Vector3(0.55 * sign, 0.9, 0.1); 
    const p2 = new THREE.Vector3(0.8 * sign, 0.65, 0.6); 
    const p3 = new THREE.Vector3(0.66 * sign, 0.72, 1.25); 
    
    return new THREE.CatmullRomCurve3([p1, p2, p3], false, 'catmullrom', 0.5);
  }, [isLeft]);

  return (
    <group>
        {/* The Arm Tube */}
        <mesh castShadow>
            <tubeGeometry args={[curve, 20, 0.09, 8, false]} />
            <meshStandardMaterial color={EGG_COLOR} />
        </mesh>
        {/* The Hand (Little sphere at the end to cover the tube opening) */}
        <mesh position={[isLeft ? -0.66 : 0.66, 0.72, 1.25]} castShadow>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={EGG_COLOR} />
        </mesh>
    </group>
  );
};

// --- Eggie 3D Character ---

export const Egg3D = ({ position, isMovingLeft, isMovingRight, hasCaught }: { position: [number, number, number], isMovingLeft: boolean, isMovingRight: boolean, hasCaught: boolean }) => {
  const group = useRef<any>(null);

  useFrame((state) => {
    if (!group.current) return;
    
    // Tilt logic (Left/Right movement)
    const targetRotZ = isMovingLeft ? 0.15 : isMovingRight ? -0.15 : 0;
    group.current.rotation.z += (targetRotZ - group.current.rotation.z) * 0.1;

    // Bounce logic (Catching & Idle)
    const catchBounce = hasCaught ? 0.2 : 0;
    const idleBounce = Math.sin(state.clock.elapsedTime * 5) * 0.02;
    
    // Smooth Y update
    // Base Y is position[1], we add bounces on top
    const targetY = position[1] + catchBounce + idleBounce;
    group.current.position.y += (targetY - group.current.position.y) * 0.2;
    
    // Sync X position strictly
    group.current.position.x = position[0];
    
    // Sync Z position
    group.current.position.z = position[2];
  });

  return (
    <group ref={group} position={position}>
      {/* --- Body Group --- */}
      {/* Main Egg Body - Centered on local X/Z, raised on Y */}
      <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
        {/* Slightly elongated sphere for egg shape */}
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color={EGG_COLOR} roughness={0.3} />
      </mesh>

      {/* Face Features */}
      {/* Pushed slightly forward in Z to sit on surface of sphere */}
      <group position={[0, 0.95, 0.65]}>
        {/* Eyes */}
        <mesh position={[-0.2, 0.1, 0.0]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.2} />
        </mesh>
        <mesh position={[0.2, 0.1, 0.0]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.2} />
        </mesh>

        {/* Blush */}
        <mesh position={[-0.35, 0, -0.05]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#ff9999" transparent opacity={0.6} roughness={1} />
        </mesh>
        <mesh position={[0.35, 0, -0.05]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#ff9999" transparent opacity={0.6} roughness={1} />
        </mesh>

        {/* Mouth - A small torus segment */}
        <group position={[0, -0.08, 0.02]} rotation={[0, 0, Math.PI]}> 
           <mesh>
             <torusGeometry args={[0.06, 0.02, 8, 16, 3]} />
             <meshStandardMaterial color="#1a1a1a" />
           </mesh>
        </group>
      </group>

      {/* --- Arms --- */}
      {/* Replaced stick arms with curved arms */}
      <Arm isLeft={true} />
      <Arm isLeft={false} />

      {/* --- Basket --- */}
      {/* Moved forward to Z=1.35 to completely clear the body */}
      <group position={[0, 0.5, 1.35]} rotation={[0.15, 0, 0]}>
        
        {/* Basket Wall - Outer */}
        <mesh castShadow receiveShadow>
           <cylinderGeometry args={[0.65, 0.55, 0.5, 32, 1, true]} />
           <meshStandardMaterial color="#8B4513" side={THREE.DoubleSide} /> 
        </mesh>
        
        {/* Basket Wall - Inner/Thickness Rim */}
        <mesh position={[0, 0.25, 0]}>
            <torusGeometry args={[0.65, 0.04, 8, 32]} />
            <meshStandardMaterial color="#5D4037" />
        </mesh>

        {/* Basket Floor */}
        <mesh position={[0, -0.25, 0]} receiveShadow>
           <cylinderGeometry args={[0.55, 0.55, 0.05, 32]} />
           <meshStandardMaterial color="#8B4513" />
        </mesh>
      </group>

      {/* Legs */}
      <group position={[0, 0.2, 0]}>
         <mesh position={[-0.25, 0, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.45, 4, 8]} />
            <meshStandardMaterial color="#111" />
         </mesh>
         <mesh position={[0.25, 0, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.45, 4, 8]} />
            <meshStandardMaterial color="#111" />
         </mesh>
      </group>
    </group>
  );
};

// --- Item 3D ---

export const Item3D = ({ position, type, rotationZ }: { position: [number, number, number], type: ItemType, rotationZ: number }) => {
  const meshRef = useRef<any>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
       // Gentle tumbling
       meshRef.current.rotation.x += delta * 1.5;
       meshRef.current.rotation.y += delta * 1.0;
       
       const currentZ = meshRef.current.rotation.z;
       meshRef.current.rotation.z = THREE.MathUtils.lerp(currentZ, rotationZ * (Math.PI / 180), 0.1);
    }
  });

  const materialProps = { roughness: 0.6, metalness: 0.0 };

  const getContent = () => {
    switch (type) {
      case ItemType.CROISSANT:
        return (
          // Composed Croissant: 3 intersecting shapes to look like a solid pastry
           <group scale={[0.8, 0.8, 0.8]}>
             {/* Center Body */}
             <mesh position={[0, 0, 0]} castShadow>
                <capsuleGeometry args={[0.18, 0.4, 4, 8]} />
                <meshStandardMaterial {...materialProps} color="#f2bd4b" />
             </mesh>
             {/* Left Tip */}
             <mesh position={[-0.25, -0.1, 0]} rotation={[0, 0, 0.8]} castShadow>
                <capsuleGeometry args={[0.14, 0.35, 4, 8]} />
                <meshStandardMaterial {...materialProps} color="#f2bd4b" />
             </mesh>
             {/* Right Tip */}
             <mesh position={[0.25, -0.1, 0]} rotation={[0, 0, -0.8]} castShadow>
                <capsuleGeometry args={[0.14, 0.35, 4, 8]} />
                <meshStandardMaterial {...materialProps} color="#f2bd4b" />
             </mesh>
           </group>
        );
      case ItemType.BAGUETTE:
        return (
          <mesh castShadow>
            <capsuleGeometry args={[0.12, 0.8, 4, 8]} />
            <meshStandardMaterial {...materialProps} color="#d4a248" />
            {/* Scored lines texture hint using torus segments could be added here, but simple is fine for now */}
          </mesh>
        );
      case ItemType.TOAST:
        return (
          <group>
             <mesh castShadow>
                <boxGeometry args={[0.5, 0.5, 0.1]} />
                <meshStandardMaterial {...materialProps} color="#f5dfa2" />
             </mesh>
             {/* Crust */}
             <mesh position={[0,0,-0.005]}>
                <boxGeometry args={[0.52, 0.52, 0.09]} />
                <meshStandardMaterial color="#cfa355" />
             </mesh>
          </group>
        );
      case ItemType.BURNT_TOAST:
        return (
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.5, 0.1]} />
            <meshStandardMaterial {...materialProps} color="#5c4033" />
          </mesh>
        );
      case ItemType.ROCK:
        return (
          <mesh castShadow>
            <dodecahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial {...materialProps} color="#888888" flatShading />
          </mesh>
        );
      default:
        return null;
    }
  };

  return (
    <group ref={meshRef} position={position}>
      {getContent()}
    </group>
  );
};

// --- Particle 3D ---

export const Particle3D = ({ x, y, color, life }: { x: number, y: number, color: string, life: number }) => {
  return (
    <mesh position={[x, y, 1]} scale={[life, life, life]}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={life} />
    </mesh>
  );
};
