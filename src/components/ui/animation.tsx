import { Variants } from 'framer-motion';

/**
 * Animation utility for consistent animations throughout the app
 */

// Spring configurations for different animation types
export const springs = {
  // Gentle spring for subtle animations
  gentle: {
    type: "spring",
    stiffness: 170,
    damping: 26,
  },
  
  // Responsive spring for interactive elements
  responsive: {
    type: "spring",
    stiffness: 300,
    damping: 20,
  },
  
  // Bouncy spring for attention-grabbing animations
  bouncy: {
    type: "spring",
    stiffness: 400,
    damping: 10,
  },
  
  // Snappy spring for quick reactions
  snappy: {
    type: "spring",
    stiffness: 550,
    damping: 30,
  }
};

// Durations for timed animations
export const durations = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  verySlow: 0.8
};

// Easing functions
export const easings = {
  // Standard easings
  easeOut: [0.16, 1, 0.3, 1],  // Gentle ease out
  easeIn: [0.7, 0, 0.84, 0],    // Gentle ease in
  easeInOut: [0.65, 0, 0.35, 1], // Balanced ease in-out
  
  // Custom easings
  anticipate: [0.38, -0.3, 0.7, 1.3], // Slight anticipation before motion
  overshoot: [0.34, 1.56, 0.64, 1],   // Slightly overshoots before settling
};

// Variants for common animations
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: springs.gentle
  }
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: springs.gentle
  }
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: springs.gentle
  }
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: springs.gentle
  }
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: springs.gentle
  }
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: springs.responsive
  }
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: springs.bouncy
  }
};

export const slideInUp: Variants = {
  hidden: { y: 20 },
  visible: { 
    y: 0,
    transition: springs.responsive
  }
};

export const slideInDown: Variants = {
  hidden: { y: -20 },
  visible: { 
    y: 0,
    transition: springs.responsive
  }
};

export const staggerChildren = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1
    }
  }
};

// List item animation for staggered lists
export const listItem: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: springs.gentle
  }
};

// Button hover animations
export const buttonHover = {
  scale: 1.03,
  transition: {
    type: "spring",
    stiffness: 400,
    damping: 10
  }
};

// Card hover animations
export const cardHover = {
  y: -5,
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  transition: springs.gentle
};

// Pulse animation for notifications or alerts
export const pulse = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 1.5,
    ease: "easeInOut",
    times: [0, 0.5, 1],
    repeat: Infinity,
    repeatDelay: 0.5
  }
};

// Loading spinner animation
export const spin = {
  rotate: 360,
  transition: {
    repeat: Infinity,
    ease: "linear",
    duration: 1
  }
};

// Attention-grabbing shake animation
export const shake = {
  x: [0, -5, 5, -5, 5, 0],
  transition: {
    duration: 0.5,
    ease: "easeInOut"
  }
};

// Page transition variants
export const pageTransitions: Variants = {
  initial: { opacity: 0, y: 15 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      ...springs.gentle,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    y: -15,
    transition: {
      ...springs.gentle,
      when: "afterChildren"
    }
  }
};

// Section transitions for page sections
export const sectionTransitions: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      ...springs.gentle,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

// Mobile menu transitions
export const mobileMenu: Variants = {
  closed: {
    x: "100%",
    transition: {
      ...springs.snappy,
      when: "afterChildren"
    }
  },
  open: {
    x: 0,
    transition: {
      ...springs.gentle,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
}; 