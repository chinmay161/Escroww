use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("8EqACgr8ft77u2zCVK8euLWmHBqxDJ1EW6Hb54GmCzw9");

#[program]
pub mod workspace {
    use super::*;

    // fee_bps: u16, Platform fee in basis points, 0 = no fee
    // treasury: Pubkey, Fee collection address, 9PJ8I...3555
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        fee_bps: u16,
        treasury: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.bump = ctx.bumps.config;
        config.authority = ctx.accounts.authority.key();
        config.is_active = true;
        config.is_paused = false;
        config.fee_bps = fee_bps;
        config.treasury = treasury;
        config.version = 1;
        Ok(())
    }

    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        escrow_id: String,
        amount: u64,
        deadline: i64,
    ) -> Result<()> {
        require!(escrow_id.len() <= 32, ErrorCode::EscrowIdTooLong);
        require!(amount > 0, ErrorCode::InvalidAmount);
        
        let clock = Clock::get()?;
        require!(deadline > clock.unix_timestamp, ErrorCode::InvalidDeadline);

        // Transfer SOL from client to escrow PDA
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.client.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            amount,
        )?;

        let escrow = &mut ctx.accounts.escrow;
        escrow.client = ctx.accounts.client.key();
        escrow.freelancer = ctx.accounts.freelancer.key();
        escrow.amount = amount;
        escrow.deadline = deadline;
        escrow.is_submitted = false;
        escrow.is_released = false;
        escrow.metadata_ref = String::new();
        escrow.escrow_id = escrow_id;
        escrow.bump = ctx.bumps.escrow;

        Ok(())
    }

    pub fn submit_work(
        ctx: Context<SubmitWork>,
        metadata_ref: String,
    ) -> Result<()> {
        require!(metadata_ref.len() <= 256, ErrorCode::MetadataTooLong);

        let escrow = &mut ctx.accounts.escrow;
        require!(!escrow.is_released, ErrorCode::AlreadyReleased);
        require!(!escrow.is_submitted, ErrorCode::AlreadySubmitted);

        escrow.metadata_ref = metadata_ref;
        escrow.is_submitted = true;

        Ok(())
    }

    pub fn approve_release(ctx: Context<ApproveRelease>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(escrow.is_submitted, ErrorCode::WorkNotSubmitted);
        require!(!escrow.is_released, ErrorCode::AlreadyReleased);

        // Calculate transfer amount (escrow balance minus rent)
        let escrow_lamports = ctx.accounts.escrow.to_account_info().lamports();
        let rent_exempt = Rent::get()?.minimum_balance(8 + EscrowAccount::LEN);
        let transfer_amount = escrow_lamports.saturating_sub(rent_exempt);

        // Transfer SOL from escrow PDA to freelancer using lamport manipulation
        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= transfer_amount;
        **ctx.accounts.freelancer.to_account_info().try_borrow_mut_lamports()? += transfer_amount;

        let escrow = &mut ctx.accounts.escrow;
        escrow.is_released = true;
        escrow.amount = 0;

        Ok(())
    }

    pub fn trigger_auto_release(ctx: Context<TriggerAutoRelease>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(escrow.is_submitted, ErrorCode::WorkNotSubmitted);
        require!(!escrow.is_released, ErrorCode::AlreadyReleased);

        let clock = Clock::get()?;
        require!(clock.unix_timestamp > escrow.deadline, ErrorCode::DeadlineNotPassed);

        // Calculate transfer amount (escrow balance minus rent)
        let escrow_lamports = ctx.accounts.escrow.to_account_info().lamports();
        let rent_exempt = Rent::get()?.minimum_balance(8 + EscrowAccount::LEN);
        let transfer_amount = escrow_lamports.saturating_sub(rent_exempt);

        // Transfer SOL from escrow PDA to freelancer using lamport manipulation
        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= transfer_amount;
        **ctx.accounts.freelancer.to_account_info().try_borrow_mut_lamports()? += transfer_amount;

        let escrow = &mut ctx.accounts.escrow;
        escrow.is_released = true;
        escrow.amount = 0;

        Ok(())
    }
}

// ============== ACCOUNT STRUCTURES ==============

#[account]
pub struct Config {
    pub bump: u8,
    pub authority: Pubkey,
    pub is_active: bool,
    pub is_paused: bool,
    pub fee_bps: u16,
    pub treasury: Pubkey,
    pub version: u8,
}

impl Config {
    pub const LEN: usize = 1 + 32 + 1 + 1 + 2 + 32 + 1;
}

#[account]
pub struct EscrowAccount {
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub amount: u64,
    pub deadline: i64,
    pub is_submitted: bool,
    pub is_released: bool,
    pub metadata_ref: String,
    pub escrow_id: String,
    pub bump: u8,
}

impl EscrowAccount {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 1 + 1 + (4 + 256) + (4 + 32) + 1;
}

// ============== CONTEXT STRUCTS ==============

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        seeds = [b"config", authority.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + Config::LEN
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(escrow_id: String)]
pub struct CreateEscrow<'info> {
    #[account(
        init,
        seeds = [
            b"escrow",
            client.key().as_ref(),
            freelancer.key().as_ref(),
            escrow_id.as_bytes()
        ],
        bump,
        payer = client,
        space = 8 + EscrowAccount::LEN
    )]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub client: Signer<'info>,
    /// CHECK: Freelancer account, validated by being stored in escrow
    pub freelancer: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitWork<'info> {
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow.client.as_ref(),
            freelancer.key().as_ref(),
            escrow.escrow_id.as_bytes()
        ],
        bump = escrow.bump,
        constraint = escrow.freelancer == freelancer.key() @ ErrorCode::UnauthorizedFreelancer
    )]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub freelancer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ApproveRelease<'info> {
    #[account(
        mut,
        seeds = [
            b"escrow",
            client.key().as_ref(),
            escrow.freelancer.as_ref(),
            escrow.escrow_id.as_bytes()
        ],
        bump = escrow.bump,
        constraint = escrow.client == client.key() @ ErrorCode::UnauthorizedClient
    )]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub client: Signer<'info>,
    /// CHECK: Freelancer account to receive funds, validated by escrow.freelancer
    #[account(
        mut,
        constraint = freelancer.key() == escrow.freelancer @ ErrorCode::UnauthorizedFreelancer
    )]
    pub freelancer: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct TriggerAutoRelease<'info> {
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow.client.as_ref(),
            escrow.freelancer.as_ref(),
            escrow.escrow_id.as_bytes()
        ],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    /// CHECK: Freelancer account to receive funds, validated by escrow.freelancer
    #[account(
        mut,
        constraint = freelancer.key() == escrow.freelancer @ ErrorCode::UnauthorizedFreelancer
    )]
    pub freelancer: UncheckedAccount<'info>,
}

// ============== ERROR CODES ==============

#[error_code]
pub enum ErrorCode {
    #[msg("Deadline must be in the future")]
    InvalidDeadline,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Only freelancer can submit work")]
    UnauthorizedFreelancer,
    #[msg("Only client can approve release")]
    UnauthorizedClient,
    #[msg("Freelancer must submit work first")]
    WorkNotSubmitted,
    #[msg("Work already submitted")]
    AlreadySubmitted,
    #[msg("Funds already released")]
    AlreadyReleased,
    #[msg("Cannot auto-release before deadline")]
    DeadlineNotPassed,
    #[msg("Metadata reference exceeds max length")]
    MetadataTooLong,
    #[msg("Escrow ID exceeds max length")]
    EscrowIdTooLong,
}