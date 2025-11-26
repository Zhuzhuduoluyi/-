import React from 'react';
import { EGG_COLOR } from '../constants';

interface EggCharacterProps {
  width: number;
  height: number;
  isMovingLeft: boolean;
  isMovingRight: boolean;
  hasCaught: boolean; // Animation trigger
}

const EggCharacter: React.FC<EggCharacterProps> = ({ width, height, isMovingLeft, isMovingRight, hasCaught }) => {
  // Simple animation logic based on props
  const legOffset = isMovingLeft ? -5 : isMovingRight ? 5 : 0;
  const bounce = hasCaught ? -5 : 0;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 120"
      className="overflow-visible"
      style={{ transform: `translateY(${bounce}px) rotate(${isMovingLeft ? -5 : isMovingRight ? 5 : 0}deg)`, transition: 'transform 0.1s' }}
    >
      {/* Legs */}
      <g transform={`translate(${legOffset}, 0)`}>
        <path d="M35 95 L 35 115 A 5 5 0 0 0 45 115 L 45 98" stroke="black" strokeWidth="3" fill="none" />
        <path d="M65 95 L 65 115 A 5 5 0 0 0 75 115 L 75 98" stroke="black" strokeWidth="3" fill="none" />
      </g>

      {/* Body (Egg Shape) */}
      <ellipse cx="50" cy="60" rx="45" ry="55" fill={EGG_COLOR} stroke="black" strokeWidth="3" />

      {/* Face */}
      <g transform="translate(0, -5)">
        {/* Eyes */}
        <path d="M35 50 Q 40 45 45 50" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M55 50 Q 60 45 65 50" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
        
        {/* Mouth */}
        <path d="M45 60 Q 50 65 55 60" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
        
        {/* Blush */}
        <ellipse cx="30" cy="60" rx="5" ry="3" fill="#ffcccc" opacity="0.6" />
        <ellipse cx="70" cy="60" rx="5" ry="3" fill="#ffcccc" opacity="0.6" />
      </g>

      {/* Arms - Holding the basket */}
      <path d="M15 65 Q 5 75 20 85" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M85 65 Q 95 75 80 85" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* The "It's OK" Tag */}
      <g transform="translate(20, 75) rotate(10)">
        {/* String */}
        <path d="M0 0 L 0 20" stroke="black" strokeWidth="1" />
        {/* Coil/Spring detail simplified */}
        <path d="M-2 5 L 2 7 L -2 9 L 2 11 L -2 13" stroke="#555" strokeWidth="1" fill="none" />
        {/* Tag Body */}
        <rect x="-10" y="20" width="20" height="25" rx="3" fill="#a8d8ea" stroke="black" strokeWidth="2" />
        <rect x="-7" y="23" width="14" height="19" rx="2" fill="#ffcad4" stroke="none" />
        {/* Text */}
        <text x="0" y="34" fontSize="8" textAnchor="middle" fill="white" fontFamily="sans-serif" fontWeight="bold">It's</text>
        <text x="0" y="41" fontSize="8" textAnchor="middle" fill="white" fontFamily="sans-serif" fontWeight="bold">ok</text>
      </g>

      {/* The Basket (Foreground) */}
      <g transform="translate(0, 60)">
          <path d="M20 25 Q 50 55 80 25 Z" fill="#8B4513" stroke="black" strokeWidth="2" />
          <path d="M20 25 L 80 25" stroke="black" strokeWidth="2" />
          {/* Woven texture */}
          <path d="M30 30 L 40 40 M 50 30 L 60 40 M 70 30 L 60 40 M 50 45 L 40 35" stroke="#5D4037" strokeWidth="1" />
      </g>

    </svg>
  );
};

export default EggCharacter;
