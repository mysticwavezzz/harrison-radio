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

    // =========================================================================
    // 1. VOLUMETRIC SPIRAL NEBULA GAS CLOUDS (Soft gaseous atmospheric blending)
    // =========================================================================
    // Instead of bare dots, a real galaxy has continuous gas lanes and interstellar medium
    const GAS_PUFF_COUNT = 90;
    const ARMS = 2; // Classic 2-arm grand design spiral for clean, majestic arms
    const gasPuffs = [];

    for (let i = 0; i < GAS_PUFF_COUNT; i++) {
      const armIndex = i % ARMS;
      const armOffset = armIndex * Math.PI;
      // Progress along arm from core outwards
      const progress = Math.pow(Math.random(), 0.85); // 0 (near core) to 1 (outer tip)
      const maxDist = Math.min(width, height) * 0.72;
      const dist = progress * maxDist + 20;
      
      // Logarithmic spiral angle + gentle lateral dispersion
      const spiralAngle = dist * 0.0048 + armOffset;
      const dispersion = (Math.random() - 0.5) * 0.42;
      const angle = spiralAngle + dispersion;

      // Cloud radius grows larger as it moves further along the arm
      const baseRadius = 55 + progress * 120 + Math.random() * 40;

      // Deep space atmospheric hues: deep cosmic navy, subtle indigo, soft cyan, muted dust violet
      let colorStopInner;
      let colorStopMid;
      const tint = Math.random();
      if (tint < 0.38) {
        // Celestial indigo / navy
        colorStopInner = 'rgba(28, 38, 75, 0.22)';
        colorStopMid = 'rgba(18, 22, 45, 0.09)';
      } else if (tint < 0.72) {
        // Ethereal soft cyan / teal mist
        colorStopInner = 'rgba(20, 48, 68, 0.18)';
        colorStopMid = 'rgba(12, 28, 40, 0.07)';
      } else {
        // Muted interstellar violet / mauve
        colorStopInner = 'rgba(38, 28, 62, 0.16)';
        colorStopMid = 'rgba(22, 16, 40, 0.06)';
      }

      gasPuffs.push({
        dist,
        baseDist: dist,
        angle,
        baseRadius,
        colorStopInner,
        colorStopMid,
        orbitSpeed: (0.00035 / (Math.sqrt(dist + 40) * 0.08)),
      });
    }

    // =========================================================================
    // 2. STARS (Galactic bulge + spiral arms + soft halo)
    // =========================================================================
    const STAR_COUNT = Math.min(500, Math.floor((width * height) / 2800));
    const stars = [];

    for (let i = 0; i < STAR_COUNT; i++) {
      const isCore = Math.random() < 0.35; // 35% in smooth glowing nucleus

      let dist;
      let angle;

      if (isCore) {
        // Dense core with soft gaussian-like distribution
        dist = Math.pow(Math.random(), 2.0) * (Math.min(width, height) * 0.2);
        angle = Math.random() * Math.PI * 2;
      } else {
        const armIndex = i % ARMS;
        const armOffset = armIndex * Math.PI;
        const progress = Math.pow(Math.random(), 0.75);
        const maxDist = Math.max(width, height) * 0.65;
        dist = progress * maxDist + 25;
        const spiralAngle = dist * 0.0048 + armOffset;
        const dispersion = (Math.random() - 0.5) * 0.5;
        angle = spiralAngle + dispersion;
      }

      const baseOrbitSpeed = (0.00065 / (Math.sqrt(dist + 30) * 0.08)) * 0.6;

      // Soft luminous colors (warm pearl at core, diamond / ice-blue along arms)
      let r = 220, g = 235, b = 255;
      if (isCore) {
        r = 255; g = 244; b = 225;
      } else if (Math.random() < 0.25) {
        r = 205; g = 220; b = 255; // Ice blue
      } else if (Math.random() < 0.5) {
        r = 230; g = 215; b = 255; // Soft lilac
      }

      stars.push({
        dist,
        baseDist: dist,
        angle,
        orbitSpeed: baseOrbitSpeed,
        baseRadius: isCore ? Math.random() * 1.4 + 0.4 : Math.random() * 1.2 + 0.3,
        baseAlpha: isCore ? Math.random() * 0.5 + 0.2 : Math.random() * 0.45 + 0.15,
        twinkleSpeed: Math.random() * 0.025 + 0.008,
        twinkleAngle: Math.random() * Math.PI * 2,
        isCore,
        r, g, b,
      });
    }

    // Galactic tilt & elliptical perspective
    const TILT_X = 1.0;
    const TILT_Y = 0.55;

    let globalRotation = 0;
    let pulseTime = 0;

    const render = () => {
      // Dynamic Music Simulation:
      // When playing, calculate rhythmic music pulse
      pulseTime += isPlaying ? 0.038 : 0.01;

      const beat = Math.max(0, Math.sin(pulseTime * 2.0));
      const subBass = Math.max(0, Math.sin(pulseTime * 1.0));
      const musicIntensity = isPlaying ? volume : 0.0;
      const beatPulse = (beat * 0.3 + subBass * 0.2) * musicIntensity;

      // Rotational movement
      const rotSpeed = isPlaying ? 0.00045 + beatPulse * 0.0003 : 0.0002;
      globalRotation += rotSpeed;

      // Background fill: seamlessly matches --bg-main (#060709)
      ctx.fillStyle = '#060709';
      ctx.fillRect(0, 0, width, height);

      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const minDim = Math.min(width, height);
      const maxDim = Math.max(width, height);

      // Use 'screen' / additive composition for luminous cosmic gas blending
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // -----------------------------------------------------------------------
      // A. MASSIVE AMBIENT GALACTIC HALO (Smooth gradient across the viewport)
      // -----------------------------------------------------------------------
      const ambientHaloRadius = maxDim * 0.65;
      const ambientHalo = ctx.createRadialGradient(
        centerX, centerY, minDim * 0.05,
        centerX, centerY, ambientHaloRadius
      );
      ambientHalo.addColorStop(0, `rgba(28, 38, 72, ${0.28 + beatPulse * 0.1})`);
      ambientHalo.addColorStop(0.35, `rgba(16, 24, 48, ${0.14 + beatPulse * 0.05})`);
      ambientHalo.addColorStop(0.7, 'rgba(8, 12, 24, 0.05)');
      ambientHalo.addColorStop(1, 'rgba(6, 7, 9, 0)');

      ctx.fillStyle = ambientHalo;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, ambientHaloRadius * TILT_X, ambientHaloRadius * TILT_Y, globalRotation * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // -----------------------------------------------------------------------
      // B. VOLUMETRIC SPIRAL ARM GAS CLOUDS (Continuous, blended gaseous arms)
      // -----------------------------------------------------------------------
      const gasExpansion = 1.0 + beatPulse * 0.12;
      for (let i = 0; i < gasPuffs.length; i++) {
        const puff = gasPuffs[i];
        puff.angle += puff.orbitSpeed * (isPlaying ? 1.0 + beatPulse * 0.5 : 1.0);

        const currentAngle = puff.angle + globalRotation;
        const currentDist = puff.dist * gasExpansion;

        const px = centerX + Math.cos(currentAngle) * currentDist * TILT_X;
        const py = centerY + Math.sin(currentAngle) * currentDist * TILT_Y;
        const pr = puff.baseRadius * gasExpansion;

        const puffGrad = ctx.createRadialGradient(px, py, 0, px, py, pr);
        puffGrad.addColorStop(0, puff.colorStopInner);
        puffGrad.addColorStop(0.5, puff.colorStopMid);
        puffGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = puffGrad;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      // -----------------------------------------------------------------------
      // C. LUMINOUS GALACTIC CORE BULGE (Soft, incandescent organic nucleus)
      // -----------------------------------------------------------------------
      const corePulse = 1.0 + beatPulse * 0.35;
      const coreRadius = minDim * 0.25 * corePulse;
      const coreGrad = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, coreRadius
      );
      coreGrad.addColorStop(0, `rgba(255, 246, 220, ${0.45 + beatPulse * 0.25})`);
      coreGrad.addColorStop(0.12, `rgba(220, 230, 255, ${0.28 + beatPulse * 0.15})`);
      coreGrad.addColorStop(0.35, `rgba(140, 175, 255, ${0.12 + beatPulse * 0.08})`);
      coreGrad.addColorStop(0.65, `rgba(50, 75, 150, ${0.05 + beatPulse * 0.03})`);
      coreGrad.addColorStop(1, 'rgba(6, 7, 9, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, coreRadius * TILT_X, coreRadius * TILT_Y, globalRotation * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // -----------------------------------------------------------------------
      // D. STARS WITH SOFT GLOW RADII (Blended, not sharp dots)
      // -----------------------------------------------------------------------
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        star.angle += star.orbitSpeed * (isPlaying ? 1.0 + beatPulse * 0.7 : 1.0);

        const currentDist = star.isCore
          ? star.baseDist * (1.0 + beatPulse * 0.08)
          : star.baseDist * (1.0 + beatPulse * 0.05);

        const currentAngle = star.angle + globalRotation;
        const x = centerX + Math.cos(currentAngle) * currentDist * TILT_X;
        const y = centerY + Math.sin(currentAngle) * currentDist * TILT_Y;

        star.twinkleAngle += star.twinkleSpeed * (isPlaying ? 1.3 : 1.0);
        const twinkle = Math.sin(star.twinkleAngle) * 0.2;
        const alpha = Math.max(
          0.05,
          Math.min(
            0.95,
            star.baseAlpha + twinkle + (star.isCore ? beatPulse * 0.25 : beatPulse * 0.12)
          )
        );

        const radius = star.baseRadius * (1.0 + beatPulse * 0.2);

        // Soft radial feather for each star so it never looks like raw square/hard pixels
        const starGrad = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.6);
        starGrad.addColorStop(0, `rgba(${star.r}, ${star.g}, ${star.b}, ${alpha})`);
        starGrad.addColorStop(0.4, `rgba(${star.r}, ${star.g}, ${star.b}, ${alpha * 0.5})`);
        starGrad.addColorStop(1, `rgba(${star.r}, ${star.g}, ${star.b}, 0)`);

        ctx.fillStyle = starGrad;
        ctx.beginPath();
        ctx.arc(x, y, radius * 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

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
