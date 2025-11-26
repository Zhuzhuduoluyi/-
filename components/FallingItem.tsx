import React from 'react';
import { ItemType } from '../types';
import { ITEM_CONFIG } from '../constants';

interface FallingItemProps {
  x: number;
  y: number;
  type: ItemType;
  rotation: number;
  size: number;
}

const FallingItem: React.FC<FallingItemProps> = ({ x, y, type, rotation, size }) => {
  const config = ITEM_CONFIG[type];

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        transform: `rotate(${rotation}deg)`,
        fontSize: `${size * 0.8}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none', // Important for mouse interaction beneath
      }}
    >
      <span className="filter drop-shadow-md">
        {config.label}
      </span>
    </div>
  );
};

export default FallingItem;
