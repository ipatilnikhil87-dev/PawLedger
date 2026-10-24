import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedGradientBackground } from './AnimatedGradientBackground';
import { AnimatedDog } from './AnimatedDog';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 3000,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    let audio: HTMLAudioElement | null = null;
    let startTimerId: ReturnType<typeof setTimeout> | undefined;

    try {
      audio = new Audio('/sounds/puppy-bark.mp3');
      audio.preload = 'auto';
      audio.volume = 1.0;
      audio.muted = false;
      audio.playbackRate = 1.15;
      audioRef.current = audio;

      // Automatically attempt to play as soon as the splash screen appears
      const attemptPlay = () => {
        if (!isMounted || !audio) return;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err: unknown) => {
            // Handled gracefully: Browsers block unprompted autoplay without user gesture.
            console.info('Autoplay status (governed by browser user-gesture policy):', err);
          });
        }
      };

      startTimerId = setTimeout(attemptPlay, 150);
    } catch (err) {
      console.warn('Audio setup error:', err);
    }

    // Start visual exit fade-out slightly before durationMs so transition finishes at ~3s
    const exitTimer = setTimeout(() => {
      setIsVisible(false);
    }, Math.max(1500, durationMs - 450));

    // Completely dismiss and stop all audio at durationMs when login page appears
    const finishTimer = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      onFinish();
    }, durationMs);

    return () => {
      isMounted = false;
      if (startTimerId) clearTimeout(startTimerId);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);

      // Stop audio completely when splash screen finishes or unmounts
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [durationMs, onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash-screen-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            overflow: 'hidden',
          }}
        >
          <AnimatedGradientBackground>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Cute Animated Dog (Wagging tail, moving ears, blinking eyes, bouncing) */}
              <motion.div
                initial={{ scale: 0.75, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 18,
                  delay: 0.1,
                }}
                style={{
                  marginBottom: '10px',
                }}
              >
                <AnimatedDog size={140} />
              </motion.div>

              {/* PawLedger Actual App Logo & Name */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                }}
              >
                <motion.div
                  initial={{ scale: 0.7, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 18,
                    delay: 0.2,
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(217, 119, 6, 0.15))',
                    border: '1.5px solid #f59e0b',
                    fontSize: '1.5rem',
                    boxShadow: '0 8px 20px rgba(245, 158, 11, 0.25)',
                  }}
                >
                  🐾
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                  style={{
                    fontSize: '2.4rem',
                    fontWeight: 900,
                    letterSpacing: '-0.5px',
                    margin: 0,
                    color: '#ffffff',
                    textShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  PawLedger
                </motion.h1>
              </div>

              {/* Subtitles & Branding */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                style={{
                  fontSize: '1rem',
                  color: '#f59e0b',
                  fontWeight: 700,
                  marginTop: '8px',
                  letterSpacing: '0.2px',
                }}
              >
                Dog Health & Vaccination Tracker
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                style={{
                  fontSize: '0.85rem',
                  color: 'rgba(255, 255, 255, 0.65)',
                  marginTop: '6px',
                  marginBottom: '28px',
                  letterSpacing: '0.5px',
                }}
              >
                Bengaluru & India First
              </motion.p>

              {/* Subtle Loading Progress Bar */}
              <div
                style={{
                  width: '140px',
                  height: '3px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: durationMs / 1000 - 0.5, ease: 'easeInOut' }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    borderRadius: '999px',
                    boxShadow: '0 0 8px rgba(245, 158, 11, 0.8)',
                  }}
                />
              </div>
            </motion.div>
          </AnimatedGradientBackground>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
