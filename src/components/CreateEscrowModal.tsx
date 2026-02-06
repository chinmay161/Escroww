import React, { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface CreateEscrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEscrow: (freelancer: string, amount: number, deadline: Date) => Promise<void>;
}

const CreateEscrowModal: React.FC<CreateEscrowModalProps> = ({ isOpen, onClose, onCreateEscrow }) => {
  const [freelancerAddress, setFreelancerAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!freelancerAddress || !amount || !deadline) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount greater than 0.',
        variant: 'destructive',
      });
      return;
    }

    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      toast({
        title: 'Invalid Deadline',
        description: 'Deadline must be in the future.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await onCreateEscrow(freelancerAddress, amountNum, deadlineDate);
      toast({
        title: 'Escrow Created',
        description: 'Your escrow has been created successfully.',
      });
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create escrow. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFreelancerAddress('');
    setAmount('');
    setDeadline('');
    onClose();
  };

  // Get minimum date (now + 1 hour)
  const minDate = new Date(Date.now() + 3600000).toISOString().slice(0, 16);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-foreground">Create New Escrow</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Lock SOL in a trustless escrow contract
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Freelancer Address */}
          <div className="space-y-2">
            <Label htmlFor="freelancer" className="text-foreground">
              Freelancer Wallet Address
            </Label>
            <Input
              id="freelancer"
              placeholder="Enter Solana wallet address..."
              value={freelancerAddress}
              onChange={(e) => setFreelancerAddress(e.target.value)}
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              The wallet that will receive funds upon work completion
            </p>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-foreground">
              Amount (SOL)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              min="0.001"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Amount to lock in escrow (min 0.001 SOL)
            </p>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label htmlFor="deadline" className="text-foreground">
              Deadline
            </Label>
            <Input
              id="deadline"
              type="datetime-local"
              min={minDate}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-secondary border-border text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Auto-release triggers after this date if work is submitted
            </p>
          </div>

          {/* Info Box */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-foreground">
              <strong>How it works:</strong> Funds are locked in a program-controlled PDA. 
              After freelancer submits work, you can approve release or funds auto-release after deadline.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-border hover:bg-secondary"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-primary hover:opacity-90 text-white border-0"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Escrow'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEscrowModal;
