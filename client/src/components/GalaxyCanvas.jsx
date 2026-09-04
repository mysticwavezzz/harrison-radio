import React, { useEffect, useRef } from 'react';

export function GalaxyCanvas({ isPlaying = false, volume = 0.85, djConfig = null }) {
  const canvasRef = useRef(null);

  // Keep live reference of current djConfig for smooth interpolated transitions
  const configRef = useRef(djConfig);
  useEffect(() => {
    configRef.current = djConfig;
  }, [djConfig]);

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
    const GAS_PUFF_COUNT = 90;
    const ARMS = 2;
    const gasPuffs = [];

    for (let i = 0; i < GAS_PUFF_COUNT; i++) {
      const armIndex = i % ARMS;
      const armOffset = armIndex * Math.PI;
      const progress = Math.pow(Math.random(), 0.85);
      const maxDist = Math.min(width, height) * 0.72;
      const dist = progress * maxDist + 20;
      
      const spiralAngle = dist * 0.0048 + armOffset;
      const dispersion = (Math.random() - 0.5) * 0.42;
      const angle = spiralAngle + dispersion;
      const baseRadius = 55 + progress * 120 + Math.random() * 40;

      gasPuffs.push({
        dist,
        baseDist: dist,
        angle,
        baseRadius,
        orbitSpeed: (0.00035 / (Math.sqrt(dist + 40) * 0.08)),
      });
    }

    // =========================================================================
    // 2. STARS (Galactic bulge + spiral arms + soft halo)
    // =========================================================================
    const STAR_COUNT = Math.min(500, Math.floor((width * height) / 2800));
    const stars = [];

    for (let i = 0; i < STAR_COUNT; i++) {
      const isCore = Math.random() < 0.35;

      let dist;
      let angle;

      if (isCore) {
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
      });
    }

    const TILT_X = 1.0;
    const TILT_Y = 0.55;

    let globalRotation = 0;
    let pulseTime = 0;

    // Smooth lighting color interpolation state
    const currentTheme = {
      primaryR: 29,  primaryG: 185, primaryB: 84,   // Default Spotify emerald
      accentR: 56,   accentG: 189, accentB: 248,   // Cyan
      coreR: 255,    coreG: 246,   coreB: 220,     // Warm pearl core
      starR: 220,    starG: 235,   starB: 255,     // Soft starlight
      pulseRate: 1.0,
      lightIntensity: 0.8,
      rotationBoost: 1.0
    };

    // Helper to parse hex to [r, g, b]
    const hexToRgb = (hex) => {
      if (!hex || hex[0] !== '#') return [29, 185, 84];
      const bigint = parseInt(hex.slice(1), 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };

    const render = () => {
      // Smoothly interpolate current theme values toward the active song's djConfig
      const targetCfg = configRef.current;
      if (targetCfg) {
        const [targetPriR, targetPriG, targetPriB] = hexToRgb(targetCfg.primaryColor);
        const [targetAccR, targetAccG, targetAccB] = hexToRgb(targetCfg.accentColor);
        const [targetCoreR, targetCoreG, targetCoreB] = targetCfg.coreRgb || [255, 246, 220];
        const [targetStarR, targetStarG, targetStarB] = targetCfg.starRgb || [220, 235, 255];

        const lerpFactor = 0.025; // Gentle cinematic color ease
        currentTheme.primaryR += (targetPriR - currentTheme.primaryR) * lerpFactor;
        currentTheme.primaryG += (targetPriG - currentTheme.primaryG) * lerpFactor;
        currentTheme.primaryB += (targetPriB - currentTheme.primaryB) * lerpFactor;

        currentTheme.accentR += (targetAccR - currentTheme.accentR) * lerpFactor;
        currentTheme.accentG += (targetAccG - currentTheme.accentG) * lerpFactor;
        currentTheme.accentB += (targetAccB - currentTheme.accentB) * lerpFactor;

        currentTheme.coreR += (targetCoreR - currentTheme.coreR) * lerpFactor;
        currentTheme.coreG += (targetCoreG - currentTheme.coreG) * lerpFactor;
        currentTheme.coreB += (targetCoreB - currentTheme.coreB) * lerpFactor;

        currentTheme.starR += (targetStarR - currentTheme.starR) * lerpFactor;
        currentTheme.starG += (targetStarG - currentTheme.starG) * lerpFactor;
        currentTheme.starB += (targetStarB - currentTheme.starB) * lerpFactor;

        currentTheme.pulseRate += ((targetCfg.pulseRate || 1.0) - currentTheme.pulseRate) * lerpFactor;
        currentTheme.lightIntensity += ((targetCfg.lightIntensity || 0.8) - currentTheme.lightIntensity) * lerpFactor;
        currentTheme.rotationBoost += ((targetCfg.rotationBoost || 1.0) - currentTheme.rotationBoost) * lerpFactor;
      }

      // Dynamic Music Simulation synced to song tempo & volume
      pulseTime += isPlaying ? 0.038 * currentTheme.pulseRate : 0.01;

      const beat = Math.max(0, Math.sin(pulseTime * 2.0));
      const subBass = Math.max(0, Math.sin(pulseTime * 1.0));
      const musicIntensity = isPlaying ? volume : 0.0;
      const beatPulse = (beat * 0.32 + subBass * 0.22) * musicIntensity * currentTheme.lightIntensity;

      // Rotational velocity accelerates naturally based on song energy
      const rotSpeed = isPlaying
        ? (0.00045 + beatPulse * 0.0003) * currentTheme.rotationBoost
        : 0.0002;
      globalRotation += rotSpeed;

      // Deep space base fill
      ctx.fillStyle = '#060709';
      ctx.fillRect(0, 0, width, height);

      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const minDim = Math.min(width, height);
      const maxDim = Math.max(width, height);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      const priR = Math.round(currentTheme.primaryR);
      const priG = Math.round(currentTheme.primaryG);
      const priB = Math.round(currentTheme.primaryB);
      const accR = Math.round(currentTheme.accentR);
      const accG = Math.round(currentTheme.accentG);
      const accB = Math.round(currentTheme.accentB);

      // -----------------------------------------------------------------------
      // A. MASSIVE AMBIENT GALACTIC HALO (Deep atmospheric space background)
      // -----------------------------------------------------------------------
      const ambientHaloRadius = maxDim * 0.7;
      const ambientHalo = ctx.createRadialGradient(
        centerX, centerY, minDim * 0.04,
        centerX, centerY, ambientHaloRadius
      );
      // Soft deep cosmic haze blending seamlessly to #060709
      ambientHalo.addColorStop(0, `rgba(${priR}, ${priG}, ${priB}, ${0.16 + beatPulse * 0.08})`);
      ambientHalo.addColorStop(0.3, `rgba(${accR}, ${accG}, ${accB}, ${0.08 + beatPulse * 0.04})`);
      ambientHalo.addColorStop(0.6, 'rgba(12, 16, 28, 0.04)');
      ambientHalo.addColorStop(1, 'rgba(6, 7, 9, 0)');

      ctx.fillStyle = ambientHalo;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, ambientHaloRadius * TILT_X, ambientHaloRadius * TILT_Y, globalRotation * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // -----------------------------------------------------------------------
      // B. VOLUMETRIC SPIRAL ARM GAS CLOUDS (Deeply blended gaseous arms)
      // -----------------------------------------------------------------------
      const gasExpansion = 1.0 + beatPulse * 0.1;
      for (let i = 0; i < gasPuffs.length; i++) {
        const puff = gasPuffs[i];
        puff.angle += puff.orbitSpeed * (isPlaying ? 1.0 + beatPulse * 0.5 : 1.0);

        const currentAngle = puff.angle + globalRotation;
        const currentDist = puff.dist * gasExpansion;

        const px = centerX + Math.cos(currentAngle) * currentDist * TILT_X;
        const py = centerY + Math.sin(currentAngle) * currentDist * TILT_Y;
        const pr = puff.baseRadius * gasExpansion;

        // Balanced harmonic color blend: interpolate between deep sapphire base and song accent
        const blendRatio = (i % 3) / 2; // 0, 0.5, 1
        const cloudR = Math.round(priR * (1 - blendRatio) + accR * blendRatio);
        const cloudG = Math.round(priG * (1 - blendRatio) + accG * blendRatio);
        const cloudB = Math.round(priB * (1 - blendRatio) + accB * blendRatio);

        const puffGrad = ctx.createRadialGradient(px, py, 0, px, py, pr);
        puffGrad.addColorStop(0, `rgba(${cloudR}, ${cloudG}, ${cloudB}, ${0.12 + beatPulse * 0.06})`);
        puffGrad.addColorStop(0.5, `rgba(${cloudR}, ${cloudG}, ${cloudB}, ${0.035 + beatPulse * 0.015})`);
        puffGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = puffGrad;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      // -----------------------------------------------------------------------
      // C. LUMINOUS GALACTIC CORE BULGE (Golden/pearl incandescent nucleus)
      // -----------------------------------------------------------------------
      const corePulse = 1.0 + beatPulse * 0.3;
      const coreRadius = minDim * 0.22 * corePulse;
      const coreR = Math.round(currentTheme.coreR);
      const coreG = Math.round(currentTheme.coreG);
      const coreB = Math.round(currentTheme.coreB);

      const coreGrad = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, coreRadius
      );
      coreGrad.addColorStop(0, `rgba(${coreR}, ${coreG}, ${coreB}, ${0.42 + beatPulse * 0.2})`);
      coreGrad.addColorStop(0.18, `rgba(${accR}, ${accG}, ${accB}, ${0.2 + beatPulse * 0.1})`);
      coreGrad.addColorStop(0.45, `rgba(${priR}, ${priG}, ${priB}, ${0.08 + beatPulse * 0.05})`);
      coreGrad.addColorStop(0.75, 'rgba(16, 22, 45, 0.025)');
      coreGrad.addColorStop(1, 'rgba(6, 7, 9, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, coreRadius * TILT_X, coreRadius * TILT_Y, globalRotation * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // -----------------------------------------------------------------------
      // D. STARS WITH SOFT GLOW RADII (Blended, feathered starlight)
      // -----------------------------------------------------------------------
      const starR = Math.round(currentTheme.starR);
      const starG = Math.round(currentTheme.starG);
      const starB = Math.round(currentTheme.starB);

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

        const starGrad = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.6);
        starGrad.addColorStop(0, `rgba(${starR}, ${starG}, ${starB}, ${alpha})`);
        starGrad.addColorStop(0.4, `rgba(${starR}, ${starG}, ${starB}, ${alpha * 0.5})`);
        starGrad.addColorStop(1, `rgba(${starR}, ${starG}, ${starB}, 0)`);

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
