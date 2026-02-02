import { useState, useEffect } from 'react';
import { Check, User } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Profile } from '@/types/database';

interface MemberSelectorProps {
  members: Profile[];
  selectedMembers: string[];
  onSelectionChange: (selected: string[]) => void;
  splitType: 'equal' | 'custom' | 'percentage';
  customAmounts: Record<string, string>;
  onCustomAmountChange: (userId: string, amount: string) => void;
  totalAmount: number;
}

export function MemberSelector({
  members,
  selectedMembers,
  onSelectionChange,
  splitType,
  customAmounts,
  onCustomAmountChange,
  totalAmount,
}: MemberSelectorProps) {
  const toggleMember = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      onSelectionChange(selectedMembers.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedMembers, userId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(members.map(m => m.id));
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  const getEqualShare = () => {
    if (selectedMembers.length === 0) return 0;
    return totalAmount / selectedMembers.length;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Split with ({selectedMembers.length} selected)</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-primary hover:underline"
          >
            Select all
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            type="button"
            onClick={deselectAll}
            className="text-xs text-muted-foreground hover:underline"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto rounded-lg border bg-muted/30 p-2">
        {members.map((member) => {
          const isSelected = selectedMembers.includes(member.id);
          const share = splitType === 'equal' && isSelected ? getEqualShare() : 0;

          return (
            <div
              key={member.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                isSelected 
                  ? 'bg-primary/10 border border-primary/20' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => toggleMember(member.id)}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleMember(member.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {member.full_name?.[0] || member.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{member.full_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>

              {isSelected && (
                <div className="flex items-center gap-2">
                  {splitType === 'equal' ? (
                    <span className="text-sm font-medium text-primary">
                      ${share.toFixed(2)}
                    </span>
                  ) : splitType === 'custom' || splitType === 'percentage' ? (
                    <div className="flex items-center gap-1">
                      {splitType === 'percentage' && <span className="text-muted-foreground text-sm">%</span>}
                      {splitType === 'custom' && <span className="text-muted-foreground text-sm">$</span>}
                      <Input
                        type="number"
                        step={splitType === 'percentage' ? '1' : '0.01'}
                        min="0"
                        max={splitType === 'percentage' ? '100' : undefined}
                        value={customAmounts[member.id] || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          onCustomAmountChange(member.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 h-8 text-right text-sm"
                        placeholder="0"
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <User className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No members in this group</p>
          </div>
        )}
      </div>

      {splitType === 'custom' && selectedMembers.length > 0 && (
        <CustomSplitSummary
          totalAmount={totalAmount}
          customAmounts={customAmounts}
          selectedMembers={selectedMembers}
        />
      )}

      {splitType === 'percentage' && selectedMembers.length > 0 && (
        <PercentageSplitSummary
          customAmounts={customAmounts}
          selectedMembers={selectedMembers}
        />
      )}
    </div>
  );
}

function CustomSplitSummary({ 
  totalAmount, 
  customAmounts, 
  selectedMembers 
}: { 
  totalAmount: number; 
  customAmounts: Record<string, string>; 
  selectedMembers: string[];
}) {
  const totalAssigned = selectedMembers.reduce((sum, id) => {
    return sum + (parseFloat(customAmounts[id]) || 0);
  }, 0);
  const remaining = totalAmount - totalAssigned;

  return (
    <div className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm ${
      Math.abs(remaining) < 0.01 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    }`}>
      <span>Total assigned: ${totalAssigned.toFixed(2)}</span>
      <span>{remaining > 0 ? `$${remaining.toFixed(2)} remaining` : remaining < 0 ? `$${Math.abs(remaining).toFixed(2)} over` : '✓ Balanced'}</span>
    </div>
  );
}

function PercentageSplitSummary({ 
  customAmounts, 
  selectedMembers 
}: { 
  customAmounts: Record<string, string>; 
  selectedMembers: string[];
}) {
  const totalPercent = selectedMembers.reduce((sum, id) => {
    return sum + (parseFloat(customAmounts[id]) || 0);
  }, 0);

  return (
    <div className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm ${
      Math.abs(totalPercent - 100) < 0.01 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    }`}>
      <span>Total percentage: {totalPercent.toFixed(0)}%</span>
      <span>{totalPercent === 100 ? '✓ Balanced' : totalPercent < 100 ? `${(100 - totalPercent).toFixed(0)}% remaining` : `${(totalPercent - 100).toFixed(0)}% over`}</span>
    </div>
  );
}
