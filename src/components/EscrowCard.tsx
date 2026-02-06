import React from 'react';
import { Clock, User, Wallet, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Escrow, EscrowStatus } from '@/lib/types';
import { formatAddress, formatSol, getTimeRemaining } from '@/lib/utils';

interface EscrowCardProps {
  escrow: Escrow;
  currentWallet?: string;
  onViewDetails: (escrow: Escrow) => void;
}

const statusConfig: Record<EscrowStatus, { label: string; className: string }> = {
  pending: { label: 'Awaiting Submission', className: 'status-pending' },
  submitted: { label: 'Work Submitted', className: 'status-submitted' },
  completed: { label: 'Completed', className: 'status-completed' },
  expired: { label: 'Deadline Passed', className: 'status-expired' },
};

const EscrowCard: React.FC<EscrowCardProps> = ({ escrow, currentWallet, onViewDetails }) => {
  const status = statusConfig[escrow.status];
  const isClient = currentWallet === escrow.client;
  const isFreelancer = currentWallet === escrow.freelancer;
  const timeRemaining = getTimeRemaining(escrow.deadline);

  return (
    <Card className="group bg-card border-border hover:border-primary/50 transition-all duration-300 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {escrow.id.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Escrow #{escrow.id.slice(0, 8)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isClient ? 'You are the Client' : isFreelancer ? 'You are the Freelancer' : 'Observer'}
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Amount */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <span className="text-sm text-muted-foreground">Amount</span>
          <span className="text-lg font-bold text-foreground">{formatSol(escrow.amount)} SOL</span>
        </div>

        {/* Parties */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Client</span>
            </div>
            <span className="font-mono text-foreground">{formatAddress(escrow.client)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span>Freelancer</span>
            </div>
            <span className="font-mono text-foreground">{formatAddress(escrow.freelancer)}</span>
          </div>
        </div>

        {/* Deadline */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Deadline</span>
          </div>
          <span className={`font-medium ${timeRemaining.isExpired ? 'text-destructive' : 'text-foreground'}`}>
            {timeRemaining.display}
          </span>
        </div>

        {/* Metadata Reference */}
        {escrow.metadataRef && (
          <div className="p-2 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Work Reference</p>
            <p className="text-sm font-mono text-foreground truncate">{escrow.metadataRef}</p>
          </div>
        )}

        {/* View Details Button */}
        <Button 
          onClick={() => onViewDetails(escrow)}
          variant="outline" 
          className="w-full group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all"
        >
          View Details
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default EscrowCard;
