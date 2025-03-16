# Gem Spider Token Pre-Sale

A Next.js application for $SPIDER token pre-sale with an enhanced referral system on the TON blockchain.

## Features

- Connect TON wallet via TonConnect
- View real-time TON and $SPIDER token balances
- Purchase $SPIDER tokens
- Complete referral system with tracking and rewards
- Leaderboard to track top referrers

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- Supabase account for the database

### Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Set up Supabase tables:
   - Go to your Supabase dashboard
   - Navigate to the SQL Editor
   - Copy and paste the contents of `create_tables.sql` from this project
   - Run the script to create necessary tables

5. Start the development server:
   ```
   npm run dev
   ```

6. Build for production:
   ```
   npm run build
   ```

7. Start the production server:
   ```
   npm start
   ```

## Referral System

The referral system allows users to:

1. Generate a unique referral code based on their wallet address
2. Share the referral code with others
3. Earn rewards when new users use their referral code
4. Track performance on the leaderboard

### How It Works

1. When a user connects their wallet, they receive a unique referral code
2. They can share this code with friends
3. When a new user makes a purchase using the referral code:
   - The purchase is recorded
   - The referrer gets credit for the referral
   - The relationship between user and referrer is stored
4. Referrers can track their performance on the leaderboard

## Troubleshooting

If you encounter loading issues:

1. Make sure your Supabase URL and API key are correctly set up in the `.env` file
2. Ensure your Supabase tables are created correctly using the `create_tables.sql` script
3. Check your browser console for errors related to API calls
4. Verify your internet connection to ensure API calls can reach the TON API and Supabase 