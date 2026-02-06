import React from 'react';
import { Inbox, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EscrowCard from './EscrowCard';
import { Escrow } from '@/lib/types';
import { useWallet } from '@solana/wallet-adapter-react';

interface DashboardProps {
  escrows: Escrow[];
  onViewDetails: (escrow: Escrow) => void;
  onCreateEscrow: () => void;
  isLoading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ escrows, onViewDetails, onCreateEscrow, isLoading }) => {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58();

  // Filter escrows by role
  const clientEscrows = escrows.filter(e => e.client === walletAddress);
  const freelancerEscrows = escrows.filter(e => e.freelancer === walletAddress);
  const allEscrows = escrows;

  const renderEscrowGrid = (escrowList: Escrow[], emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      );
    }

    if (escrowList.length === 0) {
      return (
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Inbox className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Escrows Found</h3>
          <p className="text-muted-foreground mb-6">{emptyMessage}</p>
          <Button
            onClick={onCreateEscrow}
            className="bg-gradient-primary hover:opacity-90 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Escrow
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {escrowList.map((escrow) => (
          <EscrowCard
            key={escrow.id}
            escrow={escrow}
            currentWallet={walletAddress}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    );
  };

  return (
    <section id="dashboard" className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Escrow Dashboard
            </h2>
            <p className="text-muted-foreground">
              Manage your escrows and track payment status
            </p>
          </div>
          <Button
            onClick={onCreateEscrow}
            className="bg-gradient-primary hover:opacity-90 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Escrow
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-secondary border border-border">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                All ({allEscrows.length})
              </TabsTrigger>
              <TabsTrigger 
                value="client" 
                className="data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                As Client ({clientEscrows.length})
              </TabsTrigger>
              <TabsTrigger 
                value="freelancer" 
                className="data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                As Freelancer ({freelancerEscrows.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-0">
            {renderEscrowGrid(allEscrows, "You don't have any escrows yet. Create one to get started.")}
          </TabsContent>

          <TabsContent value="client" className="mt-0">
            {renderEscrowGrid(clientEscrows, "You haven't created any escrows as a client yet.")}
          </TabsContent>

          <TabsContent value="freelancer" className="mt-0">
            {renderEscrowGrid(freelancerEscrows, "You don't have any escrows as a freelancer.")}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default Dashboard;
