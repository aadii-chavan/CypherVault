import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Bell, AlertTriangle } from 'lucide-react';
import StealthModeManager from '@/components/Security/StealthModeManager';
import BreachCheck from '@/components/Security/BreachCheck';
import { logAuditEvent } from '@/lib/auditLogger';
import { useNavigate } from 'react-router-dom';

/**
 * Security Center Page
 * Central hub for all security features and settings
 */
const SecurityCenter = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stealth');
  const [securityStatus, setSecurityStatus] = useState<'good' | 'warning' | 'error'>('good');
  const [securityIssues, setSecurityIssues] = useState<string[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // Check security status when component mounts
  useEffect(() => {
    const checkSecurityStatus = async () => {
      if (!user) return;
      
      const issues: string[] = [];
      let status = 'good';
      
      try {
        // Log security center access
        await logAuditEvent(
          user.uid,
          'security_center_accessed',
          'User accessed the Security Center'
        );
      } catch (error) {
        console.error('Error checking security status:', error);
        issues.push('Error checking security status');
        status = 'warning';
      }
      
      setSecurityIssues(issues);
      setSecurityStatus(status as 'good' | 'warning' | 'error');
    };
    
    if (user) {
      checkSecurityStatus();
    }
  }, [user]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Log tab change if user is logged in
    if (user) {
      logAuditEvent(
        user.uid,
        'security_center_tab_changed',
        `User navigated to ${value} tab`
      ).catch(error => {
        console.error('Error logging tab change:', error);
      });
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  // Show error state if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You must be logged in to access the Security Center.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Security Center</h1>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-sm text-muted-foreground">
              Security Status: <span className="font-bold">{securityStatus}</span>
            </span>
          </div>
        </div>

        {securityIssues.length > 0 && (
          <Alert variant={securityStatus === 'error' ? 'destructive' : 'warning'}>
            <Bell className="h-4 w-4" />
            <AlertTitle>Security Issues Detected</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside">
                {securityIssues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="stealth" className="flex-1">Stealth Mode</TabsTrigger>
                <TabsTrigger value="breach" className="flex-1">Breach Check</TabsTrigger>
              </TabsList>
              <TabsContent value="stealth">
                <StealthModeManager />
              </TabsContent>
              <TabsContent value="breach">
                <BreachCheck />
              </TabsContent>
            </Tabs>
          </CardHeader>
          <CardContent>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurityCenter; 