import React from 'react';
import { Shield, Menu } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

interface HeaderProps {
  onCreateEscrow: () => void;
}

const Header: React.FC<HeaderProps> = ({ onCreateEscrow }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground">TrustEscrow</h1>
              <p className="text-xs text-muted-foreground">Trustless Payments</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button 
              onClick={onCreateEscrow}
              className="hidden sm:flex bg-gradient-primary hover:opacity-90 text-white border-0"
            >
              Create Escrow
            </Button>
            <WalletMultiButton />
            
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-card border-border">
                <nav className="flex flex-col gap-4 mt-8">
                  <a href="#dashboard" className="text-foreground hover:text-primary transition-colors py-2">
                    Dashboard
                  </a>
                  <a href="#how-it-works" className="text-foreground hover:text-primary transition-colors py-2">
                    How It Works
                  </a>
                  <Button 
                    onClick={onCreateEscrow}
                    className="bg-gradient-primary hover:opacity-90 text-white border-0 mt-4"
                  >
                    Create Escrow
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
