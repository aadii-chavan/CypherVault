import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Shield, Save, Key, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { logAuditEvent } from '@/lib/auditLogger';
import * as stealthModeUtils from '@/lib/stealthModeUtils';
import { isValidSettings } from '@/lib/stealthModeUtils';

// App titles to choose from
const APP_TITLES = [
  'Documents',
  'Notes',
  'Calendar',
  'Calculator',
  'Weather',
  'Tasks',
  'Contacts',
];

// App icons to choose from (file paths relative to public)
const APP_ICONS = [
  { name: 'Document', path: '/icons/stealth/document.svg' },
  { name: 'Note', path: '/icons/stealth/note.svg' },
  { name: 'Calendar', path: '/icons/stealth/calendar.svg' },
  { name: 'Calculator', path: '/icons/stealth/calculator.svg' },
  { name: 'Weather', path: '/icons/stealth/weather.svg' },
  { name: 'Task', path: '/icons/stealth/task.svg' },
];

/**
 * StealthModeManager component for managing stealth mode and panic key settings
 */
const StealthModeManager: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<stealthModeUtils.StealthModeSettings>({
    ...stealthModeUtils.DEFAULT_SETTINGS,
    enabled: true,
    panicKeyEnabled: true,
    hideNotifications: true
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [listeningForKey, setListeningForKey] = useState(false);
  
  // Load settings when user logs in
  useEffect(() => {
    const loadSettings = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Initialize stealth mode with user ID
        await stealthModeUtils.initializeStealthModeWithUser(user.uid);
        // Get settings after initialization
        const userSettings = await stealthModeUtils.getStealthModeSettings(user.uid);
        if (isValidSettings(userSettings)) {
          setSettings(userSettings);
        } else {
          console.warn('Invalid settings received, using defaults');
          setSettings(stealthModeUtils.DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error('Error loading stealth mode settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load stealth mode settings',
          variant: 'destructive',
        });
        setSettings(stealthModeUtils.DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user, isAuthenticated]);
  
  // Set up key listener when in listening mode
  useEffect(() => {
    if (!listeningForKey) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        // Ignore common keys like Enter, Space, Escape, etc.
        if (['Enter', ' ', 'Escape', 'Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
          return;
        }
        
        // Update panic key
        updateSetting('panicKey', e.key);
        setListeningForKey(false);
        
        toast({
          title: 'Panic key set',
          description: `Your panic key has been set to "${e.key}"`,
        });
      } catch (error) {
        console.error('Error handling key press:', error);
        toast({
          title: 'Error',
          description: 'Failed to set panic key',
          variant: 'destructive',
        });
        setListeningForKey(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningForKey]);
  
  // Add listener for clear-vault-key event
  useEffect(() => {
    const handleClearVaultKey = () => {
      try {
        console.log("Received clear-vault-key event, clearing any stored keys");
        
        // Add any cleanup for sensitive data here
        localStorage.removeItem('masterKey');
        localStorage.removeItem('vaultData');
        
        // Additional cleanup for debug fields
        localStorage.removeItem('debug_info');
      } catch (error) {
        console.error('Error clearing vault key:', error);
      }
    };
    
    window.addEventListener('clear-vault-key', handleClearVaultKey);
    return () => window.removeEventListener('clear-vault-key', handleClearVaultKey);
  }, []);
  
  // Update a setting field
  const updateSetting = <K extends keyof stealthModeUtils.StealthModeSettings>(
    key: K,
    value: stealthModeUtils.StealthModeSettings[K]
  ) => {
    try {
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update setting',
        variant: 'destructive',
      });
    }
  };
  
  // Save settings to database
  const handleSaveSettings = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Please log in to save settings',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSaving(true);
      await stealthModeUtils.updateStealthModeSettings(user.uid, settings);
      
      // Update stealth mode state based on settings
      if (settings.enabled) {
        stealthModeUtils.activateStealthMode(settings);
      } else {
        stealthModeUtils.deactivateStealthMode();
      }
      
      // Register or unregister panic key listener
      if (settings.panicKeyEnabled && settings.panicKey) {
        stealthModeUtils.registerPanicKeyListener(settings.panicKey);
      } else {
        stealthModeUtils.unregisterPanicKeyListener();
      }
      
      // Log audit event
      try {
        await logAuditEvent(
          user.uid,
          'stealth_settings_updated',
          'Stealth mode settings were updated'
        );
      } catch (logError) {
        console.warn('Error logging audit event:', logError);
      }
      
      toast({
        title: 'Settings saved',
        description: 'Your stealth mode settings have been updated',
      });
    } catch (error) {
      console.error('Error saving stealth mode settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save stealth mode settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Start listening for a panic key
  const handleStartListeningForKey = () => {
    try {
      setListeningForKey(true);
      
      toast({
        title: 'Listening for key press',
        description: 'Press any key to set as your panic key',
      });
    } catch (error) {
      console.error('Error starting key listener:', error);
      toast({
        title: 'Error',
        description: 'Failed to start key listener',
        variant: 'destructive',
      });
    }
  };
  
  // Trigger panic mode for testing
  const handlePanicTrigger = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Please log in to test panic mode',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await stealthModeUtils.triggerPanic();
      
      // Log audit event
      try {
        await logAuditEvent(
          user.uid,
          'panic_triggered',
          'Panic mode was manually triggered'
        );
      } catch (logError) {
        console.warn('Error logging audit event:', logError);
      }
      
      toast({
        title: 'Panic mode triggered',
        description: 'The vault has been locked and stealth mode activated',
      });
    } catch (error) {
      console.error('Error triggering panic mode:', error);
      toast({
        title: 'Error',
        description: 'Failed to trigger panic mode',
        variant: 'destructive',
      });
    }
  };
  
  // Handle input changes with auto-save
  const handleInputChange = async (field: string, value: string | number | boolean) => {
    if (!user) return;

    try {
      setIsSaving(true);
      const updatedSettings = {
        ...settings,
        [field]: value
      };
      
      // Update local state
      setSettings(updatedSettings);
      
      // Save to database and update stealth mode
      await stealthModeUtils.updateStealthModeSettings(user.uid, { [field]: value });
      
      // If stealth mode is enabled, reapply settings
      if (updatedSettings.enabled) {
        stealthModeUtils.activateStealthMode(updatedSettings);
      }
      
      toast({
        title: 'Settings saved',
        description: 'Your stealth mode settings have been updated',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error saving setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
      // Revert local state on error
      setSettings(settings);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle panic key toggle
  const handlePanicKeyToggle = async (enabled: boolean) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Please log in to use panic key',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      const updatedSettings = {
        ...settings,
        panicKeyEnabled: enabled
      };
      
      // Update local state
      setSettings(updatedSettings);
      
      // Save to database
      await stealthModeUtils.updateStealthModeSettings(user.uid, { panicKeyEnabled: enabled });
      
      // Register or unregister panic key listener
      if (enabled && settings.panicKey) {
        stealthModeUtils.registerPanicKeyListener(settings.panicKey);
      } else {
        stealthModeUtils.unregisterPanicKeyListener();
      }
      
      toast({
        title: 'Settings saved',
        description: `Panic key ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error toggling panic key:', error);
      toast({
        title: 'Error',
        description: 'Failed to update panic key settings',
        variant: 'destructive',
      });
      // Revert local state on error
      setSettings(settings);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle panic key change
  const handlePanicKeyChange = async (key: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Please log in to set panic key',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      const updatedSettings = {
        ...settings,
        panicKey: key
      };
      
      // Update local state
      setSettings(updatedSettings);
      
      // Save to database
      await stealthModeUtils.updateStealthModeSettings(user.uid, { panicKey: key });
      
      // Register new panic key listener if enabled
      if (settings.panicKeyEnabled) {
        stealthModeUtils.registerPanicKeyListener(key);
      }
      
      toast({
        title: 'Settings saved',
        description: `Panic key set to "${key}"`,
      });
    } catch (error) {
      console.error('Error setting panic key:', error);
      toast({
        title: 'Error',
        description: 'Failed to set panic key',
        variant: 'destructive',
      });
      // Revert local state on error
      setSettings(settings);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle toggle for stealth mode
  const handleStealthModeToggle = async (enabled: boolean) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Please log in to use stealth mode',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Update local state
      const updatedSettings = { ...settings, enabled };
      setSettings(updatedSettings);

      // Save to database
      await stealthModeUtils.updateStealthModeSettings(user.uid, updatedSettings);

      // Activate or deactivate stealth mode
      if (enabled) {
        stealthModeUtils.activateStealthMode(updatedSettings);
        toast({
          title: 'Success',
          description: 'Stealth mode activated',
        });
      } else {
        stealthModeUtils.deactivateStealthMode();
        toast({
          title: 'Success',
          description: 'Stealth mode deactivated',
        });
      }

      // Log the event
      console.log(`Stealth mode ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling stealth mode:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle stealth mode',
        variant: 'destructive',
      });
      // Revert local state on error
      setSettings(settings);
    }
  };
  
  if (loading) {
    return <div className="text-center py-8">Loading stealth mode settings...</div>;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <EyeOff className="h-5 w-5 mr-2" />
          Stealth Mode
        </CardTitle>
        <CardDescription>
          Configure stealth mode and emergency panic key functionality
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>High-Security Feature</AlertTitle>
          <AlertDescription>
            Stealth mode disguises your vault as a harmless app and provides emergency protection
            with a panic key to quickly hide sensitive information.
          </AlertDescription>
        </Alert>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="stealth-toggle">Enable stealth mode</Label>
              <Switch
                id="stealth-toggle"
                checked={settings.enabled}
                onCheckedChange={(checked) => handleStealthModeToggle(checked)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              When enabled, disguises the app as a different application to hide its true purpose
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="app-title">App title when in stealth mode</Label>
            <Select
              value={settings.appTitle}
              onValueChange={(value) => handleInputChange('appTitle', value)}
              disabled={!settings.enabled}
            >
              <SelectTrigger id="app-title" className="w-full">
                <SelectValue placeholder="Select an app title" />
              </SelectTrigger>
              <SelectContent>
                {APP_TITLES.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="app-icon">App icon when in stealth mode</Label>
            <div className="flex gap-4 items-center">
              <Select
                value={settings.appIcon}
                onValueChange={(value) => handleInputChange('appIcon', value)}
                disabled={!settings.enabled}
              >
                <SelectTrigger id="app-icon" className="w-[200px]">
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  {APP_ICONS.map((icon) => (
                    <SelectItem key={icon.path} value={icon.path}>
                      {icon.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Icon Preview */}
              <div className="flex-1 flex justify-center">
                <div className="border rounded-lg p-4 flex items-center justify-center bg-muted/20 w-16 h-16">
                  {settings.appIcon && (
                    <img 
                      src={settings.appIcon} 
                      alt="Selected icon" 
                      className="w-12 h-12 object-contain"
                      style={{ filter: settings.enabled ? 'none' : 'grayscale(100%)' }}
                    />
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Icon to display in browser tab when stealth mode is active
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications-toggle">Hide notifications</Label>
              <Switch
                id="notifications-toggle"
                checked={settings.hideNotifications}
                onCheckedChange={(checked) => handleInputChange('hideNotifications', checked)}
                disabled={!settings.enabled}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Suppress browser notifications when in stealth mode
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="panic-key-toggle">Enable panic key</Label>
              <Switch
                id="panic-key-toggle"
                checked={settings.panicKeyEnabled}
                onCheckedChange={handlePanicKeyToggle}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Set a key that when pressed will lock the vault and activate stealth mode
            </p>
          </div>
          
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="panic-key">Panic key</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setListeningForKey(true)}
                disabled={!settings.panicKeyEnabled || listeningForKey}
              >
                {listeningForKey ? (
                  <span className="flex items-center">
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Press any key...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Key className="h-4 w-4 mr-2" />
                    Set Key
                  </span>
                )}
              </Button>
            </div>
            <Input
              id="panic-key"
              value={settings.panicKey}
              readOnly
              disabled={!settings.panicKeyEnabled}
            />
            <p className="text-sm text-muted-foreground">
              Press this key to instantly lock and hide the vault in emergency situations
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="redirect-url">Emergency redirect URL</Label>
            <Input
              id="redirect-url"
              value={settings.redirectUrl}
              onChange={(e) => handleInputChange('redirectUrl', e.target.value)}
              placeholder="https://google.com"
              disabled={!settings.enabled && !settings.panicKeyEnabled}
            />
            <p className="text-sm text-muted-foreground">
              URL to navigate to when stealth mode is activated via panic key
            </p>
          </div>
          
          <div className="pt-4">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Emergency Feature</AlertTitle>
              <AlertDescription>
                This will lock your vault, clear the clipboard, and redirect to your safe URL.
                Only use to test your emergency settings.
              </AlertDescription>
            </Alert>
            
            <Button
              variant="destructive"
              onClick={handlePanicTrigger}
              disabled={!settings.panicKeyEnabled}
              className="w-full"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Test Emergency Mode
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StealthModeManager; 