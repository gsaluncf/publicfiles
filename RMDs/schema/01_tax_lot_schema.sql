-- Tax Lot Simulation Schema for DuckDB
-- Designed for Monte Carlo wealth management simulations
-- Supports temporal queries, tax lot tracking, and simulation result aggregation

-- ============================================================================
-- REFERENCE / LOOKUP TABLES
-- ============================================================================

-- Account types with their tax treatment rules
CREATE TABLE account_types (
    account_type_id INTEGER PRIMARY KEY,
    account_type_name VARCHAR(50) NOT NULL,
    tax_treatment VARCHAR(20) NOT NULL,  -- 'tax_deferred', 'tax_free', 'taxable'
    rmd_required BOOLEAN NOT NULL,
    step_up_eligible BOOLEAN NOT NULL,
    description VARCHAR(255)
);

INSERT INTO account_types VALUES
(1, 'Traditional IRA', 'tax_deferred', TRUE, FALSE, 'Pre-tax contributions, taxable withdrawals'),
(2, 'Traditional 401(k)', 'tax_deferred', TRUE, FALSE, 'Employer-sponsored pre-tax retirement'),
(3, 'Roth IRA', 'tax_free', FALSE, FALSE, 'After-tax contributions, tax-free growth'),
(4, 'Roth 401(k)', 'tax_free', FALSE, FALSE, 'Employer-sponsored after-tax retirement'),
(5, 'Taxable Brokerage', 'taxable', FALSE, TRUE, 'No special tax treatment, step-up eligible');

-- Asset classes for simulation parameters
CREATE TABLE asset_classes (
    asset_class_id INTEGER PRIMARY KEY,
    asset_class_name VARCHAR(50) NOT NULL,
    expected_return DECIMAL(6,4),      -- Annual drift (mu) for GBM
    volatility DECIMAL(6,4),           -- Annual volatility (sigma) for GBM
    dividend_yield DECIMAL(6,4)
);

INSERT INTO asset_classes VALUES
(1, 'US Large Cap Equity', 0.07, 0.16, 0.018),
(2, 'US Small Cap Equity', 0.08, 0.22, 0.012),
(3, 'International Equity', 0.065, 0.18, 0.025),
(4, 'US Aggregate Bonds', 0.035, 0.05, 0.030),
(5, 'Cash Equivalents', 0.02, 0.005, 0.020);

-- IRS Uniform Lifetime Table for RMD calculations
-- Distribution period = divisor for RMD calculation
CREATE TABLE rmd_factors (
    age INTEGER PRIMARY KEY,
    distribution_period DECIMAL(4,1) NOT NULL
);

-- Partial table - ages 72-95 (full table would include 72-120+)
INSERT INTO rmd_factors VALUES
(72, 27.4), (73, 26.5), (74, 25.5), (75, 24.6), (76, 23.7),
(77, 22.9), (78, 22.0), (79, 21.1), (80, 20.2), (81, 19.4),
(82, 18.5), (83, 17.7), (84, 16.8), (85, 16.0), (86, 15.2),
(87, 14.4), (88, 13.7), (89, 12.9), (90, 12.2), (91, 11.5),
(92, 10.8), (93, 10.1), (94, 9.5), (95, 8.9);

-- ============================================================================
-- CORE ENTITY TABLES
-- ============================================================================

-- Clients (simplified for simulation)
CREATE TABLE clients (
    client_id INTEGER PRIMARY KEY,
    birth_date DATE NOT NULL,
    gender CHAR(1),                    -- For actuarial table lookup
    tax_bracket DECIMAL(4,2),          -- Marginal tax rate
    state_tax_rate DECIMAL(4,2)
);

-- Accounts belonging to clients
CREATE TABLE accounts (
    account_id INTEGER PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(client_id),
    account_type_id INTEGER NOT NULL REFERENCES account_types(account_type_id),
    account_name VARCHAR(100),
    opened_date DATE
);

-- Tax Lots - the core entity
-- Each row represents a specific purchase of a specific security
CREATE TABLE tax_lots (
    lot_id INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(account_id),
    asset_class_id INTEGER NOT NULL REFERENCES asset_classes(asset_class_id),
    security_symbol VARCHAR(10),
    purchase_date DATE NOT NULL,
    purchase_price DECIMAL(12,4) NOT NULL,   -- Price per share at purchase
    quantity DECIMAL(12,4) NOT NULL,         -- Number of shares
    cost_basis DECIMAL(14,2) GENERATED ALWAYS AS (purchase_price * quantity) STORED,
    is_sold BOOLEAN DEFAULT FALSE,
    sold_date DATE,
    sold_price DECIMAL(12,4)
);

-- ============================================================================
-- SIMULATION TABLES
-- ============================================================================

-- Simulation run metadata
CREATE TABLE simulation_runs (
    run_id INTEGER PRIMARY KEY,
    run_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    num_paths INTEGER NOT NULL,
    strategy_name VARCHAR(50) NOT NULL,
    volatility_override DECIMAL(6,4),   -- If testing different sigma values
    notes VARCHAR(255)
);

-- Individual simulation paths
CREATE TABLE simulation_paths (
    path_id INTEGER PRIMARY KEY,
    run_id INTEGER NOT NULL REFERENCES simulation_runs(run_id),
    random_seed INTEGER,
    simulated_lifespan INTEGER,         -- Age at death in this path
    years_simulated INTEGER
);

-- Annual snapshots for each path (denormalized for query performance)
CREATE TABLE path_annual_snapshots (
    snapshot_id INTEGER PRIMARY KEY,
    path_id INTEGER NOT NULL REFERENCES simulation_paths(path_id),
    simulation_year INTEGER NOT NULL,
    client_age INTEGER NOT NULL,
    portfolio_value DECIMAL(14,2),
    rmd_amount DECIMAL(14,2),
    taxes_paid DECIMAL(14,2),
    withdrawals DECIMAL(14,2),
    market_return DECIMAL(8,4)          -- That year's simulated return
);

-- Terminal results per path (for aggregation queries)
CREATE TABLE simulation_results (
    result_id INTEGER PRIMARY KEY,
    path_id INTEGER NOT NULL REFERENCES simulation_paths(path_id),
    run_id INTEGER NOT NULL REFERENCES simulation_runs(run_id),
    strategy VARCHAR(50) NOT NULL,
    terminal_wealth DECIMAL(14,2),
    total_taxes_paid DECIMAL(14,2),
    total_rmd_withdrawals DECIMAL(14,2),
    step_up_benefit DECIMAL(14,2),      -- Value of eliminated gains at death
    years_lived INTEGER,
    final_age INTEGER
);

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- Current unrealized gains by lot (requires current prices - would join to price table)
CREATE VIEW lot_unrealized_gains AS
SELECT 
    tl.lot_id,
    tl.account_id,
    tl.security_symbol,
    tl.cost_basis,
    -- In practice, would join to current_prices table
    -- For now, placeholder showing structure
    tl.cost_basis * 1.5 AS estimated_market_value,
    (tl.cost_basis * 1.5) - tl.cost_basis AS unrealized_gain
FROM tax_lots tl
WHERE tl.is_sold = FALSE;

-- Strategy comparison summary
CREATE VIEW strategy_comparison AS
SELECT 
    strategy,
    COUNT(*) AS num_paths,
    AVG(terminal_wealth) AS avg_terminal_wealth,
    STDDEV(terminal_wealth) AS std_terminal_wealth,
    PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY terminal_wealth) AS var_5pct,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY terminal_wealth) AS median_wealth,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY terminal_wealth) AS wealth_95pct,
    AVG(total_taxes_paid) AS avg_taxes_paid,
    AVG(step_up_benefit) AS avg_step_up_benefit
FROM simulation_results
GROUP BY strategy;

