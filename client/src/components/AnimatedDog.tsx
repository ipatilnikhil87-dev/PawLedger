import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedDogProps {
  size?: number;
}

export const AnimatedDog: React.FC<AnimatedDogProps> = ({ size = 130 }) => {
  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size * 0.95}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Gentle ground shadow beneath dog */}
      <motion.div
        animate={{
          scaleX: [1, 0.88, 1],
          opacity: [0.35, 0.2, 0.35],
        }}
        transition={{
          duration: 1.0,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          bottom: 2,
          width: '75%',
          height: '14px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.7) 0%, transparent 75%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Dog Vector & Body Container with playful gentle bounce */}
      <motion.div
        animate={{
          y: [0, -9, 0],
        }}
        transition={{
          duration: 1.0,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox="0 0 140 135"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible' }}
        >
          {/* DEFINITIONS & GRADIENTS */}
          <defs>
            {/* Fur gradient */}
            <linearGradient id="furGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Ear gradient */}
            <linearGradient id="earGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Chest fluff gradient */}
            <linearGradient id="chestGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="100%" stopColor="#fef3c7" />
            </linearGradient>

            {/* Collar gradient */}
            <linearGradient id="collarGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>

          {/* 1. TAIL (Behind body, wagging playfully) */}
          <motion.g
            animate={{
              rotate: [-24, 24, -24],
            }}
            transition={{
              duration: 0.32,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              transformOrigin: '32px 90px',
            }}
          >
            {/* Fluffy wagging tail */}
            <path
              d="M32 92 C18 84 8 68 18 52 C24 42 34 46 30 60 C26 74 34 82 32 92 Z"
              fill="url(#earGradient)"
            />
            {/* Tail tip highlight */}
            <path
              d="M18 52 C21 44 28 47 26 55 C22 56 19 55 18 52 Z"
              fill="#fffbeb"
            />
          </motion.g>

          {/* 2. BODY */}
          <g>
            {/* Back body curve */}
            <path
              d="M35 78 C35 65 50 62 70 62 C90 62 105 65 105 78 C105 102 96 116 70 116 C44 116 35 102 35 78 Z"
              fill="url(#furGradient)"
            />

            {/* Soft cream chest */}
            <path
              d="M52 74 C52 74 62 70 70 70 C78 70 88 74 88 74 C90 92 84 108 70 108 C56 108 50 92 52 74 Z"
              fill="url(#chestGradient)"
            />

            {/* Red Collar with Gold Paw Tag */}
            <path
              d="M48 72 C58 77 82 77 92 72 C93 75 91 78 90 79 C80 84 60 84 50 79 C49 78 47 75 48 72 Z"
              fill="url(#collarGradient)"
            />
            {/* Gold Tag */}
            <circle cx="70" cy="83" r="4.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
            <path
              d="M69.2 81.8 Q70 81.3 70.8 81.8 Q71.2 83 70 84.2 Q68.8 83 69.2 81.8 Z"
              fill="#78350f"
            />
          </g>

          {/* 3. FRONT PAWS */}
          <g>
            {/* Left paw */}
            <ellipse cx="56" cy="116" rx="9" ry="6" fill="#fffbeb" />
            <path d="M53 115 L53 118 M56 114 L56 118 M59 115 L59 118" stroke="#d97706" strokeWidth="0.9" strokeLinecap="round" />

            {/* Right paw */}
            <ellipse cx="84" cy="116" rx="9" ry="6" fill="#fffbeb" />
            <path d="M81 115 L81 118 M84 114 L84 118 M87 115 L87 118" stroke="#d97706" strokeWidth="0.9" strokeLinecap="round" />
          </g>

          {/* 4. LEFT EAR (Moving & swaying) */}
          <motion.g
            animate={{
              rotate: [-9, 5, -9],
            }}
            transition={{
              duration: 1.0,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              transformOrigin: '42px 28px',
            }}
          >
            <path
              d="M44 26 C30 24 16 38 20 60 C23 72 32 74 38 64 C44 54 46 40 44 26 Z"
              fill="url(#earGradient)"
            />
            {/* Inner ear soft tint */}
            <path
              d="M38 34 C30 36 24 45 27 58 C29 63 34 64 36 58 C39 52 40 42 38 34 Z"
              fill="#f43f5e"
              opacity="0.25"
            />
          </motion.g>

          {/* 5. RIGHT EAR (Moving & swaying symmetrically) */}
          <motion.g
            animate={{
              rotate: [9, -5, 9],
            }}
            transition={{
              duration: 1.0,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              transformOrigin: '96px 28px',
            }}
          >
            <path
              d="M96 26 C110 24 124 38 120 60 C117 72 108 74 102 64 C96 54 94 40 96 26 Z"
              fill="url(#earGradient)"
            />
            {/* Inner ear soft tint */}
            <path
              d="M102 34 C110 36 116 45 113 58 C111 63 106 64 104 58 C101 52 100 42 102 34 Z"
              fill="#f43f5e"
              opacity="0.25"
            />
          </motion.g>

          {/* 6. HEAD */}
          <g>
            {/* Head base */}
            <circle cx="70" cy="46" r="32" fill="url(#furGradient)" />

            {/* Muzzle (Snout) */}
            <ellipse cx="70" cy="56" rx="16" ry="12" fill="#fffbeb" />

            {/* Rosy Cheeks */}
            <circle cx="48" cy="53" r="5" fill="#f43f5e" opacity="0.3" />
            <circle cx="92" cy="53" r="5" fill="#f43f5e" opacity="0.3" />

            {/* EYES (With natural blinking animation) */}
            <motion.g
              animate={{
                scaleY: [1, 1, 1, 0.08, 1, 1],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                times: [0, 0.45, 0.47, 0.5, 0.53, 1],
              }}
              style={{
                transformOrigin: '70px 42px',
              }}
            >
              {/* Left Eye */}
              <circle cx="56" cy="42" r="5.5" fill="#0f172a" />
              {/* Left Eye Sparkles */}
              <circle cx="54" cy="40" r="2.2" fill="#ffffff" />
              <circle cx="58" cy="43.5" r="1.1" fill="#ffffff" />

              {/* Right Eye */}
              <circle cx="84" cy="42" r="5.5" fill="#0f172a" />
              {/* Right Eye Sparkles */}
              <circle cx="82" cy="40" r="2.2" fill="#ffffff" />
              <circle cx="86" cy="43.5" r="1.1" fill="#ffffff" />
            </motion.g>

            {/* Cute Nose */}
            <path
              d="M65 51 C65 48.5 75 48.5 75 51 C75 54.5 71 56.5 70 56.5 C69 56.5 65 54.5 65 51 Z"
              fill="#0f172a"
            />
            {/* Nose highlight */}
            <ellipse cx="68.5" cy="50.2" rx="1.8" ry="0.9" fill="#ffffff" opacity="0.8" />

            {/* Muzzle centerline & cute smiling mouth */}
            <path
              d="M70 56.5 L70 61"
              stroke="#0f172a"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M62 61 C65 64 70 64 70 61 C70 64 75 64 78 61"
              stroke="#0f172a"
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            {/* PANTING TONGUE (Playful & happy) */}
            <motion.path
              d="M67 62 C67 62 67 69 70 69 C73 69 73 62 73 62 Z"
              fill="#f43f5e"
              animate={{
                scaleY: [0.9, 1.15, 0.9],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                transformOrigin: '70px 62px',
              }}
            />
          </g>
        </svg>
      </motion.div>
    </div>
  );
};

export default AnimatedDog;
