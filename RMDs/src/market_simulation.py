"""
Market Simulation using Geometric Brownian Motion

This module provides the MarketSimulator class for generating
simulated stock market returns.
"""

import numpy as np
from typing import Optional


class MarketSimulator:
    """
    Simulates market returns using Geometric Brownian Motion (GBM).
    
    GBM models stock prices as:
        dS = mu * S * dt + sigma * S * dW
    
    where:
        mu = drift (expected annual return)
        sigma = volatility (standard deviation of returns)
        dW = Wiener process (random walk)
    
    Attributes:
        mu: Expected annual return (e.g., 0.07 for 7%)
        sigma: Annual volatility (e.g., 0.16 for 16%)
    """
    
    def __init__(self, mu: float = 0.07, sigma: float = 0.16):
        """
        Initialize the market simulator.
        
        Args:
            mu: Expected annual return (drift)
            sigma: Annual volatility
        """
        self.mu = mu
        self.sigma = sigma
    
    def simulate_returns(
        self, 
        n_years: int, 
        n_paths: int = 1,
        seed: Optional[int] = None
    ) -> np.ndarray:
        """
        Generate annual returns using GBM.
        
        Args:
            n_years: Number of years to simulate
            n_paths: Number of independent paths
            seed: Random seed for reproducibility
        
        Returns:
            Array of shape (n_paths, n_years) with annual returns
        """
        if seed is not None:
            np.random.seed(seed)
        
        # Generate standard normal random variables
        Z = np.random.standard_normal((n_paths, n_years))
        
        # GBM discrete returns
        # log(S_t+1 / S_t) ~ N((mu - 0.5*sigma^2), sigma^2)
        log_returns = (self.mu - 0.5 * self.sigma**2) + self.sigma * Z
        
        # Convert to simple returns
        returns = np.exp(log_returns) - 1
        
        return returns
    
    def simulate_paths(
        self,
        initial_value: float,
        n_years: int,
        n_paths: int = 1,
        seed: Optional[int] = None
    ) -> np.ndarray:
        """
        Generate price paths starting from an initial value.
        
        Args:
            initial_value: Starting price/value
            n_years: Number of years to simulate
            n_paths: Number of independent paths
            seed: Random seed for reproducibility
        
        Returns:
            Array of shape (n_paths, n_years + 1) with price levels
            Column 0 is initial value, columns 1..n_years are year-end values
        """
        returns = self.simulate_returns(n_years, n_paths, seed)
        
        # Build price paths
        paths = np.zeros((n_paths, n_years + 1))
        paths[:, 0] = initial_value
        
        for t in range(n_years):
            paths[:, t + 1] = paths[:, t] * (1 + returns[:, t])
        
        return paths

