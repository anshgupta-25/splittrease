import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Wallet } from 'lucide-react';
import type { Profile } from '@/types/database';

interface PaidBySelectorProps {
  members: Profile[];
  selectedPayer: string;
  onPayerChange: (payerId: string) => void;
  currentUserId: string;
}

export function PaidBySelector({
  members,
  selectedPayer,
  onPayerChange,
  currentUserId,
}: PaidBySelectorProps) {
  const currentUser = members.find(m => m.id === currentUserId);
  const otherMembers = members.filter(m => m.id !== currentUserId);

  return (
    <div className="space-y-2">
      <Label>Paid by</Label>
      <Select value={selectedPayer} onValueChange={onPayerChange}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Who paid?" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {/* Current user first with "You" label */}
          {currentUser && (
            <SelectItem value={currentUser.id}>
              <div className="flex items-center gap-3">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={currentUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {currentUser.full_name?.[0] || currentUser.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">You</span>
                <span className="text-muted-foreground text-sm">({currentUser.full_name || currentUser.email})</span>
              </div>
            </SelectItem>
          )}
          
          {/* Other members */}
          {otherMembers.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              <div className="flex items-center gap-3">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {member.full_name?.[0] || member.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{member.full_name || member.email}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
