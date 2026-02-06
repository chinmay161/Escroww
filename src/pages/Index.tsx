import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import HowItWorks from '@/components/HowItWorks';
import Dashboard from '@/components/Dashboard';
import Footer from '@/components/Footer';
import CreateEscrowModal from '@/components/CreateEscrowModal';
import EscrowDetailModal from '@/components/EscrowDetailModal';
import { useEscrow } from '@/hooks/useEscrow';
import { Escrow } from '@/lib/types';

const Index: React.FC = () => {
  const { connected, publicKey } = useWallet();
  const { 
    escrows, 
    isLoading, 
    createEscrow, 
    submitWork, 
    approveRelease, 
    triggerAutoRelease 
  } = useEscrow();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleCreateEscrow = async (freelancer: string, amount: number, deadline: Date) => {
    const result = await createEscrow({ freelancer, amount, deadline });
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const handleViewDetails = (escrow: Escrow) => {
    setSelectedEscrow(escrow);
    setIsDetailModalOpen(true);
  };

  const handleSubmitWork = async (escrowId: string, metadataRef: string) => {
    const result = await submitWork(escrowId, metadataRef);
    if (!result.success) {
      throw new Error(result.error);
    }
    // Refresh the selected escrow
    const updated = escrows.find(e => e.id === escrowId);
    if (updated) setSelectedEscrow(updated);
  };

  const handleApproveRelease = async (escrowId: string) => {
    const result = await approveRelease(escrowId);
    if (!result.success) {
      throw new Error(result.error);
    }
    // Refresh the selected escrow
    const updated = escrows.find(e => e.id === escrowId);
    if (updated) setSelectedEscrow(updated);
  };

  const handleTriggerAutoRelease = async (escrowId: string) => {
    const result = await triggerAutoRelease(escrowId);
    if (!result.success) {
      throw new Error(result.error);
    }
    // Refresh the selected escrow
    const updated = escrows.find(e => e.id === escrowId);
    if (updated) setSelectedEscrow(updated);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onCreateEscrow={() => setIsCreateModalOpen(true)} />
      
      <main>
        <HeroSection onCreateEscrow={() => setIsCreateModalOpen(true)} />
        
        {connected && (
          <Dashboard 
            escrows={escrows}
            onViewDetails={handleViewDetails}
            onCreateEscrow={() => setIsCreateModalOpen(true)}
            isLoading={isLoading}
          />
        )}
        
        <HowItWorks />
      </main>

      <Footer />

      {/* Modals */}
      <CreateEscrowModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateEscrow={handleCreateEscrow}
      />

      <EscrowDetailModal
        escrow={selectedEscrow}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEscrow(null);
        }}
        currentWallet={publicKey?.toBase58()}
        onSubmitWork={handleSubmitWork}
        onApproveRelease={handleApproveRelease}
        onTriggerAutoRelease={handleTriggerAutoRelease}
      />
    </div>
  );
};

export default Index;
