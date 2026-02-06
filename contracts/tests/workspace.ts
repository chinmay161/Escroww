import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Workspace } from "../target/types/workspace";
import { expect } from "chai";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

describe("workspace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Workspace as Program<Workspace>;

  let authority: Keypair;
  let client: Keypair;
  let freelancer: Keypair;
  let configPDA: PublicKey;
  let escrowPDA: PublicKey;
  const escrowId = "escrow-001";
  const escrowAmount = new BN(1 * LAMPORTS_PER_SOL);
  const futureDeadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  before(async () => {
    authority = Keypair.generate();
    client = Keypair.generate();
    freelancer = Keypair.generate();

    // Fund all accounts with 100 SOL
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        authority.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        client.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        freelancer.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );

    // Derive PDAs
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), authority.publicKey.toBuffer()],
      program.programId
    );

    [escrowPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.publicKey.toBuffer(),
        freelancer.publicKey.toBuffer(),
        Buffer.from(escrowId),
      ],
      program.programId
    );
  });

  // ============== INITIAL TEST CASES (MUST PASS) ==============

  it("Initialize Config", async () => {
    const feeBps = 250; // 2.5%
    const treasury = Keypair.generate().publicKey;

    await program.methods
      .initializeConfig(feeBps, treasury)
      .accounts({
        config: configPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const config = await program.account.config.fetch(configPDA);
    expect(config.isActive).to.be.true;
    expect(config.isPaused).to.be.false;
    expect(config.feeBps).to.equal(feeBps);
    expect(config.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(config.version).to.equal(1);
  });

  it("Create Escrow - Client locks SOL for freelancer", async () => {
    const clientBalanceBefore = await provider.connection.getBalance(
      client.publicKey
    );

    await program.methods
      .createEscrow(escrowId, escrowAmount, new BN(futureDeadline))
      .accounts({
        escrow: escrowPDA,
        client: client.publicKey,
        freelancer: freelancer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    const escrow = await program.account.escrowAccount.fetch(escrowPDA);
    expect(escrow.client.toBase58()).to.equal(client.publicKey.toBase58());
    expect(escrow.freelancer.toBase58()).to.equal(freelancer.publicKey.toBase58());
    expect(escrow.amount.toString()).to.equal(escrowAmount.toString());
    expect(escrow.isSubmitted).to.be.false;
    expect(escrow.isReleased).to.be.false;
    expect(escrow.escrowId).to.equal(escrowId);
    expect(escrow.metadataRef).to.equal("");

    // Verify SOL was transferred
    const clientBalanceAfter = await provider.connection.getBalance(
      client.publicKey
    );
    expect(clientBalanceBefore - clientBalanceAfter).to.be.greaterThan(
      Number(escrowAmount)
    );
  });

  it("Submit Work - Freelancer submits proof of work", async () => {
    const metadataRef = "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

    await program.methods
      .submitWork(metadataRef)
      .accounts({
        escrow: escrowPDA,
        freelancer: freelancer.publicKey,
      })
      .signers([freelancer])
      .rpc();

    const escrow = await program.account.escrowAccount.fetch(escrowPDA);
    expect(escrow.isSubmitted).to.be.true;
    expect(escrow.metadataRef).to.equal(metadataRef);
  });

  // ============== CORE FUNCTIONALITY TESTS ==============

  it("Approve Release - Client releases funds to freelancer", async () => {
    const freelancerBalanceBefore = await provider.connection.getBalance(
      freelancer.publicKey
    );

    await program.methods
      .approveRelease()
      .accounts({
        escrow: escrowPDA,
        client: client.publicKey,
        freelancer: freelancer.publicKey,
      })
      .signers([client])
      .rpc();

    const escrow = await program.account.escrowAccount.fetch(escrowPDA);
    expect(escrow.isReleased).to.be.true;
    expect(escrow.amount.toString()).to.equal("0");

    // Verify freelancer received funds
    const freelancerBalanceAfter = await provider.connection.getBalance(
      freelancer.publicKey
    );
    expect(freelancerBalanceAfter).to.be.greaterThan(freelancerBalanceBefore);
  });

  // ============== NEW ESCROW FOR AUTO-RELEASE TEST ==============

  it("Create second escrow for auto-release test", async () => {
    const escrowId2 = "escrow-002";
    // Use a deadline 2 seconds in the future - will pass by the time we trigger
    const shortDeadline = Math.floor(Date.now() / 1000) + 2;

    const [escrowPDA2] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.publicKey.toBuffer(),
        freelancer.publicKey.toBuffer(),
        Buffer.from(escrowId2),
      ],
      program.programId
    );

    await program.methods
      .createEscrow(escrowId2, escrowAmount, new BN(shortDeadline))
      .accounts({
        escrow: escrowPDA2,
        client: client.publicKey,
        freelancer: freelancer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    const escrow = await program.account.escrowAccount.fetch(escrowPDA2);
    expect(escrow.escrowId).to.equal(escrowId2);
  });

  it("Submit work for second escrow", async () => {
    const escrowId2 = "escrow-002";
    const [escrowPDA2] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.publicKey.toBuffer(),
        freelancer.publicKey.toBuffer(),
        Buffer.from(escrowId2),
      ],
      program.programId
    );

    await program.methods
      .submitWork("ipfs://QmSecondWorkProof")
      .accounts({
        escrow: escrowPDA2,
        freelancer: freelancer.publicKey,
      })
      .signers([freelancer])
      .rpc();

    const escrow = await program.account.escrowAccount.fetch(escrowPDA2);
    expect(escrow.isSubmitted).to.be.true;
  });

  it("Trigger Auto Release - Anyone can trigger after deadline", async () => {
    const escrowId2 = "escrow-002";
    const [escrowPDA2] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.publicKey.toBuffer(),
        freelancer.publicKey.toBuffer(),
        Buffer.from(escrowId2),
      ],
      program.programId
    );

    // Wait for deadline to pass (5 seconds to ensure blockchain time advances)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const freelancerBalanceBefore = await provider.connection.getBalance(
      freelancer.publicKey
    );

    // Anyone can trigger (no signer required)
    await program.methods
      .triggerAutoRelease()
      .accounts({
        escrow: escrowPDA2,
        freelancer: freelancer.publicKey,
      })
      .signers([])
      .rpc();

    const escrow = await program.account.escrowAccount.fetch(escrowPDA2);
    expect(escrow.isReleased).to.be.true;

    const freelancerBalanceAfter = await provider.connection.getBalance(
      freelancer.publicKey
    );
    expect(freelancerBalanceAfter).to.be.greaterThan(freelancerBalanceBefore);
  });

  // ============== ERROR CASE TESTS ==============

  it("Fail: Create escrow with invalid amount (0)", async () => {
    const escrowId3 = "escrow-003";
    const [escrowPDA3] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.publicKey.toBuffer(),
        freelancer.publicKey.toBuffer(),
        Buffer.from(escrowId3),
      ],
      program.programId
    );

    try {
      await program.methods
        .createEscrow(escrowId3, new BN(0), new BN(futureDeadline))
        .accounts({
          escrow: escrowPDA3,
          client: client.publicKey,
          freelancer: freelancer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();
      expect.fail("Should have thrown InvalidAmount error");
    } catch (error) {
      expect(error.message).to.include("InvalidAmount");
    }
  });

  it("Fail: Submit work by non-freelancer", async () => {
    const escrowId4 = "escrow-004";
    const [escrowPDA4] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.publicKey.toBuffer(),
        freelancer.publicKey.toBuffer(),
        Buffer.from(escrowId4),
      ],
      program.programId
    );

    // Create escrow first
    await program.methods
      .createEscrow(escrowId4, escrowAmount, new BN(futureDeadline))
      .accounts({
        escrow: escrowPDA4,
        client: client.publicKey,
        freelancer: freelancer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    // Try to submit work as client (not freelancer)
    try {
      await program.methods
        .submitWork("fake-work")
        .accounts({
          escrow: escrowPDA4,
          freelancer: client.publicKey, // Wrong signer
        })
        .signers([client])
        .rpc();
      expect.fail("Should have thrown UnauthorizedFreelancer error");
    } catch (error) {
      expect(error.message).to.include("Error");
    }
  });

  it("Fail: Approve release without work submitted", async () => {
    const escrowId5 = "escrow-005";
    const [escrowPDA5] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.publicKey.toBuffer(),
        freelancer.publicKey.toBuffer(),
        Buffer.from(escrowId5),
      ],
      program.programId
    );

    // Create escrow
    await program.methods
      .createEscrow(escrowId5, escrowAmount, new BN(futureDeadline))
      .accounts({
        escrow: escrowPDA5,
        client: client.publicKey,
        freelancer: freelancer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    // Try to approve without work submitted
    try {
      await program.methods
        .approveRelease()
        .accounts({
          escrow: escrowPDA5,
          client: client.publicKey,
          freelancer: freelancer.publicKey,
        })
        .signers([client])
        .rpc();
      expect.fail("Should have thrown WorkNotSubmitted error");
    } catch (error) {
      expect(error.message).to.include("WorkNotSubmitted");
    }
  });

  it("Fail: Double submit work", async () => {
    const escrowId6 = "escrow-006";
    const [escrowPDA6] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.publicKey.toBuffer(),
        freelancer.publicKey.toBuffer(),
        Buffer.from(escrowId6),
      ],
      program.programId
    );

    // Create escrow
    await program.methods
      .createEscrow(escrowId6, escrowAmount, new BN(futureDeadline))
      .accounts({
        escrow: escrowPDA6,
        client: client.publicKey,
        freelancer: freelancer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    // Submit work first time
    await program.methods
      .submitWork("first-submission")
      .accounts({
        escrow: escrowPDA6,
        freelancer: freelancer.publicKey,
      })
      .signers([freelancer])
      .rpc();

    // Try to submit again
    try {
      await program.methods
        .submitWork("second-submission")
        .accounts({
          escrow: escrowPDA6,
          freelancer: freelancer.publicKey,
        })
        .signers([freelancer])
        .rpc();
      expect.fail("Should have thrown AlreadySubmitted error");
    } catch (error) {
      expect(error.message).to.include("AlreadySubmitted");
    }
  });

  it("Fail: Auto release before deadline", async () => {
    const escrowId7 = "escrow-007";
    const farFutureDeadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

    const [escrowPDA7] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.publicKey.toBuffer(),
        freelancer.publicKey.toBuffer(),
        Buffer.from(escrowId7),
      ],
      program.programId
    );

    // Create escrow with future deadline
    await program.methods
      .createEscrow(escrowId7, escrowAmount, new BN(farFutureDeadline))
      .accounts({
        escrow: escrowPDA7,
        client: client.publicKey,
        freelancer: freelancer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    // Submit work
    await program.methods
      .submitWork("work-proof")
      .accounts({
        escrow: escrowPDA7,
        freelancer: freelancer.publicKey,
      })
      .signers([freelancer])
      .rpc();

    // Try to auto release before deadline
    try {
      await program.methods
        .triggerAutoRelease()
        .accounts({
          escrow: escrowPDA7,
          freelancer: freelancer.publicKey,
        })
        .signers([])
        .rpc();
      expect.fail("Should have thrown DeadlineNotPassed error");
    } catch (error) {
      expect(error.message).to.include("DeadlineNotPassed");
    }
  });

  it("Fail: Metadata too long", async () => {
    const escrowId8 = "escrow-008";
    const [escrowPDA8] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.publicKey.toBuffer(),
        freelancer.publicKey.toBuffer(),
        Buffer.from(escrowId8),
      ],
      program.programId
    );

    // Create escrow
    await program.methods
      .createEscrow(escrowId8, escrowAmount, new BN(futureDeadline))
      .accounts({
        escrow: escrowPDA8,
        client: client.publicKey,
        freelancer: freelancer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    // Try to submit with metadata > 256 chars
    const longMetadata = "x".repeat(300);
    try {
      await program.methods
        .submitWork(longMetadata)
        .accounts({
          escrow: escrowPDA8,
          freelancer: freelancer.publicKey,
        })
        .signers([freelancer])
        .rpc();
      expect.fail("Should have thrown MetadataTooLong error");
    } catch (error) {
      expect(error.message).to.include("MetadataTooLong");
    }
  });

  it("Fail: Approve release by non-client", async () => {
    const escrowId9 = "escrow-009";
    const [escrowPDA9] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.publicKey.toBuffer(),
        freelancer.publicKey.toBuffer(),
        Buffer.from(escrowId9),
      ],
      program.programId
    );

    // Create escrow
    await program.methods
      .createEscrow(escrowId9, escrowAmount, new BN(futureDeadline))
      .accounts({
        escrow: escrowPDA9,
        client: client.publicKey,
        freelancer: freelancer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    // Submit work
    await program.methods
      .submitWork("work-proof")
      .accounts({
        escrow: escrowPDA9,
        freelancer: freelancer.publicKey,
      })
      .signers([freelancer])
      .rpc();

    // Try to approve as freelancer (not client)
    try {
      await program.methods
        .approveRelease()
        .accounts({
          escrow: escrowPDA9,
          client: freelancer.publicKey, // Wrong signer
          freelancer: freelancer.publicKey,
        })
        .signers([freelancer])
        .rpc();
      expect.fail("Should have thrown error");
    } catch (error) {
      expect(error.message).to.include("Error");
    }
  });
});