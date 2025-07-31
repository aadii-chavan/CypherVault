import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardProps } from '@/components/ui/card';
import { springs, cardHover } from '@/components/ui/animation';

interface AnimatedCardProps extends CardProps {
  /**
   * Make card interactive with hover effects
   * @default false
   */
  interactive?: boolean;
  
  /**
   * Delay the animation by this amount (in seconds)
   * @default 0
   */
  delay?: number;
  
  /**
   * Animation order index for staggered animations
   * @default 0
   */
  index?: number;
}

/**
 * AnimatedCard component
 * A Card component with animations
 */
const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className,
  interactive = false,
  delay = 0,
  index = 0,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        ...springs.gentle,
        delay: delay || (index * 0.1)
      }}
      whileHover={interactive ? cardHover : undefined}
    >
      <Card className={className} {...props}>
        {children}
      </Card>
    </motion.div>
  );
};

export default AnimatedCard; 