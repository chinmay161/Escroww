import React from 'react';
import { Shield, Github, Twitter, ExternalLink } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground">TrustEscrow</p>
              <p className="text-xs text-muted-foreground">Trustless Remote Work Payments</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="https://explorer.solana.com/?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Solana Explorer
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://devnet.solana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Devnet Faucet
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="h-10 w-10 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="h-10 w-10 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Twitter className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Built on Solana Devnet. All transactions are on testnet.
          </p>
          <p className="text-sm text-muted-foreground">
            No custody, no middleman, no trust required.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
