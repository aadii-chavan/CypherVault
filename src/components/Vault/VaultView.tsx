import { useState } from 'react';
import { Search, Plus, Lock, Eye, EyeOff, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PasswordCrypto } from '@/lib/crypto';

type PasswordCategory = 'All' | 'Social' | 'Banking' | 'Work' | 'Personal' | 'Other';

interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  encryptedPassword: string;
  category: Exclude<PasswordCategory, 'All'>;
  icon?: string;
}

export function VaultView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PasswordCategory>('All');
  const [revealedPasswords, setRevealedPasswords] = useState<Map<string, string>>(new Map());
  const [isDecrypting, setIsDecrypting] = useState<Set<string>>(new Set());

  const categories: PasswordCategory[] = ['All', 'Social', 'Banking', 'Work', 'Personal', 'Other'];

  // This would come from your authentication context
  const masterPassword = 'your-master-password';

  const togglePasswordVisibility = async (entry: PasswordEntry) => {
    if (revealedPasswords.has(entry.id)) {
      const newMap = new Map(revealedPasswords);
      newMap.delete(entry.id);
      setRevealedPasswords(newMap);
      return;
    }

    try {
      setIsDecrypting(prev => new Set([...prev, entry.id]));
      const decryptedPassword = await PasswordCrypto.decrypt(entry.encryptedPassword, masterPassword);
      setRevealedPasswords(prev => new Map([...prev, [entry.id, decryptedPassword]]));
    } catch (error) {
      console.error('Failed to decrypt password:', error);
      // You can show an error toast here
    } finally {
      setIsDecrypting(prev => {
        const newSet = new Set(prev);
        newSet.delete(entry.id);
        return newSet;
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You can add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Example password entries - in reality, this would come from your database
  const passwordEntries: PasswordEntry[] = [
    {
      id: '1',
      title: 'Gmail',
      username: 'user@example.com',
      encryptedPassword: 'encrypted-password-here',
      category: 'Social',
      icon: 'G',
    },
    // Add more entries as needed
  ];

  const filteredEntries = passwordEntries.filter(entry => {
    const matchesCategory = selectedCategory === 'All' || entry.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.username.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Your Passwords</h2>
        <div className="flex items-center gap-4">
          <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> Add
          </button>
          <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            <Lock className="mr-2 h-4 w-4" /> Lock
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search passwords..."
            className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 border-b pb-4">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              selectedCategory === category
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredEntries.map(entry => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                {entry.icon}
              </div>
              <div>
                <h3 className="font-semibold">{entry.title}</h3>
                <p className="text-sm text-muted-foreground">{entry.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="min-w-[200px] px-4 py-2 bg-muted rounded-md font-mono">
                {isDecrypting.has(entry.id) ? (
                  'Decrypting...'
                ) : revealedPasswords.has(entry.id) ? (
                  revealedPasswords.get(entry.id)
                ) : (
                  '••••••••'
                )}
              </div>
              <button
                onClick={() => togglePasswordVisibility(entry)}
                className="p-2 hover:bg-accent rounded-md"
                disabled={isDecrypting.has(entry.id)}
              >
                {revealedPasswords.has(entry.id) ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => copyToClipboard(revealedPasswords.get(entry.id) || entry.encryptedPassword)}
                className="p-2 hover:bg-accent rounded-md"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 