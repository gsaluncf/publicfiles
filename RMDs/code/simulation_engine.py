"""
Monte Carlo Simulation Engine for RMD Tax Optimization

This module provides the core simulation functionality:
1. Geometric Brownian Motion for market returns
2. Survival sampling from SSA actuarial tables
3. Tax strategy application
4. Result aggregation
"""

import numpy as np
from typing import Tuple, List, Dict, Optional
from dataclasses import dataclass
from ssa_life_tables import get_death_probability


@dataclass
class SimulationConfig:
    """Configuration for a simulation run."""
    initial_ira: float = 1_000_000      # Traditional IRA balance
    initial_taxable: float = 500_000     # Taxable brokerage balance
    taxable_basis: float = 200_000       # Cost basis in taxable account
    start_age: int = 65                  # Age at simulation start
    gender: str = 'M'                    # 'M' or 'F' for mortality tables
    tax_bracket: float = 0.24           # Marginal income tax rate
    cap_gains_rate: float = 0.15        # Long-term capital gains rate
    rmd_start_age: int = 73             # Age when RMDs begin
    max_age: int = 100                  # Maximum simulation age
    mu: float = 0.07                    # Expected annual return (drift)
    sigma: float = 0.16                 # Annual volatility
    

@dataclass 
class SimulationResult:
    """Results from a single simulation path."""
    path_id: int
    death_age: int
    years_lived: int
    terminal_wealth: float
    total_taxes_paid: float
    total_rmd_withdrawals: float
    step_up_benefit: float
    strategy: str
    annual_snapshots: List[Dict]


# =============================================================================
# GEOMETRIC BROWNIAN MOTION
# =============================================================================

def simulate_gbm_paths(
    S0: float,
    mu: float,
    sigma: float,
    T: int,
    n_paths: int,
    seed: Optional[int] = None
) -> np.ndarray:
    """
    Generate price paths using Geometric Brownian Motion.
    
    The discrete form of GBM:
        S(t+1) = S(t) * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)
    
    where Z ~ N(0,1)
    
    Args:
        S0: Initial price/value
        mu: Annual drift (expected return), e.g., 0.07 for 7%
        sigma: Annual volatility (std dev of returns), e.g., 0.16 for 16%
        T: Number of years to simulate
        n_paths: Number of independent paths to generate
        seed: Random seed for reproducibility
    
    Returns:
        np.ndarray of shape (n_paths, T+1) containing price paths
        Column 0 is the initial value, columns 1..T are year-end values
    """
    if seed is not None:
        np.random.seed(seed)
    
    dt = 1.0  # Annual time steps
    
    # Generate standard normal random variables
    Z = np.random.standard_normal((n_paths, T))
    
    # Calculate log returns for each period
    # Using the exact solution to GBM SDE
    log_returns = (mu - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * Z
    
    # Build cumulative returns
    cumulative_log_returns = np.cumsum(log_returns, axis=1)
    
    # Convert to price levels
    paths = np.zeros((n_paths, T + 1))
    paths[:, 0] = S0
    paths[:, 1:] = S0 * np.exp(cumulative_log_returns)
    
    return paths


def get_annual_returns(paths: np.ndarray) -> np.ndarray:
    """
    Calculate annual returns from price paths.
    
    Args:
        paths: Price paths of shape (n_paths, T+1)
    
    Returns:
        Annual returns of shape (n_paths, T)
    """
    return paths[:, 1:] / paths[:, :-1] - 1


# =============================================================================
# SURVIVAL SAMPLING
# =============================================================================

def sample_death_ages(
    current_age: int,
    n_samples: int,
    gender: str = 'M',
    max_age: int = 119,
    seed: Optional[int] = None
) -> np.ndarray:
    """
    Sample death ages from SSA actuarial life tables.
    
    Uses the mortality chain approach:
    - For each year, sample whether the person dies based on q_x
    - If they survive, move to next year
    - Continue until death or max_age
    
    Args:
        current_age: Starting age
        n_samples: Number of death ages to sample
        gender: 'M' for male, 'F' for female
        max_age: Maximum age to simulate
        seed: Random seed for reproducibility
    
    Returns:
        np.ndarray of death ages, shape (n_samples,)
    """
    if seed is not None:
        np.random.seed(seed)
    
    death_ages = np.zeros(n_samples, dtype=int)
    
    for i in range(n_samples):
        age = current_age
        while age < max_age:
            q_x = get_death_probability(age, gender)
            if np.random.random() < q_x:
                # Person dies this year
                death_ages[i] = age
                break
            age += 1
        else:
            # Survived to max age
            death_ages[i] = max_age
    
    return death_ages


def sample_death_ages_vectorized(
    current_age: int,
    n_samples: int,
    gender: str = 'M',
    max_age: int = 119,
    seed: Optional[int] = None
) -> np.ndarray:
    """
    Vectorized version of death age sampling (faster for large n_samples).
    
    Pre-computes survival probabilities and uses inverse transform sampling.
    """
    if seed is not None:
        np.random.seed(seed)
    
    # Build survival curve from current_age to max_age
    ages = np.arange(current_age, max_age + 1)
    survival_probs = np.ones(len(ages))
    
    for i, age in enumerate(ages[:-1]):
        q_x = get_death_probability(age, gender)
        survival_probs[i + 1] = survival_probs[i] * (1 - q_x)
    
    # CDF of death = 1 - survival
    death_cdf = 1 - survival_probs
    
    # Sample uniform and invert CDF
    u = np.random.random(n_samples)
    death_ages = np.searchsorted(death_cdf, u) + current_age
    death_ages = np.clip(death_ages, current_age, max_age)
    
    return death_ages

