import React from 'react';
import { Shield, Lock, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface HeroSectionProps {
  onCreateEscrow: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onCreateEscrow }) => {
  const { connected } = useWallet();

  const features = [
    {
      icon: <Lock className="h-5 w-5" />,
      title: 'Trustless Security',
      description: 'Funds locked in program-controlled PDAs',
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: 'Auto-Release',
      description: 'Automatic payment after deadline',
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: 'No Middleman',
      description: 'Fully on-chain, no custody risk',
    },
  ];

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm text-primary font-medium">Live on Solana Devnet</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Trustless Escrow for{' '}
            <span className="text-gradient">Remote Work</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Secure your payments with on-chain escrow. Lock SOL, submit proof of work, 
            and release funds — all without intermediaries.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {connected ? (
              <Button
                onClick={onCreateEscrow}
                size="lg"
                className="bg-gradient-primary hover:opacity-90 text-white border-0 px-8 py-6 text-lg animate-pulse-glow"
              >
                Create Escrow
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            ) : (
              <WalletMultiButton />
            )}
            <Button
              variant="outline"
              size="lg"
              className="border-border hover:bg-secondary px-8 py-6 text-lg"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-300 group"
              >
                <div className="h-10 w-10 rounded-lg bg-gradient-primary/20 flex items-center justify-center mx-auto mb-3 group-hover:bg-gradient-primary/30 transition-colors">
                  <span className="text-primary">{feature.icon}</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
