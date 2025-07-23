// Animated Card Component with GSAP
function AnimatedCard({ children, className = "", delay = 0, ...props }) {
  if (typeof React === 'undefined') {
    console.error('React is not loaded');
    return null;
  }
  const cardRef = React.useRef(null);

  React.useEffect(() => {
    if (cardRef.current && typeof gsap !== 'undefined') {
      // Animate card entrance
      gsap.fromTo(cardRef.current, 
        { opacity: 0, y: 30, scale: 0.95 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          duration: 0.6,
          ease: "power2.out",
          delay: delay
        }
      );
    }
  }, [delay]);

  const handleMouseEnter = () => {
    if (cardRef.current && typeof gsap !== 'undefined') {
      gsap.to(cardRef.current, {
        duration: 0.3,
        ease: "power2.out",
        scale: 1.02,
        y: -5,
        boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
      });
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current && typeof gsap !== 'undefined') {
      gsap.to(cardRef.current, {
        duration: 0.3,
        ease: "power2.out",
        scale: 1,
        y: 0,
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
      });
    }
  };

  return (
    <div
      ref={cardRef}
      className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 transition-all duration-300 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  );
}

// Animated Button Component
function AnimatedButton({ children, onClick, className = "", variant = "primary", ...props }) {
  const buttonRef = React.useRef(null);

  const handleClick = (e) => {
    if (buttonRef.current && typeof gsap !== 'undefined') {
      gsap.to(buttonRef.current, {
        duration: 0.1,
        ease: "power2.out",
        scale: 0.95,
        onComplete: () => {
          gsap.to(buttonRef.current, {
            duration: 0.2,
            ease: "back.out(1.7)",
            scale: 1,
            onComplete: () => {
              if (onClick) onClick(e);
            }
          });
        }
      });
    } else {
      if (onClick) onClick(e);
    }
  };

  const baseClasses = "px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105";
  const variantClasses = {
    primary: "bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/30",
    secondary: "bg-gray-700 hover:bg-gray-600 text-white shadow-lg",
    outline: "border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Animated List Component
function AnimatedList({ children, className = "", staggerDelay = 0.1 }) {
  const listRef = React.useRef(null);

  React.useEffect(() => {
    if (listRef.current && typeof gsap !== 'undefined') {
      const items = listRef.current.children;
      gsap.fromTo(items, 
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
          stagger: staggerDelay,
          delay: 0
        }
      );
    }
  }, [staggerDelay]);

  return (
    <div ref={listRef} className={className}>
      {children}
    </div>
  );
}

// Animated Text Component
function AnimatedText({ text, className = "", speed = 0.05 }) {
  const textRef = React.useRef(null);

  React.useEffect(() => {
    if (textRef.current && typeof gsap !== 'undefined' && text) {
      gsap.to(textRef.current, {
        duration: text.length * speed,
        text: text,
        ease: "none"
      });
    }
  }, [text, speed]);

  return (
    <span ref={textRef} className={className}></span>
  );
}

// Loading Spinner with GSAP
function AnimatedLoader({ size = "md", className = "" }) {
  const loaderRef = React.useRef(null);

  React.useEffect(() => {
    if (loaderRef.current && typeof gsap !== 'undefined') {
      gsap.to(loaderRef.current, {
        duration: 1.5,
        ease: "power2.inOut",
        rotation: 360,
        repeat: -1
      });
    }
  }, []);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  return (
    <div 
      ref={loaderRef}
      className={`${sizeClasses[size]} border-4 border-red-200 border-t-red-600 rounded-full ${className}`}
    />
  );
}

// Make components globally available
if (typeof window !== 'undefined') {
  window.AnimatedCard = AnimatedCard;
  window.AnimatedButton = AnimatedButton;
  window.AnimatedList = AnimatedList;
  window.AnimatedText = AnimatedText;
  window.AnimatedLoader = AnimatedLoader;
  
  // Also make them available as global variables
  window.React = window.React || React;
}