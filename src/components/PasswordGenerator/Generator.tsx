
import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Check, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { generatePassword, calculatePasswordStrength } from '@/lib/encryption';

const PasswordGenerator: React.FC = () => {
  const { toast } = useToast();
  const [passwordLength, setPasswordLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate password on initial load and when settings change
  useEffect(() => {
    handleGeneratePassword();
  }, [passwordLength, includeUppercase, includeLowercase, includeNumbers, includeSymbols]);

  const handleGeneratePassword = () => {
    // Ensure at least one character set is selected
    if (!includeUppercase && !includeLowercase && !includeNumbers && !includeSymbols) {
      setIncludeLowercase(true);
    }
    
    const newPassword = generatePassword(
      passwordLength,
      includeUppercase,
      includeLowercase,
      includeNumbers,
      includeSymbols
    );
    
    setGeneratedPassword(newPassword);
    setCopied(false);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    
    toast({
      description: "Password copied to clipboard"
    });
    
    // Reset the copied status after 3 seconds
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  // Calculate password strength
  const passwordStrength = calculatePasswordStrength(generatedPassword);

  // Get color for strength indicator
  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-red-500';
    }
  };

  // Get width for strength indicator
  const getStrengthWidth = () => {
    switch (passwordStrength) {
      case 'weak': return 'w-1/3';
      case 'medium': return 'w-2/3';
      case 'strong': return 'w-full';
      default: return 'w-1/3';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex justify-center mb-2">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-center">Password Generator</CardTitle>
        <CardDescription className="text-center">
          Create strong, secure passwords
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Generated Password */}
        <div className="space-y-3">
          <div className="relative">
            <div className="font-mono text-lg bg-muted p-3 rounded-md text-center break-all min-h-16 flex items-center justify-center">
              {generatedPassword}
            </div>
            <div className="absolute right-3 top-3 flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGeneratePassword}
                className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"
              >
                <RefreshCw size={15} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyPassword}
                className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </Button>
            </div>
          </div>
          
          {/* Strength Indicator */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm">Strength</span>
              <span className="text-sm capitalize">{passwordStrength}</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${getStrengthColor()} ${getStrengthWidth()} transition-all duration-500`} 
              ></div>
            </div>
          </div>
        </div>
        
        {/* Length Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="passwordLength">Password Length</Label>
            <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {passwordLength}
            </span>
          </div>
          <Slider
            id="passwordLength"
            min={8}
            max={32}
            step={1}
            value={[passwordLength]}
            onValueChange={(values) => setPasswordLength(values[0])}
          />
        </div>
        
        {/* Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="includeUppercase" className="cursor-pointer">Include Uppercase</Label>
            <Switch
              id="includeUppercase"
              checked={includeUppercase}
              onCheckedChange={setIncludeUppercase}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="includeLowercase" className="cursor-pointer">Include Lowercase</Label>
            <Switch
              id="includeLowercase"
              checked={includeLowercase}
              onCheckedChange={setIncludeLowercase}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="includeNumbers" className="cursor-pointer">Include Numbers</Label>
            <Switch
              id="includeNumbers"
              checked={includeNumbers}
              onCheckedChange={setIncludeNumbers}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="includeSymbols" className="cursor-pointer">Include Symbols</Label>
            <Switch
              id="includeSymbols"
              checked={includeSymbols}
              onCheckedChange={setIncludeSymbols}
            />
          </div>
        </div>
        
        {/* Generate Button */}
        <Button
          onClick={handleGeneratePassword}
          className="w-full"
        >
          <RefreshCw size={16} className="mr-2" />
          Generate New Password
        </Button>
      </CardContent>
    </Card>
  );
};

export default PasswordGenerator;
