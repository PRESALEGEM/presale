-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS rewards;
DROP TABLE IF EXISTS feeders_balances;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS user_referrals;
DROP TABLE IF EXISTS referrals;

-- Table for tracking referrers and their statistics
CREATE TABLE referrals (
    referrer TEXT PRIMARY KEY,
    total_amount FLOAT DEFAULT 0,
    referral_count INTEGER DEFAULT 0,
    invalid_invites INTEGER DEFAULT 0,
    valid_invites INTEGER DEFAULT 0,
    eligible_invites INTEGER DEFAULT 0
);

-- Table for tracking which user used which referral code
CREATE TABLE user_referrals (
    id SERIAL PRIMARY KEY,
    user TEXT NOT NULL,
    referrer TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user)
);

-- Table for recording purchases
CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    user TEXT NOT NULL,
    amount FLOAT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Table for tracking feeders balances
CREATE TABLE feeders_balances (
    id SERIAL PRIMARY KEY,
    user TEXT UNIQUE NOT NULL,
    balance INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Table for recording rewards
CREATE TABLE rewards (
    id SERIAL PRIMARY KEY,
    user TEXT NOT NULL,
    amount FLOAT NOT NULL,
    type TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Set up Row Level Security (RLS) policies to secure the data
-- By default, make tables accessible for your application
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeders_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- Create policies that allow your service role to access all data
CREATE POLICY "Allow service role full access to referrals" ON referrals 
    USING (true) WITH CHECK (true);
    
CREATE POLICY "Allow service role full access to user_referrals" ON user_referrals 
    USING (true) WITH CHECK (true);
    
CREATE POLICY "Allow service role full access to purchases" ON purchases 
    USING (true) WITH CHECK (true);
    
CREATE POLICY "Allow service role full access to feeders_balances" ON feeders_balances 
    USING (true) WITH CHECK (true);
    
CREATE POLICY "Allow service role full access to rewards" ON rewards 
    USING (true) WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_user_referrals_user ON user_referrals(user);
CREATE INDEX idx_user_referrals_referrer ON user_referrals(referrer);
CREATE INDEX idx_purchases_user ON purchases(user);
CREATE INDEX idx_feeders_balances_user ON feeders_balances(user);
CREATE INDEX idx_rewards_user ON rewards(user);

-- First, check if the tables already exist
DO $$
BEGIN
    -- Create user_referrals table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_referrals') THEN
        CREATE TABLE public.user_referrals (
            id SERIAL PRIMARY KEY,
            user TEXT NOT NULL,
            referrer TEXT NOT NULL,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user)
        );

        -- Add comment to the table
        COMMENT ON TABLE public.user_referrals IS 'Stores referral relationships between users';
    END IF;

    -- Create referrals table if it doesn't exist (this may already exist in your system)
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referrals') THEN
        CREATE TABLE public.referrals (
            referrer TEXT PRIMARY KEY,
            totalAmount DECIMAL NOT NULL DEFAULT 0,
            referralCount INTEGER NOT NULL DEFAULT 0,
            referralUsers TEXT[] DEFAULT '{}'::TEXT[]
        );

        -- Add comment to the table
        COMMENT ON TABLE public.referrals IS 'Stores aggregated referral metrics for referrers';
    END IF;

    -- Create Row Level Security policies
    -- For user_referrals
    DROP POLICY IF EXISTS "Anyone can insert user_referrals" ON public.user_referrals;
    CREATE POLICY "Anyone can insert user_referrals" ON public.user_referrals
        FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Anyone can select user_referrals" ON public.user_referrals;
    CREATE POLICY "Anyone can select user_referrals" ON public.user_referrals
        FOR SELECT USING (true);

    -- For referrals
    DROP POLICY IF EXISTS "Anyone can insert/update referrals" ON public.referrals;
    CREATE POLICY "Anyone can insert/update referrals" ON public.referrals
        FOR ALL USING (true);

    -- Enable RLS
    ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

    -- Create a function to update referrals data
    CREATE OR REPLACE FUNCTION update_referral_stats()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Update the referrer's stats
        INSERT INTO public.referrals (referrer, totalAmount, referralCount, referralUsers)
        VALUES (NEW.referrer, 0, 1, ARRAY[NEW.user])
        ON CONFLICT (referrer) DO UPDATE
        SET referralCount = referrals.referralCount + 1,
            referralUsers = array_append(referrals.referralUsers, NEW.user);
        
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create a trigger for user_referrals
    DROP TRIGGER IF EXISTS on_user_referral_insert ON public.user_referrals;
    CREATE TRIGGER on_user_referral_insert
    AFTER INSERT ON public.user_referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_stats();

END$$; 