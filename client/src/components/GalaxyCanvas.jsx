import React, { useEffect, useRef } from 'react';

export function GalaxyCanvas({ isPlaying = false, volume = 0.85 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);


    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // ==========================================
    // Authentic Spiral Galaxy Generation
    // ==========================================
    // Generate stars structured into spiral arms + dense galactic bulge / core
    const STAR_COUNT = Math.min(650, Math.floor((width * height) / 2200));
    const ARMS = 3; // 3-arm spiral galaxy (resembling pinwheel/Milky Way structure)
    const ARM_SPREAD = 0.55; // Angle spread of each spiral arm
    const stars = [];

    for (let i = 0; i < STAR_COUNT; i++) {
      const isCore = Math.random() < 0.28; // 28% concentrated in galactic nucleus/core

      let dist;
      let angle;

      if (isCore) {
        // Dense core with exponential decay from center
        dist = Math.pow(Math.random(), 2.2) * (Math.min(width, height) * 0.18);
        angle = Math.random() * Math.PI * 2;
      } else {
        // Spiral arms: logarithmic / archimedean spiral curvature
        const armIndex = i % ARMS;
        const armOffset = (armIndex * (Math.PI * 2)) / ARMS;
        // Radial distance distribution along arms
        const progress = Math.pow(Math.random(), 0.7); // Tapers toward outer rim
        const maxDist = Math.max(width, height) * 0.58;
        dist = progress * maxDist + 15;
        // Spiral formula: angle increases with distance
        const spiralAngle = dist * 0.0055 + armOffset;
        // Add natural stellar dispersion around the arm path
        const dispersion = (Math.random() - 0.5) * ARM_SPREAD * (1 + progress * 0.8);
        angle = spiralAngle + dispersion;
      }

      // Orbital speed: differential galactic rotation (inner orbits faster)
      const baseOrbitSpeed = (0.0007 / (Math.sqrt(dist + 30) * 0.08)) * 0.65;

      // Natural stellar colors: core is warm golden/white, arms have soft blue/cyan/lilac clusters
      let color;
      if (isCore) {
        color = i % 3 === 0 ? 'rgba(255, 240, 215,' : 'rgba(255, 248, 235,';
      } else {
        const randColor = Math.random();
        if (randColor < 0.45) {
          color = 'rgba(200, 225, 255,'; // Crisp luminous blue-white
        } else if (randColor < 0.75) {
          color = 'rgba(175, 205, 255,'; // Soft cosmic sapphire
        } else if (randColor < 0.9) {
          color = 'rgba(215, 195, 255,'; // Stellar violet / lilac
        } else {
          color = 'rgba(255, 235, 210,'; // Warm stellar giant
        }
      }

      stars.push({
        dist,
        baseDist: dist,
        angle,
        orbitSpeed: baseOrbitSpeed,
        baseRadius: isCore ? Math.random() * 1.8 + 0.5 : Math.random() * 1.4 + 0.3,
        baseAlpha: isCore ? Math.random() * 0.6 + 0.35 : Math.random() * 0.55 + 0.2,
        twinkleSpeed: Math.random() * 0.03 + 0.01,
        twinkleAngle: Math.random() * Math.PI * 2,
        isCore,
        color,
      });
    }

    // Galactic tilt & projection factors (gives depth and 3D angle to the disk)
    const TILT_X = 1.0;
    const TILT_Y = 0.58; // Elliptical projection for 3D inclined perspective

    let globalRotation = 0;
    let pulseTime = 0;

    const render = () => {
      // Dynamic Music Simulation:
      // When playing, calculate rhythmic music pulse (bass hits, bar swell, and harmonic shimmer)
      pulseTime += isPlaying ? 0.045 : 0.012;

      // Simulated multi-frequency audio beat dynamics
      const beat = Math.sin(pulseTime * 2.2);
      const subBass = Math.sin(pulseTime * 1.1);
      const swell = Math.sin(pulseTime * 0.45);

      // Music reactive amplitude scaled by current volume
      const musicIntensity = isPlaying ? volume : 0.0;
      const beatPulse = isPlaying
        ? Math.max(0, beat) * 0.35 * musicIntensity + Math.max(0, subBass) * 0.2 * musicIntensity
        : 0.0;
      const corePulse = 1.0 + beatPulse * 0.6;
      const armPulse = 1.0 + Math.sin(pulseTime) * 0.06 * musicIntensity;

      // Galaxy rotation accelerates slightly with music playback
      const rotSpeed = isPlaying
        ? 0.0006 + beatPulse * 0.0004
        : 0.00025;
      globalRotation += rotSpeed;

      ctx.clearRect(0, 0, width, height);

      const centerX = width * 0.5;
      const centerY = height * 0.5;

      // 1. Draw Deep Galactic Core Nucleus (Glowing ambient radiant center)
      const coreRadius = Math.min(width, height) * 0.22 * corePulse;
      const coreGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        coreRadius
      );
      coreGrad.addColorStop(0, `rgba(255, 245, 230, ${0.45 + beatPulse * 0.25})`);
      coreGrad.addColorStop(0.18, `rgba(210, 225, 255, ${0.22 + beatPulse * 0.15})`);
      coreGrad.addColorStop(0.48, `rgba(130, 160, 240, ${0.08 + beatPulse * 0.06})`);
      coreGrad.addColorStop(0.8, 'rgba(40, 55, 110, 0.025)');
      coreGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      // Elliptical core projection
      ctx.ellipse(centerX, centerY, coreRadius * TILT_X, coreRadius * TILT_Y, globalRotation * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Secondary Cosmic Dust Halo (Deep background stellar haze)
      const haloRadius = Math.max(width, height) * 0.46 * armPulse;
      const haloGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        coreRadius * 0.5,
        centerX,
        centerY,
        haloRadius
      );
      haloGrad.addColorStop(0, `rgba(45, 60, 110, ${0.12 + beatPulse * 0.05})`);
      haloGrad.addColorStop(0.5, 'rgba(25, 30, 60, 0.04)');
      haloGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, haloRadius * TILT_X, haloRadius * TILT_Y, globalRotation * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // 3. Render Stars along the Spiral Structure
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Orbit update with differential rotation + global galaxy spin
        const effectiveSpeed = star.orbitSpeed * (isPlaying ? 1.0 + beatPulse * 0.8 : 1.0);
        star.angle += effectiveSpeed;

        // Current distance expands/swells slightly with music beat
        const currentDist = star.isCore
          ? star.baseDist * (1.0 + beatPulse * 0.1)
          : star.baseDist * armPulse;

        // Total angle including galaxy rotation
        const currentAngle = star.angle + globalRotation;

        // Calculate 2D position with tilted disk perspective
        const x = centerX + Math.cos(currentAngle) * currentDist * TILT_X;
        const y = centerY + Math.sin(currentAngle) * currentDist * TILT_Y;

        // Twinkle & music luminosity reaction
        star.twinkleAngle += star.twinkleSpeed * (isPlaying ? 1.4 : 1.0);
        const twinkle = Math.sin(star.twinkleAngle) * 0.25;
        const currentAlpha = Math.max(
          0.08,
          Math.min(
            1.0,
            star.baseAlpha + twinkle + (star.isCore ? beatPulse * 0.3 : beatPulse * 0.15)
          )
        );

        // Star radius breathing with music
        const currentRadius = star.baseRadius * (1.0 + (star.isCore ? beatPulse * 0.4 : beatPulse * 0.25));

        ctx.beginPath();
        ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${star.color} ${currentAlpha})`;
        ctx.fill();

        // Subtle glow halo for prominent stars
        if (!star.isCore && star.baseRadius > 1.2 && currentAlpha > 0.45) {
          ctx.beginPath();
          ctx.arc(x, y, currentRadius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `${star.color} ${currentAlpha * 0.12})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isPlaying, volume]);

  return (
    <canvas
      ref={canvasRef}
      className="interactiveGalaxyCanvas"
      aria-hidden="true"
    />
  );
}
