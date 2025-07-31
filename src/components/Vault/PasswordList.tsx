import React, { useState } from 'react';
import { PlusCircle, Search, Folder, Filter, SlidersHorizontal, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import PasswordCard from './PasswordCard';
import AddEditModal from './AddEditModal';
import { cn } from '@/lib/utils';

export interface PasswordEntry {
  id: string;
  title: string;
  username?: string;
  email?: string;
  // Password can be either directly stored (legacy) or encrypted
  password?: string;
  // New field for encrypted password
  encryptedPassword?: string;
  website?: string;
  phoneNumber?: string;
  category: string;
  notes?: string;
  customFields?: { label: string; value: string }[];
  createdAt: number;
  updatedAt: number;
}

interface PasswordListProps {
  passwords: PasswordEntry[];
  onAddPassword: (password: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdatePassword: (id: string, password: Partial<PasswordEntry>) => void;
  onDeletePassword: (id: string) => void;
  decryptPassword?: (id: string) => Promise<string>;
}

const PasswordList: React.FC<PasswordListProps> = ({
  passwords,
  onAddPassword,
  onUpdatePassword,
  onDeletePassword,
  decryptPassword
}) => {
  const { lockVault } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<PasswordEntry | null>(null);

  const categories = [
    { id: 'all', name: 'All', icon: <SlidersHorizontal size={16} /> },
    { id: 'social', name: 'Social', icon: <Folder size={16} /> },
    { id: 'banking', name: 'Banking', icon: <Folder size={16} /> },
    { id: 'work', name: 'Work', icon: <Folder size={16} /> },
    { id: 'personal', name: 'Personal', icon: <Folder size={16} /> },
    { id: 'other', name: 'Other', icon: <Folder size={16} /> }
  ];

  const sortOptions = [
    { id: 'nameAsc', name: 'Name (A-Z)' },
    { id: 'nameDesc', name: 'Name (Z-A)' },
    { id: 'newest', name: 'Newest First' },
    { id: 'oldest', name: 'Oldest First' }
  ];
  
  const [sortOption, setSortOption] = useState('nameAsc');

  const filteredPasswords = passwords.filter(password => {
    const matchesSearch = 
      password.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (password.username && password.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (password.email && password.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (password.website && password.website.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesCategory = selectedCategory === 'all' || password.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  const sortedPasswords = [...filteredPasswords].sort((a, b) => {
    switch (sortOption) {
      case 'nameAsc':
        return a.title.localeCompare(b.title);
      case 'nameDesc':
        return b.title.localeCompare(a.title);
      case 'newest':
        return b.createdAt - a.createdAt;
      case 'oldest':
        return a.createdAt - b.createdAt;
      default:
        return 0;
    }
  });

  const handleEditPassword = (password: PasswordEntry) => {
    setEditingPassword(password);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingPassword(null);
  };

  const handleAddOrUpdatePassword = (password: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingPassword) {
      onUpdatePassword(editingPassword.id, password);
    } else {
      onAddPassword(password);
    }
    handleCloseModal();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search and Add Bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search passwords..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Filter size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {sortOptions.map(option => (
              <DropdownMenuItem 
                key={option.id}
                onClick={() => setSortOption(option.id)}
                className={cn(
                  sortOption === option.id && "font-medium bg-muted"
                )}
              >
                {option.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button onClick={() => setIsAddModalOpen(true)}>
          <PlusCircle size={18} className="mr-2" />
          Add
        </Button>
        
        <Button 
          variant="outline" 
          onClick={lockVault}
          className="gap-1.5 ml-1"
        >
          <Lock size={16} />
          <span>Lock</span>
        </Button>
      </div>
      
      {/* Categories and Content */}
      <Tabs 
        defaultValue="all" 
        value={selectedCategory}
        onValueChange={setSelectedCategory}
        className="flex-1 flex flex-col"
      >
        <TabsList className="mb-4 justify-start overflow-x-auto w-full">
          {categories.map((category) => (
            <TabsTrigger 
              key={category.id} 
              value={category.id}
              className="flex items-center gap-1.5"
            >
              {category.icon}
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {categories.map((category) => (
          <TabsContent 
            key={category.id} 
            value={category.id} 
            className="flex-1 overflow-hidden"
          >
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="space-y-3 pr-4">
                {sortedPasswords.length > 0 ? (
                  sortedPasswords.map(password => (
                    <PasswordCard
                      key={password.id}
                      password={password}
                      onEdit={() => handleEditPassword(password)}
                      onDelete={() => onDeletePassword(password.id)}
                      decryptPassword={decryptPassword}
                    />
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Folder className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">No passwords found</h3>
                    <p className="text-muted-foreground mt-1">
                      {searchQuery
                        ? `No results match "${searchQuery}"`
                        : selectedCategory !== 'all'
                        ? `No passwords in the "${categories.find(c => c.id === selectedCategory)?.name}" category`
                        : 'Add a new password to get started'}
                    </p>
                    {!searchQuery && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setIsAddModalOpen(true)}
                      >
                        <PlusCircle size={16} className="mr-2" />
                        Add Password
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
      
      <AddEditModal
        open={isAddModalOpen}
        onClose={handleCloseModal}
        onSave={handleAddOrUpdatePassword}
        password={editingPassword}
      />
    </div>
  );
};

export default PasswordList;
