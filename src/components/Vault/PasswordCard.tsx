import React, { useState } from 'react';
import { Eye, EyeOff, Copy, ExternalLink, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PasswordEntry } from './PasswordList';

interface PasswordCardProps {
  password: PasswordEntry;
  onEdit: () => void;
  onDelete: () => void;
  decryptPassword?: (id: string) => Promise<string>;
}

const PasswordCard: React.FC<PasswordCardProps> = ({
  password,
  onEdit,
  onDelete,
  decryptPassword
}) => {
  const { toast } = useToast();
  const { lockVault } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedPassword, setDecryptedPassword] = useState<string | null>(null);

  // Handle showing/hiding password
  const togglePassword = async () => {
    if (!password.password && !password.encryptedPassword) return;

    if (password.password) {
      setShowPassword(!showPassword);
      return;
    }

    if (decryptPassword && password.encryptedPassword) {
      if (decryptedPassword) {
        setShowPassword(!showPassword);
      } else {
        try {
          setIsDecrypting(true);
          const result = await decryptPassword(password.id);
          if (result) {
            setDecryptedPassword(result);
            setShowPassword(true);
          } else {
            toast({
              title: "Error",
              description: "Could not decrypt password",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Failed to decrypt:", error);
          toast({
            title: "Error",
            description: "Could not decrypt password",
            variant: "destructive"
          });
        } finally {
          setIsDecrypting(false);
        }
      }
    }
  };

  // Handle copying text to clipboard
  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    
    navigator.clipboard.writeText(text);
    toast({
      description: `${label} copied to clipboard`
    });
  };

  // Get the actual password to display
  const passwordToShow = decryptedPassword || password.password || "";

  return (
    <Card className="mb-3">
      <CardContent className="p-3">
        {/* Header with title, actions */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              {password.title.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-medium">
                {password.title}
              </h3>
              {password.username && (
                <p className="text-sm text-muted-foreground">
                  {password.username}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-1">
            {password.website && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  let url = password.website!;
                  if (!url.startsWith('http')) url = `https://${url}`;
                  window.open(url, '_blank');
                }}
              >
                <ExternalLink size={16} />
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit size={16} className="mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive"
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Password field */}
        <div className="mb-1.5">
          <div className="flex items-center space-x-1.5">
            <div className="bg-muted rounded px-2 py-1.5 flex-1 font-lato text-sm tracking-wide">
              {showPassword ? passwordToShow : '•'.repeat(Math.min(12, passwordToShow.length || 12))}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={togglePassword}
              disabled={isDecrypting}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleCopy(passwordToShow, "Password")}
            >
              <Copy size={16} />
            </Button>
          </div>
        </div>
        
        {/* Phone number field */}
        {password.phoneNumber && (
          <div className="mt-1.5">
            <div className="text-xs text-muted-foreground mb-0.5">Phone Number</div>
            <div className="flex items-center space-x-1.5">
              <div className="bg-muted rounded px-2 py-1.5 flex-1 font-lato text-sm tracking-wide">
                {password.phoneNumber}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleCopy(password.phoneNumber!, "Phone Number")}
              >
                <Copy size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Custom Fields */}
        {password.customFields && password.customFields.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {password.customFields.map((field, index) => (
              <div key={index} className="mt-1.5">
                <div className="text-xs text-muted-foreground mb-0.5">{field.label}</div>
                <div className="flex items-center space-x-1.5">
                  <div className="bg-muted rounded px-2 py-1.5 flex-1 font-lato text-sm tracking-wide">
                    {field.value}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopy(field.value, field.label)}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PasswordCard;
