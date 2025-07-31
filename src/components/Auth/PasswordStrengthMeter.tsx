import React, { useEffect, useState, useMemo } from 'react';
import * as zxcvbn from 'zxcvbn';
import { AlertCircle, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
  onStrengthChange?: (score: number, feedback: string) => void;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  className,
  onStrengthChange
}) => {
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);

  const result = useMemo(() => {
    if (!password) return null;
    return zxcvbn(password);
  }, [password]);

  useEffect(() => {
    if (!result) {
      setScore(0);
      setFeedback([]);
      onStrengthChange?.(0, "");
      return;
    }

    setScore(result.score);
    
    const feedbackItems: string[] = [];
    
    // Add warning if present
    if (result.feedback.warning) {
      feedbackItems.push(result.feedback.warning);
    }
    
    // Add suggestions
    if (result.feedback.suggestions && result.feedback.suggestions.length) {
      feedbackItems.push(...result.feedback.suggestions);
    }
    
    setFeedback(feedbackItems);
    
    // If no specific feedback but score is low, add generic advice
    if (feedbackItems.length === 0 && result.score < 3) {
      setFeedback(["Try adding special characters, numbers, and making it longer."]);
    }
    
    // Call the callback with the primary feedback message
    onStrengthChange?.(
      result.score,
      feedbackItems[0] || getScoreLabel(result.score)
    );
  }, [result, onStrengthChange]);

  const getScoreLabel = (score: number): string => {
    switch (score) {
      case 0: return "Very Weak";
      case 1: return "Weak";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Strong";
      default: return "";
    }
  };

  const getScoreColor = (score: number): string => {
    switch (score) {
      case 0: return "bg-red-500";
      case 1: return "bg-orange-500";
      case 2: return "bg-yellow-500";
      case 3: return "bg-green-500";
      case 4: return "bg-green-600";
      default: return "bg-gray-300";
    }
  };

  const getScoreIcon = (score: number) => {
    if (score < 3) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <Check className="h-4 w-4 text-green-600" />;
    }
  };

  // Don't render anything if no password is entered
  if (!password) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Strength meter bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-300", getScoreColor(score))}
          style={{ width: `${(score + 1) * 20}%` }}
        ></div>
      </div>
      
      <div className="flex items-center text-sm gap-1">
        {getScoreIcon(score)}
        <span className="font-medium">{getScoreLabel(score)}</span>
      </div>
      
      {/* Feedback messages */}
      {feedback.length > 0 && (
        <div className="text-sm text-muted-foreground mt-1 space-y-1">
          {feedback.map((item, index) => (
            <div key={index} className="flex items-center gap-1">
              <Info className="h-3 w-3 flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter; 