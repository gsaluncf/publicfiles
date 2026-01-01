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

