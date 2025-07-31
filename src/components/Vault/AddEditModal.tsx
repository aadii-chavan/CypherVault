import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PasswordEntry } from './PasswordList';
import { toast } from '@/components/ui/use-toast';

interface AddEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (password: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  password: PasswordEntry | null;
}

const AddEditModal: React.FC<AddEditModalProps> = ({
  open,
  onClose,
  onSave,
  password
}) => {
  const [formData, setFormData] = useState<Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    username: '',
    email: '',
    password: '',
    website: '',
    phoneNumber: '',
    category: 'personal',
    notes: '',
    customFields: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (password) {
      // Clone the password object without id and timestamps
      const { id, createdAt, updatedAt, ...rest } = password;
      setFormData(rest);
    } else {
      // Reset form for new password
      setFormData({
        title: '',
        username: '',
        email: '',
        password: '',
        website: '',
        phoneNumber: '',
        category: 'personal',
        notes: '',
        customFields: []
      });
    }
  }, [password, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({ ...prev, category: value }));
  };

  const handleCustomFieldChange = (index: number, field: 'label' | 'value', value: string) => {
    setFormData(prev => {
      const updatedFields = [...(prev.customFields || [])];
      if (!updatedFields[index]) {
        updatedFields[index] = { label: '', value: '' };
      }
      updatedFields[index][field] = value;
      return { ...prev, customFields: updatedFields };
    });
  };

  const addCustomField = () => {
    setFormData(prev => ({
      ...prev,
      customFields: [...(prev.customFields || []), { label: '', value: '' }]
    }));
  };

  const removeCustomField = (index: number) => {
    setFormData(prev => {
      const updatedFields = [...(prev.customFields || [])];
      updatedFields.splice(index, 1);
      return { ...prev, customFields: updatedFields };
    });
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a title for your password entry",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.password.trim()) {
      toast({
        title: "Missing Password",
        description: "Please enter a password",
        variant: "destructive"
      });
      return false;
    }

    // Validate custom fields
    const hasEmptyCustomFields = formData.customFields?.some(
      field => (field.label.trim() === '' && field.value.trim() !== '') || 
               (field.label.trim() !== '' && field.value.trim() === '')
    );

    if (hasEmptyCustomFields) {
      toast({
        title: "Invalid Custom Fields",
        description: "Custom fields must have both label and value filled out",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      if (!validateForm()) {
        return;
      }
      
      // Filter out empty custom fields
      const filteredCustomFields = formData.customFields?.filter(
        field => field.label.trim() !== '' && field.value.trim() !== ''
      );
      
      // Create a clean password entry
      const passwordEntry = {
        ...formData,
        customFields: filteredCustomFields,
        password: formData.password.trim()
      };
      
      // Call onSave with the password entry
      await onSave(passwordEntry);
      
      // Close the modal
      onClose();
      
      toast({
        title: "Success",
        description: password ? "Password updated successfully" : "Password added successfully"
      });
    } catch (error) {
      console.error('Error saving password:', error);
      toast({
        title: "Error",
        description: "Failed to save password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent 
        className="max-w-lg max-h-[85vh] overflow-y-auto" 
        aria-describedby="add-edit-dialog-description"
      >
        <DialogHeader>
          <DialogTitle>{password ? 'Edit Password' : 'Add New Password'}</DialogTitle>
          <DialogDescription id="add-edit-dialog-description">
            {password 
              ? 'Edit your existing password details. All fields marked with * are required.'
              : 'Add a new password to your vault. All fields marked with * are required.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Gmail, Twitter, Bank Account"
              value={formData.title}
              onChange={handleChange}
              required
              autoComplete="off"
              aria-required="true"
            />
          </div>
          
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="banking">Banking</SelectItem>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              placeholder="Your username"
              value={formData.username || ''}
              onChange={handleChange}
              autoComplete="username"
            />
          </div>
          
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your.email@example.com"
              value={formData.email || ''}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>
          
          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
              aria-required="true"
              className="font-lato"
            />
          </div>
          
          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              placeholder="example.com"
              value={formData.website || ''}
              onChange={handleChange}
              autoComplete="url"
            />
          </div>
          
          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              placeholder="+1 (123) 456-7890"
              value={formData.phoneNumber || ''}
              onChange={handleChange}
              autoComplete="tel"
              className="font-lato"
            />
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional notes or information"
              value={formData.notes || ''}
              onChange={handleChange}
              rows={3}
              autoComplete="off"
            />
          </div>
          
          {/* Custom Fields */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Custom Fields</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={addCustomField}
              >
                <Plus size={16} className="mr-1" />
                Add Field
              </Button>
            </div>
            
            {formData.customFields && formData.customFields.map((field, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  id={`custom-field-${index}-label`}
                  value={field.label}
                  onChange={(e) => handleCustomFieldChange(index, 'label', e.target.value)}
                  placeholder="Field name"
                  className="font-lato"
                />
                <Input
                  id={`custom-field-${index}-value`}
                  value={field.value}
                  onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                  placeholder="Field value"
                  className="font-lato"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCustomField(index)}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            ))}
          </div>
        </form>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : password ? 'Save Changes' : 'Add Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditModal;
