import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CreditCard, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PaymentSettlementDialog } from './PaymentSettlementDialog';
import type { Profile, Currency } from '@/types/database';

interface BalanceItem {
  person: Profile;
  amount: number;
  direction: 'owe' | 'owed';
}

interface BalanceCardProps {
  balances: BalanceItem[];
  currency: Currency;
  groupId: string;
  currentUserId: string;
  currentUserProfile: Profile;
  onSettlementComplete?: () => void;
}

export function BalanceCard({
  balances,
  currency,
  groupId,
  currentUserId,
  currentUserProfile,
  onSettlementComplete,
}: BalanceCardProps) {
  const [settlementDialog, setSettlementDialog] = useState<{
    open: boolean;
    payerId: string;
    receiverId: string;
    payerProfile: Profile;
    receiverProfile: Profile;
    amount: number;
  } | null>(null);

  const handleSettleUp = (balance: BalanceItem) => {
    if (balance.direction === 'owe') {
      // Current user owes money to this person
      setSettlementDialog({
        open: true,
        payerId: currentUserId,
        receiverId: balance.person.id,
        payerProfile: currentUserProfile,
        receiverProfile: balance.person,
        amount: balance.amount,
      });
    } else {
      // This person owes money to current user
      setSettlementDialog({
        open: true,
        payerId: balance.person.id,
        receiverId: currentUserId,
        payerProfile: balance.person,
        receiverProfile: currentUserProfile,
        amount: balance.amount,
      });
    }
  };

  if (balances.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
            <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-medium mb-1">All settled up!</h3>
          <p className="text-sm text-muted-foreground text-center">
            No outstanding balances
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {balances.map((balance, index) => (
          <motion.div
            key={balance.person.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={balance.person.avatar_url || undefined} />
                      <AvatarFallback className={balance.direction === 'owe' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}>
                        {balance.person.full_name?.[0] || balance.person.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{balance.person.full_name || 'Unknown'}</p>
                      <div className="flex items-center gap-1 text-sm">
                        {balance.direction === 'owe' ? (
                          <>
                            <TrendingDown className="h-3 w-3 text-red-500" />
                            <span className="text-red-600 dark:text-red-400">You owe</span>
                          </>
                        ) : (
                          <>
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            <span className="text-green-600 dark:text-green-400">Owes you</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${
                      balance.direction === 'owe' 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {currency.symbol}{balance.amount.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      variant={balance.direction === 'owe' ? 'default' : 'outline'}
                      onClick={() => handleSettleUp(balance)}
                      className="gap-1"
                    >
                      <CreditCard className="h-3 w-3" />
                      Settle
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {settlementDialog && (
        <PaymentSettlementDialog
          open={settlementDialog.open}
          onOpenChange={(open) => !open && setSettlementDialog(null)}
          groupId={groupId}
          payerId={settlementDialog.payerId}
          receiverId={settlementDialog.receiverId}
          payerProfile={settlementDialog.payerProfile}
          receiverProfile={settlementDialog.receiverProfile}
          amount={settlementDialog.amount}
          currency={currency}
          onSettlementComplete={() => {
            setSettlementDialog(null);
            onSettlementComplete?.();
          }}
        />
      )}
    </>
  );
}
