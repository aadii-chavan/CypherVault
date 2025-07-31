import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { checkPassword, getRiskLevel, getRecommendations } from '@/lib/hibpUtils';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fadeInUp, 
  fadeInLeft, 
  springs, 
  spin, 
  popIn, 
  staggerChildren, 
  listItem 
} from '@/components/ui/animation';

export default function BreachCheck() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    isBreached: boolean;
    count: number;
    error?: string;
  } | null>(null);
  const { toast } = useToast();

  const handleCheck = async () => {
    if (!password) {
      toast({
        title: 'Error',
        description: 'Please enter a password to check',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const checkResult = await checkPassword(password);
      setResult(checkResult);
      
      if (checkResult.error) {
        toast({
          title: 'Error',
          description: checkResult.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'safe':
        return 'text-green-500';
      case 'low':
        return 'text-yellow-500';
      case 'medium':
        return 'text-orange-500';
      case 'high':
        return 'text-red-500';
      case 'critical':
        return 'text-red-700';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      transition={{ ...springs.gentle, staggerChildren: 0.1 }}
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <motion.div
              animate={spin}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Shield className="h-5 w-5" />
            </motion.div>
            Password Breach Check
          </CardTitle>
          <CardDescription>
            Verify if your passwords have been exposed in data breaches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Info Alert - Matching Session Integrity */}
          <motion.div variants={fadeInUp}>
            <Alert className="mb-6">
              <Shield className="h-4 w-4" />
              <AlertTitle>Security Feature</AlertTitle>
              <AlertDescription>
                Breach Check allows you to verify if your passwords have been exposed in known data breaches using privacy-preserving methods. No sensitive data is ever sent to third parties. This helps you proactively protect your accounts and maintain strong security hygiene.
              </AlertDescription>
            </Alert>
          </motion.div>
          <div className="space-y-4">
            <motion.form 
              className="flex gap-2"
              variants={fadeInLeft}
              onSubmit={(e) => {
                e.preventDefault();
                handleCheck();
              }}
            >
              <Input
                type="password"
                placeholder="Enter password to check"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1"
              />
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
              >
                <Button
                  disabled={isLoading}
                  className="relative overflow-hidden"
                >
                  <motion.span
                    animate={{ opacity: isLoading ? 0 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isLoading ? 'Checking...' : 'Check'}
                  </motion.span>
                  {isLoading && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        animate={spin}
                      />
                    </motion.div>
                  )}
                </Button>
              </motion.button>
            </motion.form>
          
            <AnimatePresence>
              {result && (
                <motion.div
                  key={result.isBreached ? 'breached' : 'safe'}
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, y: -20, transition: springs.gentle }}
                  className="space-y-4"
                >
                  <Alert variant={result.isBreached ? 'destructive' : 'default'}>
                    <motion.div
                      variants={popIn}
                    >
                      {result.isBreached ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </motion.div>
                    <AlertTitle>
                      {result.isBreached ? 'Password Found in Breaches' : 'Password Not Found in Breaches'}
                    </AlertTitle>
                    <AlertDescription>
                      {result.isBreached
                        ? `This password has been found in ${result.count} data breaches.`
                        : 'This password has not been found in any known data breaches.'}
                    </AlertDescription>
                  </Alert>

                  <motion.div
                    variants={staggerChildren}
                    className="space-y-2"
                  >
                    <h4 className="font-medium">Risk Level: 
                      <motion.span
                        className={`ml-2 ${getRiskColor(getRiskLevel(result.count))}`}
                        variants={popIn}
                      >
                        {getRiskLevel(result.count).toUpperCase()}
                      </motion.span>
                    </h4>
                    <motion.ul className="list-disc pl-5 space-y-1">
                      {getRecommendations(getRiskLevel(result.count)).map((rec, index) => (
                        <motion.li
                          key={index}
                          variants={listItem}
                        >
                          {rec}
                        </motion.li>
                      ))}
                    </motion.ul>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 