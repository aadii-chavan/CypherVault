import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransitions } from '@/components/ui/animation';

interface AnimatedLayoutProps {
  children: React.ReactNode;
  /**
   * Unique key for this layout, usually the route path
   * Changing this key will trigger exit/enter animations
   */
  layoutKey: string;
}

/**
 * Animated layout wrapper that adds page transitions
 * Wrap page content with this to get smooth page transitions
 */
const AnimatedLayout: React.FC<AnimatedLayoutProps> = ({
  children,
  layoutKey
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={layoutKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageTransitions}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedLayout; 