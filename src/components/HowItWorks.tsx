import React from 'react';
import { Wallet, FileText, CheckCircle, Coins } from 'lucide-react';

const steps = [
  {
    icon: <Wallet className="h-6 w-6" />,
    title: 'Client Creates Escrow',
    description: 'Client specifies freelancer address, amount, and deadline. SOL is transferred to a program-controlled PDA.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: 'Freelancer Submits Work',
    description: 'Freelancer completes the work and submits a reference (IPFS CID, URL, or hash) as proof of delivery.',
    color: 'from-purple-500 to-violet-500',
  },
  {
    icon: <CheckCircle className="h-6 w-6" />,
    title: 'Client Approves',
    description: 'Client reviews the work and approves the release. Funds are immediately transferred to the freelancer.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: <Coins className="h-6 w-6" />,
    title: 'Auto-Release',
    description: 'If client doesn\'t respond after deadline and work is submitted, anyone can trigger the automatic release.',
    color: 'from-emerald-500 to-green-500',
  },
];

const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A simple four-step process that ensures trustless, secure payments between clients and freelancers.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary via-accent to-primary/30 hidden md:block" />

            {/* Steps */}
            <div className="space-y-8">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="relative flex gap-6 items-start group"
                >
                  {/* Step Number */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <span className="text-white">{step.icon}</span>
                    </div>
                    <span className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-card border-2 border-border flex items-center justify-center text-xs font-bold text-foreground">
                      {index + 1}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-2 pb-8">
                    <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="p-6 rounded-xl bg-card border border-border text-center">
            <p className="text-3xl font-bold text-gradient mb-2">0%</p>
            <p className="text-sm text-muted-foreground">Platform Fees</p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border text-center">
            <p className="text-3xl font-bold text-gradient mb-2">100%</p>
            <p className="text-sm text-muted-foreground">On-Chain Security</p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border text-center">
            <p className="text-3xl font-bold text-gradient mb-2">24/7</p>
            <p className="text-sm text-muted-foreground">Automated Release</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
