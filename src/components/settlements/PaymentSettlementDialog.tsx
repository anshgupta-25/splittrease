import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  ArrowRight, 
  Loader2, 
  CheckCircle2,
  Wallet,
  Banknote,
  QrCode,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Currency } from '@/types/database';

interface PaymentSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  payerId: string;
  receiverId: string;
  payerProfile: Profile;
  receiverProfile: Profile;
  amount: number;
  currency: Currency;
  onSettlementComplete?: () => void;
}

const paymentMethods = [
  { id: 'cash', label: 'Cash', icon: Banknote, description: 'Paid in cash' },
  { id: 'bank', label: 'Bank Transfer', icon: CreditCard, description: 'Direct bank transfer' },
  { id: 'upi', label: 'UPI', icon: Smartphone, description: 'UPI/Mobile payment' },
  { id: 'other', label: 'Other', icon: Wallet, description: 'Other payment method' },
];

export function PaymentSettlementDialog({
  open,
  onOpenChange,
  groupId,
  payerId,
  receiverId,
  payerProfile,
  receiverProfile,
  amount,
  currency,
  onSettlementComplete,
}: PaymentSettlementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [customAmount, setCustomAmount] = useState(amount.toString());
  const { toast } = useToast();

  const handleSettlement = async () => {
    const settlementAmount = parseFloat(customAmount);
    if (isNaN(settlementAmount) || settlementAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('settlements')
        .insert({
          group_id: groupId,
          payer_id: payerId,
          receiver_id: receiverId,
          amount: settlementAmount,
          currency_id: currency.id,
          status: 'completed',
          notes: notes.trim() || `Payment via ${paymentMethods.find(m => m.id === paymentMethod)?.label || paymentMethod}`,
          settled_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSuccess(true);
      
      setTimeout(() => {
        toast({
          title: 'Payment recorded!',
          description: `${currency.symbol}${settlementAmount.toFixed(2)} has been marked as paid.`,
        });
        onSettlementComplete?.();
        onOpenChange(false);
        // Reset state
        setSuccess(false);
        setNotes('');
        setPaymentMethod('cash');
      }, 1500);
    } catch (error: any) {
      console.error('Error recording settlement:', error);
      toast({
        title: 'Failed to record payment',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center py-8"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Payment Recorded!</h3>
            <p className="text-muted-foreground text-center">
              {currency.symbol}{parseFloat(customAmount).toFixed(2)} has been settled.
            </p>
          </motion.div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Record Payment
              </DialogTitle>
              <DialogDescription>
                Record a payment between group members
              </DialogDescription>
            </DialogHeader>

            {/* Payment Flow Visualization */}
            <div className="flex items-center justify-center gap-4 py-6 bg-muted/30 rounded-xl">
              <div className="flex flex-col items-center">
                <Avatar className="h-12 w-12 border-2 border-background shadow-lg">
                  <AvatarImage src={payerProfile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {payerProfile.full_name?.[0] || payerProfile.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium mt-2">
                  {payerProfile.full_name || 'Payer'}
                </span>
                <span className="text-xs text-muted-foreground">Pays</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                  <span className="text-lg font-bold text-primary">
                    {currency.symbol}{parseFloat(customAmount || '0').toFixed(2)}
                  </span>
                  <ArrowRight className="h-4 w-4 text-primary" />
                </div>
              </div>

              <div className="flex flex-col items-center">
                <Avatar className="h-12 w-12 border-2 border-background shadow-lg">
                  <AvatarImage src={receiverProfile.avatar_url || undefined} />
                  <AvatarFallback className="bg-green-500 text-white">
                    {receiverProfile.full_name?.[0] || receiverProfile.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium mt-2">
                  {receiverProfile.full_name || 'Receiver'}
                </span>
                <span className="text-xs text-muted-foreground">Receives</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="settlement-amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {currency.symbol}
                  </span>
                  <Input
                    id="settlement-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-medium">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="settlement-notes">Notes (optional)</Label>
                <Textarea
                  id="settlement-notes"
                  placeholder="Add any notes about this payment..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSettlement} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Record Payment
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
