import React, { useState } from 'react';
import { 
  Shield, Clock, User, Wallet, FileText, CheckCircle, 
  AlertCircle, Loader2, ExternalLink, Copy, Check 
} from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Escrow, EscrowStatus } from '@/lib/types';
import { formatAddress, formatSol, getTimeRemaining } from '@/lib/utils';

interface EscrowDetailModalProps {
  escrow: Escrow | null;
  isOpen: boolean;
  onClose: () => void;
  currentWallet?: string;
  onSubmitWork: (escrowId: string, metadataRef: string) => Promise<void>;
  onApproveRelease: (escrowId: string) => Promise<void>;
  onTriggerAutoRelease: (escrowId: string) => Promise<void>;
}

const statusConfig: Record<EscrowStatus, { label: string; className: string; icon: React.ReactNode }> = {
  pending: { 
    label: 'Awaiting Submission', 
    className: 'status-pending',
    icon: <Clock className="h-4 w-4" />
  },
  submitted: { 
    label: 'Work Submitted', 
    className: 'status-submitted',
    icon: <FileText className="h-4 w-4" />
  },
  completed: { 
    label: 'Completed', 
    className: 'status-completed',
    icon: <CheckCircle className="h-4 w-4" />
  },
  expired: { 
    label: 'Deadline Passed', 
    className: 'status-expired',
    icon: <AlertCircle className="h-4 w-4" />
  },
};

const EscrowDetailModal: React.FC<EscrowDetailModalProps> = ({
  escrow,
  isOpen,
  onClose,
  currentWallet,
  onSubmitWork,
  onApproveRelease,
  onTriggerAutoRelease,
}) => {
  const [metadataRef, setMetadataRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  if (!escrow) return null;

  const status = statusConfig[escrow.status];
  const isClient = currentWallet === escrow.client;
  const isFreelancer = currentWallet === escrow.freelancer;
  const timeRemaining = getTimeRemaining(escrow.deadline);

  const canSubmitWork = isFreelancer && escrow.status === 'pending';
  const canApprove = isClient && escrow.status === 'submitted';
  const canAutoRelease = escrow.status === 'submitted' && timeRemaining.isExpired;

  const handleSubmitWork = async () => {
    if (!metadataRef.trim()) {
      toast({
        title: 'Missing Reference',
        description: 'Please enter a work reference (CID, URL, or hash).',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitWork(escrow.id, metadataRef);
      toast({
        title: 'Work Submitted',
        description: 'Your work has been submitted successfully.',
      });
      setMetadataRef('');
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit work.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApproveRelease(escrow.id);
      toast({
        title: 'Funds Released',
        description: 'Funds have been released to the freelancer.',
      });
    } catch (error: any) {
      toast({
        title: 'Approval Failed',
        description: error.message || 'Failed to approve release.',
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleAutoRelease = async () => {
    setIsReleasing(true);
    try {
      await onTriggerAutoRelease(escrow.id);
      toast({
        title: 'Auto-Release Triggered',
        description: 'Funds have been released to the freelancer.',
      });
    } catch (error: any) {
      toast({
        title: 'Release Failed',
        description: error.message || 'Failed to trigger auto-release.',
        variant: 'destructive',
      });
    } finally {
      setIsReleasing(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-foreground">Escrow Details</DialogTitle>
              <DialogDescription className="text-muted-foreground font-mono text-xs">
                #{escrow.id.slice(0, 16)}...
              </DialogDescription>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${status.className}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Amount Card */}
          <div className="p-4 rounded-lg bg-gradient-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Escrow Amount</p>
            <p className="text-3xl font-bold text-foreground">{formatSol(escrow.amount)} SOL</p>
          </div>

          {/* Parties */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Client</span>
                {isClient && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-primary/20 text-primary">You</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-foreground">{formatAddress(escrow.client)}</span>
                <button
                  onClick={() => copyToClipboard(escrow.client, 'client')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedField === 'client' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Freelancer</span>
                {isFreelancer && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-primary/20 text-primary">You</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-foreground">{formatAddress(escrow.freelancer)}</span>
                <button
                  onClick={() => copyToClipboard(escrow.freelancer, 'freelancer')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedField === 'freelancer' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Deadline */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Deadline</span>
            </div>
            <div className="text-right">
              <p className={`font-medium ${timeRemaining.isExpired ? 'text-destructive' : 'text-foreground'}`}>
                {timeRemaining.display}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(escrow.deadline).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Metadata Reference */}
          {escrow.metadataRef && (
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Work Reference
              </p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm text-foreground bg-background p-2 rounded flex-1 truncate">
                  {escrow.metadataRef}
                </p>
                <button
                  onClick={() => copyToClipboard(escrow.metadataRef!, 'metadata')}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2"
                >
                  {copiedField === 'metadata' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
                {(escrow.metadataRef.startsWith('http') || escrow.metadataRef.startsWith('ipfs')) && (
                  <a
                    href={escrow.metadataRef.startsWith('ipfs') 
                      ? `https://ipfs.io/ipfs/${escrow.metadataRef.replace('ipfs://', '')}`
                      : escrow.metadataRef
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors p-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          )}

          <Separator className="bg-border" />

          {/* Actions */}
          <div className="space-y-3">
            {/* Freelancer: Submit Work */}
            {canSubmitWork && (
              <div className="space-y-3">
                <Label className="text-foreground">Submit Work Reference</Label>
                <Input
                  placeholder="Enter CID, URL, or hash..."
                  value={metadataRef}
                  onChange={(e) => setMetadataRef(e.target.value)}
                  className="bg-secondary border-border text-foreground font-mono text-sm"
                />
                <Button
                  onClick={handleSubmitWork}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-primary hover:opacity-90 text-white border-0"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Submit Work
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Client: Approve Release */}
            {canApprove && (
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="w-full bg-gradient-primary hover:opacity-90 text-white border-0"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Release Funds
                  </>
                )}
              </Button>
            )}

            {/* Anyone: Auto-Release (if deadline passed and work submitted) */}
            {canAutoRelease && (
              <Button
                onClick={handleAutoRelease}
                disabled={isReleasing}
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary hover:text-white"
              >
                {isReleasing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Releasing...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Trigger Auto-Release
                  </>
                )}
              </Button>
            )}

            {/* Completed Status */}
            {escrow.status === 'completed' && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-foreground font-medium">Escrow Completed</p>
                <p className="text-xs text-muted-foreground">Funds have been released to the freelancer</p>
              </div>
            )}

            {/* Pending with instructions */}
            {escrow.status === 'pending' && !isFreelancer && (
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-foreground">Awaiting Work Submission</p>
                <p className="text-xs text-muted-foreground">The freelancer needs to submit their work</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EscrowDetailModal;
