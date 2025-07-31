import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ClipboardSettings,
  getClipboardSettings,
  saveClipboardSettings,
  copyToClipboard,
  isClipboardAPIAvailable,
} from '@/lib/clipboardUtils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { 
  fadeInUp, 
  fadeInLeft, 
  springs, 
  spin, 
  popIn, 
  staggerChildren, 
  listItem 
} from '@/components/ui/animation';

export default function ClipboardManager() {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<ClipboardSettings>({
    autoClear: false,
    clearTime: 30,
  });
  const [loading, setLoading] = useState(true);
  const [testText, setTestText] = useState('Test clipboard text');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const clipboardAvailable = isClipboardAPIAvailable();

  // Load saved settings when component mounts
  useEffect(() => {
    async function loadSettings() {
      if (!currentUser?.uid) return;
      
      try {
        setLoading(true);
        const savedSettings = await getClipboardSettings(currentUser.uid);
        setSettings(savedSettings);
      } catch (error) {
        console.error('Error loading clipboard settings:', error);
        toast.error('Failed to load clipboard settings');
      } finally {
        setLoading(false);
      }
    }
    
    loadSettings();
  }, [currentUser]);

  // Reset copy status after animation completes
  useEffect(() => {
    if (copyStatus !== 'idle') {
      const timer = setTimeout(() => {
        setCopyStatus('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  // Handle switch toggle for auto-clear
  const handleAutoClearToggle = async (checked: boolean) => {
    if (!currentUser?.uid) return;
    
    try {
      const newSettings = { ...settings, autoClear: checked };
      setSettings(newSettings);
      await saveClipboardSettings(currentUser.uid, newSettings);
      toast.success('Settings updated');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  // Handle clear time change
  const handleClearTimeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser?.uid) return;
    
    try {
      const clearTime = parseInt(e.target.value, 10) || 0;
      const newSettings = { ...settings, clearTime };
      setSettings(newSettings);
      await saveClipboardSettings(currentUser.uid, newSettings);
      toast.success('Settings updated');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  // Test clipboard function
  const handleTestCopy = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const success = await copyToClipboard(
        testText,
        'test text',
        currentUser.uid
      );
      
      if (success) {
        setCopyStatus('success');
        toast.success('Text copied to clipboard');
        if (settings.autoClear) {
          toast.info(`Clipboard will be cleared in ${settings.clearTime} seconds`);
        }
      } else {
        setCopyStatus('error');
        toast.error('Failed to copy text to clipboard');
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setCopyStatus('error');
      toast.error('Failed to copy text to clipboard');
    }
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      transition={{ ...springs.gentle }}
    >
      <Card className="w-full">
        <CardHeader>
          <motion.div className="flex items-center">
            <motion.div
              animate={{ rotate: [0, 15, 0, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="mr-2"
            >
              <Clipboard className="h-5 w-5" />
            </motion.div>
            <CardTitle>Clipboard Security</CardTitle>
          </motion.div>
          <CardDescription>
            Configure clipboard security settings to protect sensitive information
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <AnimatePresence>
            {!clipboardAvailable && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-amber-100 dark:bg-amber-950 p-3 rounded-md mb-4"
              >
                <motion.div className="flex items-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, ...springs.bouncy }}
                    className="mr-2 text-amber-800 dark:text-amber-200"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </motion.div>
                  <p className="text-amber-800 dark:text-amber-200">
                    Clipboard API is not available in your browser. Some features may not work.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.div className="space-y-2" variants={fadeInUp}>
            <div className="flex items-center justify-between">
              <Label htmlFor="autoClear" className="flex-1">
                Auto-clear clipboard
              </Label>
              <Switch
                id="autoClear"
                checked={settings.autoClear}
                onCheckedChange={handleAutoClearToggle}
                disabled={loading || !clipboardAvailable}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically clear the clipboard after a specified time
            </p>
          </motion.div>
          
          <motion.div 
            className="space-y-2" 
            variants={fadeInLeft}
            animate={settings.autoClear ? "visible" : { opacity: 0.7 }}
            transition={{ duration: 0.3 }}
          >
            <Label htmlFor="clearTime">Clear time (seconds)</Label>
            <Input
              id="clearTime"
              type="number"
              min="1"
              max="3600"
              value={settings.clearTime}
              onChange={handleClearTimeChange}
              disabled={loading || !settings.autoClear || !clipboardAvailable}
            />
            <p className="text-sm text-muted-foreground">
              Time in seconds before the clipboard is automatically cleared
            </p>
          </motion.div>
          
          <motion.div 
            className="space-y-2 pt-4 border-t"
            variants={fadeInUp}
          >
            <Label htmlFor="testText">Test clipboard</Label>
            <div className="flex gap-2">
              <Input
                id="testText"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter text to copy"
                disabled={loading || !clipboardAvailable}
              />
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button 
                  onClick={handleTestCopy}
                  disabled={loading || !clipboardAvailable}
                >
                  {loading ? (
                    <motion.div
                      animate={spin}
                      className="mr-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <AnimatePresence mode="wait">
                      {copyStatus === 'idle' ? (
                        <Clipboard className="h-4 w-4 mr-2" />
                      ) : copyStatus === 'success' ? (
                        <motion.div
                          key="success"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={springs.bouncy}
                          className="mr-2"
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="error"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={springs.bouncy}
                          className="mr-2"
                        >
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                  Copy
                </Button>
              </motion.div>
            </div>
            <p className="text-sm text-muted-foreground">
              Test the clipboard functionality with auto-clear
            </p>
          </motion.div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <motion.p 
            className="text-sm text-muted-foreground"
            animate={{ 
              opacity: [0.7, 1, 0.7],
              scale: settings.autoClear ? [1, 1.02, 1] : 1
            }}
            transition={{ 
              duration: settings.autoClear ? 2 : 0,
              repeat: settings.autoClear ? Infinity : 0,
              repeatDelay: 1
            }}
          >
            {settings.autoClear
              ? `Clipboard will auto-clear after ${settings.clearTime} seconds`
              : 'Auto-clear is disabled'}
          </motion.p>
        </CardFooter>
      </Card>
    </motion.div>
  );
} 