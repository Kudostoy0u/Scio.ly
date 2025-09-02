'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatedAccuracyProps } from '../types';

export default function AnimatedAccuracy({
  value,
  darkMode,
  className,
}: AnimatedAccuracyProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);


  const content = `${value}%`;
  
  if (!isMounted) {
    return (
      <text x="50" y="50" className={className} textAnchor="middle" fill={darkMode ? '#fff' : '#000'}>
        {content}
      </text>
    );
  }

  return (
    <motion.text
      x="50"
      y="50"
      className={className}
      textAnchor="middle"
      fill={darkMode ? '#fff' : '#000'}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {content}
    </motion.text>
  );
} 