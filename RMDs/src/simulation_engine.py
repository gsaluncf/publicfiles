"""
Monte Carlo Simulation Engine

This module provides the SimulationEngine class that orchestrates
market simulation, survival sampling, and tax strategy execution.
"""

import numpy as np
from typing import List, Dict, Optional

from market_simulation import MarketSimulator
from survival_analysis import SurvivalModel
from tax_strategies import TaxStrategy


class SimulationEngine:
    """
    Orchestrates Monte Carlo simulations for retirement tax planning.
    
    Combines:
    - Market simulation (GBM)
    - Survival sampling (SSA life tables)
    - Tax strategy execution
    """
    
    def __init__(
        self,
        market: MarketSimulator,
        survival: SurvivalModel
    ):
        """
        Initialize the simulation engine.
        
        Args:
            market: MarketSimulator instance for generating returns
            survival: SurvivalModel instance for sampling death ages
        """
        self.market = market
        self.survival = survival
    
    def run_single_simulation(
        self,
        strategy: TaxStrategy,
        start_age: int,
        death_age: int,
        initial_ira: float,
        initial_taxable: float,
        cost_basis: float,
        market_returns: np.ndarray
    ) -> Dict:
        """
        Run a single simulation path.
        
        Args:
            strategy: Tax strategy to apply
            start_age: Age at simulation start
            death_age: Age at death
            initial_ira: Starting IRA balance
            initial_taxable: Starting taxable account balance
            cost_basis: Cost basis in taxable account
            market_returns: Array of annual returns
        
        Returns:
            Dictionary with simulation results
        """
        return strategy.simulate(
            initial_ira=initial_ira,
            initial_taxable=initial_taxable,
            cost_basis=cost_basis,
            start_age=start_age,
            death_age=death_age,
            market_returns=market_returns
        )
    
    def run_monte_carlo(
        self,
        strategy: TaxStrategy,
        start_age: int,
        gender: str,
        initial_ira: float,
        initial_taxable: float,
        cost_basis: float,
        n_simulations: int = 10_000,
        max_years: int = 55,
        seed: Optional[int] = None
    ) -> List[Dict]:
        """
        Run Monte Carlo simulation with many paths.
        
        Args:
            strategy: Tax strategy to apply
            start_age: Age at simulation start
            gender: 'M' or 'F' for mortality tables
            initial_ira: Starting IRA balance
            initial_taxable: Starting taxable account balance
            cost_basis: Cost basis in taxable account
            n_simulations: Number of simulation paths
            max_years: Maximum years to simulate (for market paths)
            seed: Random seed for reproducibility
        
        Returns:
            List of result dictionaries, one per simulation
        """
        if seed is not None:
            np.random.seed(seed)
        
        # Sample death ages
        death_ages = self.survival.sample_death_ages(
            current_age=start_age,
            n_samples=n_simulations,
            gender=gender,
            seed=seed
        )
        
        # Generate market returns for all paths
        # Use max_years to ensure we have enough returns for longest-lived
        market_returns = self.market.simulate_returns(
            n_years=max_years,
            n_paths=n_simulations,
            seed=seed + 1 if seed else None
        )
        
        # Run simulations
        results = []
        for i in range(n_simulations):
            result = self.run_single_simulation(
                strategy=strategy,
                start_age=start_age,
                death_age=death_ages[i],
                initial_ira=initial_ira,
                initial_taxable=initial_taxable,
                cost_basis=cost_basis,
                market_returns=market_returns[i]
            )
            results.append(result)
        
        return results
    
    def compare_strategies(
        self,
        strategies: List[TaxStrategy],
        strategy_names: List[str],
        **kwargs
    ) -> Dict[str, List[Dict]]:
        """
        Run Monte Carlo for multiple strategies with same random paths.
        
        Returns:
            Dictionary mapping strategy name to list of results
        """
        all_results = {}
        for strategy, name in zip(strategies, strategy_names):
            all_results[name] = self.run_monte_carlo(strategy=strategy, **kwargs)
        return all_results

