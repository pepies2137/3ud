// GSAP Animation Utilities for CARSWAG
// Modern, smooth animations for a fresh look

// Register GSAP plugins
if (typeof gsap !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, TextPlugin);
}

// Animation presets
const AnimationPresets = {
  // Page transitions
  pageEnter: {
    duration: 0.6,
    ease: "power2.out",
    from: { opacity: 0, y: 30, scale: 0.95 },
    to: { opacity: 1, y: 0, scale: 1 }
  },
  
  pageExit: {
    duration: 0.4,
    ease: "power2.in",
    to: { opacity: 0, y: -20, scale: 1.05 }
  },

  // Card animations
  cardHover: {
    duration: 0.3,
    ease: "power2.out",
    scale: 1.02,
    y: -5,
    boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
  },

  cardReset: {
    duration: 0.3,
    ease: "power2.out",
    scale: 1,
    y: 0,
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
  },

  // Button animations
  buttonPress: {
    duration: 0.1,
    ease: "power2.out",
    scale: 0.95
  },

  buttonRelease: {
    duration: 0.2,
    ease: "back.out(1.7)",
    scale: 1
  },

  // Loading animations
  pulse: {
    duration: 1.5,
    ease: "power2.inOut",
    scale: 1.1,
    opacity: 0.7,
    repeat: -1,
    yoyo: true
  },

  // Notification animations
  slideInRight: {
    duration: 0.5,
    ease: "back.out(1.7)",
    from: { x: 100, opacity: 0 },
    to: { x: 0, opacity: 1 }
  },

  slideOutRight: {
    duration: 0.3,
    ease: "power2.in",
    to: { x: 100, opacity: 0 }
  },

  // Stagger animations
  staggerIn: {
    duration: 0.6,
    ease: "power2.out",
    stagger: 0.1,
    from: { opacity: 0, y: 30 },
    to: { opacity: 1, y: 0 }
  }
};

// Animation functions
const Animations = {
  // Page transition
  animatePageTransition(element, direction = 'enter') {
    if (!element || typeof gsap === 'undefined') return;
    
    const preset = direction === 'enter' ? AnimationPresets.pageEnter : AnimationPresets.pageExit;
    
    if (direction === 'enter') {
      gsap.fromTo(element, preset.from, {
        ...preset.to,
        duration: preset.duration,
        ease: preset.ease
      });
    } else {
      gsap.to(element, preset.to);
    }
  },

  // Card hover effects
  animateCardHover(element, isHovering = true) {
    if (!element || typeof gsap === 'undefined') return;
    
    const preset = isHovering ? AnimationPresets.cardHover : AnimationPresets.cardReset;
    gsap.to(element, preset);
  },

  // Button press effect
  animateButtonPress(element, callback) {
    if (!element || typeof gsap === 'undefined') {
      if (callback) callback();
      return;
    }
    
    gsap.to(element, {
      ...AnimationPresets.buttonPress,
      onComplete: () => {
        gsap.to(element, {
          ...AnimationPresets.buttonRelease,
          onComplete: callback
        });
      }
    });
  },

  // Stagger animation for lists
  animateStagger(elements, delay = 0) {
    if (!elements || typeof gsap === 'undefined') return;
    
    gsap.fromTo(elements, 
      AnimationPresets.staggerIn.from,
      {
        ...AnimationPresets.staggerIn.to,
        duration: AnimationPresets.staggerIn.duration,
        ease: AnimationPresets.staggerIn.ease,
        stagger: AnimationPresets.staggerIn.stagger,
        delay
      }
    );
  },

  // Notification slide in
  animateNotification(element, direction = 'in') {
    if (!element || typeof gsap === 'undefined') return;
    
    const preset = direction === 'in' ? AnimationPresets.slideInRight : AnimationPresets.slideOutRight;
    
    if (direction === 'in') {
      gsap.fromTo(element, preset.from, {
        ...preset.to,
        duration: preset.duration,
        ease: preset.ease
      });
    } else {
      gsap.to(element, {
        ...preset.to,
        duration: preset.duration,
        ease: preset.ease
      });
    }
  },

  // Loading pulse
  animateLoading(element) {
    if (!element || typeof gsap === 'undefined') return;
    
    return gsap.to(element, AnimationPresets.pulse);
  },

  // Text typing effect
  animateTextType(element, text, speed = 0.05) {
    if (!element || typeof gsap === 'undefined') return;
    
    gsap.to(element, {
      duration: text.length * speed,
      text: text,
      ease: "none"
    });
  },

  // Smooth scroll to element
  scrollToElement(target, duration = 1) {
    if (typeof gsap === 'undefined') return;
    
    gsap.to(window, {
      duration,
      scrollTo: target,
      ease: "power2.inOut"
    });
  },

  // Parallax effect
  createParallax(element, speed = 0.5) {
    if (!element || typeof gsap === 'undefined') return;
    
    gsap.to(element, {
      yPercent: -50 * speed,
      ease: "none",
      scrollTrigger: {
        trigger: element,
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });
  },

  // Fade in on scroll
  fadeInOnScroll(elements) {
    if (!elements || typeof gsap === 'undefined') return;
    
    gsap.fromTo(elements, 
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: elements,
          start: "top 80%",
          toggleActions: "play none none reverse"
        }
      }
    );
  },

  // Kill all animations
  killAll() {
    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf("*");
    }
  }
};

// Auto-initialize animations when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Add smooth scrolling to all internal links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          Animations.scrollToElement(target);
        }
      });
    });
  });
}

// Export for use in components
window.Animations = Animations;
window.AnimationPresets = AnimationPresets;