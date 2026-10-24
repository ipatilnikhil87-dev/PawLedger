import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedGradientBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const AnimatedGradientBackground: React.FC<AnimatedGradientBackgroundProps> = ({
  children,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`animated-gradient-bg ${className}`}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#0a0d14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        ...style,
      }}
    >
      {/* 1. Underlying animated ambient gradient orbs */}
      <motion.div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '70vw',
          height: '70vw',
          maxWidth: '650px',
          maxHeight: '650px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(217, 119, 6, 0.05) 60%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
        animate={{
          x: [0, 60, -30, 0],
          y: [0, 40, -50, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '65vw',
          height: '65vw',
          maxWidth: '600px',
          maxHeight: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.05) 60%, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
        animate={{
          x: [0, -50, 40, 0],
          y: [0, -40, 30, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        style={{
          position: 'absolute',
          top: '30%',
          right: '15%',
          width: '50vw',
          height: '50vw',
          maxWidth: '450px',
          maxHeight: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234, 88, 12, 0.2) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
        animate={{
          scale: [0.9, 1.2, 0.9],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />


      {/* 3. Subtle vignette overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(10, 13, 20, 0) 30%, rgba(10, 13, 20, 0.75) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* 4. Foreground Content (Application branding & logo) */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AnimatedGradientBackground;
