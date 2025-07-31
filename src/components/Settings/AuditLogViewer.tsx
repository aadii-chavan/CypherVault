import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Shield, 
  Search, 
  Clock, 
  UserCheck, 
  Lock, 
  Unlock, 
  KeyRound,
  Key,
  FileEdit,
  Trash2,
  UserPlus,
  UserMinus,
  Settings,
  LogOut,
  RefreshCw,
  Filter
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AuditLogEntry, AuditEvent, getRecentAuditLogs } from '@/lib/auditLogger';
import { useAuth } from '@/contexts/AuthContext';

const AuditLogViewer: React.FC = () => {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [filter, setFilter] = useState<AuditEvent | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        const auditLogs = await getRecentAuditLogs(currentUser.uid, 100);
        setLogs(auditLogs);
        setFilteredLogs(auditLogs);
      } catch (error) {
        console.error('Error fetching audit logs:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
  }, [currentUser]);

  useEffect(() => {
    // Apply filters when logs, filter value, or search query changes
    if (logs.length === 0) return;
    
    let filtered = [...logs];
    
    // Apply event type filter
    if (filter !== 'all') {
      filtered = filtered.filter(log => log.event === filter);
    }
    
    // Apply search query filter
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.event.toLowerCase().includes(lowerQuery) ||
        (log.details && log.details.toLowerCase().includes(lowerQuery))
      );
    }
    
    setFilteredLogs(filtered);
  }, [logs, filter, searchQuery]);

  const refreshLogs = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const auditLogs = await getRecentAuditLogs(currentUser.uid, 100);
      setLogs(auditLogs);
      setFilteredLogs(auditLogs);
    } catch (error) {
      console.error('Error refreshing audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (event: AuditEvent) => {
    switch (event) {
      case 'login_success': 
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'login_failed': 
        return <UserCheck className="h-4 w-4 text-red-500" />;
      case 'logout': 
        return <LogOut className="h-4 w-4 text-blue-500" />;
      case 'vault_unlock': 
        return <Unlock className="h-4 w-4 text-green-500" />;
      case 'vault_lock': 
        return <Lock className="h-4 w-4 text-orange-500" />;
      case 'password_added': 
        return <Key className="h-4 w-4 text-green-500" />;
      case 'password_updated': 
        return <FileEdit className="h-4 w-4 text-blue-500" />;
      case 'password_deleted': 
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'password_exported': 
        return <Key className="h-4 w-4 text-yellow-500" />;
      case 'two_factor_enabled': 
        return <Shield className="h-4 w-4 text-green-500" />;
      case 'two_factor_disabled': 
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'two_factor_verification_success': 
        return <Shield className="h-4 w-4 text-green-500" />;
      case 'two_factor_verification_failed': 
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'master_key_changed': 
        return <KeyRound className="h-4 w-4 text-orange-500" />;
      case 'account_created': 
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'account_deleted': 
        return <UserMinus className="h-4 w-4 text-red-500" />;
      case 'settings_changed': 
        return <Settings className="h-4 w-4 text-blue-500" />;
      default: 
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatEventName = (event: AuditEvent): string => {
    return event
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold">Security Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search audit logs..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Select
              value={filter}
              onValueChange={(value) => setFilter(value as AuditEvent | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="login_success">Login Success</SelectItem>
                <SelectItem value="login_failed">Login Failed</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="vault_unlock">Vault Unlock</SelectItem>
                <SelectItem value="vault_lock">Vault Lock</SelectItem>
                <SelectItem value="password_added">Password Added</SelectItem>
                <SelectItem value="password_updated">Password Updated</SelectItem>
                <SelectItem value="password_deleted">Password Deleted</SelectItem>
                <SelectItem value="two_factor_enabled">2FA Enabled</SelectItem>
                <SelectItem value="two_factor_disabled">2FA Disabled</SelectItem>
                <SelectItem value="master_key_changed">Master Key Changed</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={refreshLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Timestamp</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="hidden md:table-cell">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log, index) => (
                  <TableRow key={`${log.event}-${log.timestamp}-${index}`}>
                    <TableCell className="font-mono text-xs">
                      {formatDate(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getEventIcon(log.event)}
                        <span>{formatEventName(log.event)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {log.details || 'No additional details'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p>No audit logs found</p>
            <p className="text-sm">
              {filter !== 'all' || searchQuery ? 
                'Try adjusting your filters' : 
                'Security events will appear here as they occur'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditLogViewer; 