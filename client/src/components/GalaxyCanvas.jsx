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

    // Track mouse position with smooth easing
    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      isHovering: false,
    };

    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isHovering = true;
    };

    const handleMouseLeave = () => {
      mouse.targetX = width / 2;
      mouse.targetY = height / 2;
      mouse.isHovering = false;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    // Galaxy Starfield & Nebulae Particles
    const STAR_COUNT = Math.min(180, Math.floor((width * height) / 8000));
    const stars = [];

    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseRadius: Math.random() * 1.5 + 0.4,
        radius: 1,
        alpha: Math.random() * 0.6 + 0.2,
        baseAlpha: Math.random() * 0.5 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.008,
        twinkleAngle: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        layer: Math.random() * 2 + 1, // Depth layer (1 = far, 3 = close)
        // Natural star tones: crisp white, soft cosmic blue, warm starlight
        color:
          i % 4 === 0
            ? 'rgba(215, 225, 255,'
            : i % 7 === 0
            ? 'rgba(235, 240, 255,'
            : i % 11 === 0
            ? 'rgba(180, 215, 255,'
            : 'rgba(255, 255, 255,',
      });
    }

    // Soft celestial nebulae dust clusters
    const NEBULA_COUNT = 3;
    const nebulae = [
      {
        relX: 0.25,
        relY: 0.35,
        radius: Math.max(280, width * 0.3),
        color: 'rgba(24, 28, 42, 0.45)', // Deep space navy
      },
      {
        relX: 0.75,
        relY: 0.65,
        radius: Math.max(340, width * 0.35),
        color: 'rgba(16, 24, 28, 0.4)', // Deep cosmic teal
      },
      {
        relX: 0.5,
        relY: 0.5,
        radius: Math.max(300, width * 0.32),
        color: 'rgba(20, 18, 30, 0.35)', // Muted stellar violet
      },
    ];

    let pulseTime = 0;

    const render = () => {
      // Smooth camera pan toward mouse
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      const mouseDeltaX = (mouse.x - width / 2) / (width / 2); // -1 to 1
      const mouseDeltaY = (mouse.y - height / 2) / (height / 2); // -1 to 1

      // Music reactive pulse factor (simulated rhythm breathing when playing)
      pulseTime += isPlaying ? 0.035 : 0.01;
      const musicPulse = isPlaying
        ? Math.sin(pulseTime) * 0.25 * volume + 1.05
        : 1.0;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Nebulae Clouds (Ethereal Depth)
      for (const nebula of nebulae) {
        const nx = nebula.relX * width + mouseDeltaX * -25;
        const ny = nebula.relY * height + mouseDeltaY * -25;
        const grad = ctx.createRadialGradient(
          nx,
          ny,
          0,
          nx,
          ny,
          nebula.radius * musicPulse
        );
        grad.addColorStop(0, nebula.color);
        grad.addColorStop(0.55, 'rgba(10, 11, 15, 0.15)');
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(nx, ny, nebula.radius * musicPulse, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Draw & Update Stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Move gently across space
        star.x += star.vx;
        star.y += star.vy;

        // Wrap edges seamlessly
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        // Parallax offset based on layer depth and mouse position
        const parallaxX = star.x - mouseDeltaX * star.layer * 18;
        const parallaxY = star.y - mouseDeltaY * star.layer * 18;

        // Reactive proximity repulsion to cursor
        const dx = parallaxX - mouse.x;
        const dy = parallaxY - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let reactX = parallaxX;
        let reactY = parallaxY;

        if (dist < 140) {
          const force = (1 - dist / 140) * 16;
          reactX += (dx / (dist || 1)) * force;
          reactY += (dy / (dist || 1)) * force;
        }

        // Breathing twinkle
        star.twinkleAngle += star.twinkleSpeed;
        const currentAlpha = Math.max(
          0.1,
          Math.min(
            1.0,
            star.baseAlpha +
              Math.sin(star.twinkleAngle) * 0.3 * (isPlaying ? 1.3 : 0.8)
          )
        );

        // Music reactivity expands star radius softly with the beat
        const currentRadius =
          star.baseRadius * (isPlaying ? musicPulse : 1.0);

        ctx.beginPath();
        ctx.arc(reactX, reactY, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${star.color} ${currentAlpha})`;
        ctx.fill();

        // Subtle stellar glow on closer stars
        if (star.layer > 2.2 && currentAlpha > 0.6) {
          ctx.beginPath();
          ctx.arc(reactX, reactY, currentRadius * 2.4, 0, Math.PI * 2);
          ctx.fillStyle = `${star.color} ${currentAlpha * 0.15})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
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
