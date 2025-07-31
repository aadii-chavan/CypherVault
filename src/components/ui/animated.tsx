import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button'; 
import { Input, InputProps } from '@/components/ui/input';
import { Label, LabelProps } from '@/components/ui/label';
import { Card, CardProps, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertProps, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { fadeInLeft, fadeInUp, buttonHover, springs, fadeIn } from '@/components/ui/animation';

// Animated Button
export const AnimatedButton = React.forwardRef<HTMLButtonElement, ButtonProps & MotionProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.div
        whileHover={buttonHover}
        whileTap={{ scale: 0.95 }}
      >
        <Button ref={ref} className={className} {...props}>
          {children}
        </Button>
      </motion.div>
    );
  }
);
AnimatedButton.displayName = 'AnimatedButton';

// Animated Input
export const AnimatedInput = React.forwardRef<HTMLInputElement, InputProps & MotionProps>(
  ({ className, ...props }, ref) => {
    return (
      <motion.div
        variants={fadeInLeft}
        initial="hidden"
        animate="visible"
      >
        <Input ref={ref} className={className} {...props} />
      </motion.div>
    );
  }
);
AnimatedInput.displayName = 'AnimatedInput';

// Animated Label
export const AnimatedLabel = React.forwardRef<HTMLLabelElement, LabelProps & MotionProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <Label ref={ref} className={className} {...props}>
          {children}
        </Label>
      </motion.div>
    );
  }
);
AnimatedLabel.displayName = 'AnimatedLabel';

// Animated Card
export const AnimatedCard: React.FC<CardProps & MotionProps> = ({ 
  children, 
  className,
  ...props 
}) => {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      transition={springs.gentle}
    >
      <Card className={className} {...props}>
        {children}
      </Card>
    </motion.div>
  );
};

// Animated Alert
export const AnimatedAlert: React.FC<AlertProps & MotionProps> = ({ 
  children, 
  className,
  ...props 
}) => {
  return (
    <motion.div
      variants={fadeInLeft}
      initial="hidden"
      animate="visible"
    >
      <Alert className={className} {...props}>
        {children}
      </Alert>
    </motion.div>
  );
};

// Spinner (loading animation)
export const Spinner: React.FC<{ size?: number; className?: string }> = ({ 
  size = 24,
  className = ''
}) => {
  return (
    <motion.div
      className={`inline-block rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
};

// Fade In Container (wraps children with fade in animation)
export const FadeIn: React.FC<{ 
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}> = ({ 
  children, 
  className = '',
  delay = 0,
  direction = 'up'
}) => {
  let variants;
  switch (direction) {
    case 'up':
      variants = fadeInUp;
      break;
    case 'down':
      variants = { 
        hidden: { opacity: 0, y: -20 }, 
        visible: { opacity: 1, y: 0, transition: springs.gentle } 
      };
      break;
    case 'left':
      variants = fadeInLeft;
      break;
    case 'right':
      variants = { 
        hidden: { opacity: 0, x: 20 }, 
        visible: { opacity: 1, x: 0, transition: springs.gentle } 
      };
      break;
    case 'none':
    default:
      variants = fadeIn;
  }

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={{
        ...springs.gentle,
        delay
      }}
    >
      {children}
    </motion.div>
  );
}; 