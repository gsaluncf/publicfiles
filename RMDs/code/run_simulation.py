"""
Main Simulation Runner

This script orchestrates the full Monte Carlo simulation:
1. Generate market paths using GBM
2. Sample death ages from actuarial tables
3. Apply tax strategies to each (market, lifespan) pair
4. Store results in DuckDB
5. Run aggregation queries

Usage:
    python run_simulation.py --n_paths 10000 --seed 42
"""

import argparse
import time
from typing import List, Dict
import numpy as np

try:
    import duckdb
    HAS_DUCKDB = True
except ImportError:
    HAS_DUCKDB = False
    print("Warning: DuckDB not installed. Results will not be persisted.")

from simulation_engine import (
    simulate_gbm_paths,
    sample_death_ages_vectorized,
    SimulationConfig,
)
from tax_strategies import (
    simulate_hold_to_death,
    simulate_aggressive_conversion,
)


def run_monte_carlo(
    config: SimulationConfig,
    n_paths: int = 1000,
    seed: int = 42,
    verbose: bool = True,
) -> List[Dict]:
    """
    Run full Monte Carlo simulation.
    
    Args:
        config: Simulation configuration
        n_paths: Number of simulation paths
        seed: Random seed for reproducibility
        verbose: Print progress updates
    
    Returns:
        List of result dictionaries
    """
    if verbose:
        print(f"Running {n_paths:,} simulations...")
        print(f"  Initial IRA: ${config.initial_ira:,.0f}")
        print(f"  Initial Taxable: ${config.initial_taxable:,.0f}")
        print(f"  Start Age: {config.start_age}")
        print(f"  Expected Return (mu): {config.mu:.1%}")
        print(f"  Volatility (sigma): {config.sigma:.1%}")
    
    start_time = time.time()
    
    # Generate market paths
    max_years = config.max_age - config.start_age
    market_paths = simulate_gbm_paths(
        S0=1.0,  # Normalized; we'll use returns
        mu=config.mu,
        sigma=config.sigma,
        T=max_years,
        n_paths=n_paths,
        seed=seed,
    )
    # Convert to returns
    market_returns = market_paths[:, 1:] / market_paths[:, :-1] - 1
    
    if verbose:
        print(f"  Generated {n_paths:,} market paths ({max_years} years each)")
    
    # Sample death ages
    death_ages = sample_death_ages_vectorized(
        current_age=config.start_age,
        n_samples=n_paths,
        gender=config.gender,
        max_age=config.max_age,
        seed=seed + 1,  # Different seed for mortality
    )
    
    if verbose:
        print(f"  Sampled death ages: min={death_ages.min()}, max={death_ages.max()}, mean={death_ages.mean():.1f}")
    
    # Run simulations for both strategies
    results = []
    
    for i in range(n_paths):
        death_age = int(death_ages[i])
        returns = market_returns[i, :]
        
        # Strategy 1: Hold to Death
        tw1, tax1, rmd1, step1, _ = simulate_hold_to_death(
            initial_ira=config.initial_ira,
            initial_taxable=config.initial_taxable,
            taxable_basis=config.taxable_basis,
            start_age=config.start_age,
            death_age=death_age,
            market_returns=returns,
            tax_bracket=config.tax_bracket,
            cap_gains_rate=config.cap_gains_rate,
        )
        
        results.append({
            'path_id': i,
            'strategy': 'hold_to_death',
            'death_age': death_age,
            'years_lived': death_age - config.start_age,
            'terminal_wealth': tw1,
            'total_taxes_paid': tax1,
            'total_rmd_withdrawals': rmd1,
            'step_up_benefit': step1,
        })
        
        # Strategy 2: Aggressive Conversion
        tw2, tax2, rmd2, step2, _ = simulate_aggressive_conversion(
            initial_ira=config.initial_ira,
            initial_taxable=config.initial_taxable,
            taxable_basis=config.taxable_basis,
            start_age=config.start_age,
            death_age=death_age,
            market_returns=returns,
            tax_bracket=config.tax_bracket,
            cap_gains_rate=config.cap_gains_rate,
            annual_conversion=100_000,
        )
        
        results.append({
            'path_id': i,
            'strategy': 'aggressive_conversion',
            'death_age': death_age,
            'years_lived': death_age - config.start_age,
            'terminal_wealth': tw2,
            'total_taxes_paid': tax2,
            'total_rmd_withdrawals': rmd2,
            'step_up_benefit': step2,
        })
        
        if verbose and (i + 1) % 1000 == 0:
            print(f"  Completed {i + 1:,} paths...")
    
    elapsed = time.time() - start_time
    if verbose:
        print(f"Simulation complete in {elapsed:.1f} seconds")
    
    return results


def store_results_duckdb(results: List[Dict], db_path: str = 'simulation.duckdb'):
    """Store simulation results in DuckDB."""
    if not HAS_DUCKDB:
        print("DuckDB not available. Skipping storage.")
        return
    
    conn = duckdb.connect(db_path)
    
    # Create table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS simulation_results (
            path_id INTEGER,
            strategy VARCHAR,
            death_age INTEGER,
            years_lived INTEGER,
            terminal_wealth DOUBLE,
            total_taxes_paid DOUBLE,
            total_rmd_withdrawals DOUBLE,
            step_up_benefit DOUBLE
        )
    """)
    
    # Insert results
    conn.executemany("""
        INSERT INTO simulation_results VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, [(r['path_id'], r['strategy'], r['death_age'], r['years_lived'],
           r['terminal_wealth'], r['total_taxes_paid'], r['total_rmd_withdrawals'],
           r['step_up_benefit']) for r in results])
    
    print(f"Stored {len(results):,} results in {db_path}")
    conn.close()


def analyze_results(db_path: str = 'simulation.duckdb'):
    """Run analysis queries on simulation results."""
    if not HAS_DUCKDB:
        print("DuckDB not available.")
        return

    conn = duckdb.connect(db_path)

    print("\n" + "="*60)
    print("SIMULATION RESULTS ANALYSIS")
    print("="*60)

    # Strategy comparison
    print("\n1. STRATEGY COMPARISON")
    print("-"*40)
    result = conn.execute("""
        SELECT
            strategy,
            COUNT(*) as n_paths,
            AVG(terminal_wealth) as avg_wealth,
            STDDEV(terminal_wealth) as std_wealth,
            PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY terminal_wealth) as var_95,
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY terminal_wealth) as median,
            AVG(total_taxes_paid) as avg_taxes,
            AVG(step_up_benefit) as avg_step_up
        FROM simulation_results
        GROUP BY strategy
    """).fetchall()

    for row in result:
        print(f"\nStrategy: {row[0]}")
        print(f"  Paths: {row[1]:,}")
        print(f"  Avg Terminal Wealth: ${row[2]:,.0f}")
        print(f"  Std Dev: ${row[3]:,.0f}")
        print(f"  VaR (5%): ${row[4]:,.0f}")
        print(f"  Median: ${row[5]:,.0f}")
        print(f"  Avg Taxes Paid: ${row[6]:,.0f}")
        print(f"  Avg Step-Up Benefit: ${row[7]:,.0f}")

    # Tax Alpha calculation
    print("\n2. TAX ALPHA")
    print("-"*40)
    result = conn.execute("""
        WITH strategy_avgs AS (
            SELECT strategy, AVG(terminal_wealth) as avg_wealth
            FROM simulation_results
            GROUP BY strategy
        )
        SELECT
            a.strategy,
            a.avg_wealth,
            a.avg_wealth - b.avg_wealth as tax_alpha
        FROM strategy_avgs a
        CROSS JOIN (SELECT avg_wealth FROM strategy_avgs WHERE strategy = 'hold_to_death') b
    """).fetchall()

    for row in result:
        print(f"{row[0]}: ${row[1]:,.0f} (Alpha: ${row[2]:+,.0f})")

    # Win rate
    print("\n3. WIN RATE (Head-to-Head)")
    print("-"*40)
    result = conn.execute("""
        WITH paired AS (
            SELECT
                a.path_id,
                a.terminal_wealth as hold_wealth,
                b.terminal_wealth as convert_wealth
            FROM simulation_results a
            JOIN simulation_results b ON a.path_id = b.path_id
            WHERE a.strategy = 'hold_to_death'
              AND b.strategy = 'aggressive_conversion'
        )
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN hold_wealth > convert_wealth THEN 1 ELSE 0 END) as hold_wins,
            SUM(CASE WHEN convert_wealth > hold_wealth THEN 1 ELSE 0 END) as convert_wins
        FROM paired
    """).fetchone()

    total, hold_wins, convert_wins = result
    print(f"Total comparisons: {total:,}")
    print(f"Hold-to-Death wins: {hold_wins:,} ({100*hold_wins/total:.1f}%)")
    print(f"Aggressive Conversion wins: {convert_wins:,} ({100*convert_wins/total:.1f}%)")

    # By lifespan
    print("\n4. RESULTS BY LIFESPAN")
    print("-"*40)
    result = conn.execute("""
        SELECT
            CASE
                WHEN death_age < 75 THEN 'Early (< 75)'
                WHEN death_age < 85 THEN 'Mid (75-84)'
                ELSE 'Late (85+)'
            END as lifespan_group,
            strategy,
            COUNT(*) as n,
            AVG(terminal_wealth) as avg_wealth
        FROM simulation_results
        GROUP BY 1, 2
        ORDER BY 1, 2
    """).fetchall()

    for row in result:
        print(f"{row[0]} | {row[1]}: ${row[3]:,.0f} (n={row[2]})")

    conn.close()


def main():
    parser = argparse.ArgumentParser(description='Run RMD Tax Optimization Simulation')
    parser.add_argument('--n_paths', type=int, default=1000, help='Number of simulation paths')
    parser.add_argument('--seed', type=int, default=42, help='Random seed')
    parser.add_argument('--mu', type=float, default=0.07, help='Expected return')
    parser.add_argument('--sigma', type=float, default=0.16, help='Volatility')
    parser.add_argument('--db', type=str, default='simulation.duckdb', help='Database path')
    parser.add_argument('--analyze-only', action='store_true', help='Only run analysis')

    args = parser.parse_args()

    if not args.analyze_only:
        config = SimulationConfig(
            mu=args.mu,
            sigma=args.sigma,
        )

        results = run_monte_carlo(config, n_paths=args.n_paths, seed=args.seed)
        store_results_duckdb(results, args.db)

    analyze_results(args.db)


if __name__ == '__main__':
    main()

