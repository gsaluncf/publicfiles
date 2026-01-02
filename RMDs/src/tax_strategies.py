"""
Tax Strategy Classes for RMD Simulation

This module provides strategy classes that implement different
approaches to retirement account withdrawals.
"""

import numpy as np
from typing import Dict, List, Tuple
from abc import ABC, abstractmethod

# IRS Uniform Lifetime Table (2024) - RMD divisors by age
RMD_DIVISORS = {
    72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7,
    77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4,
    82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2,
    87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5,
    92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4,
    97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0,
    102: 5.6, 103: 5.2, 104: 4.9, 105: 4.6, 106: 4.3,
    107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4,
    112: 3.3, 113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8,
    117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0,
}


def calculate_rmd(ira_balance: float, age: int) -> float:
    """Calculate Required Minimum Distribution for a given year."""
    if age < 73:
        return 0.0
    divisor = RMD_DIVISORS.get(age, 2.0)
    return ira_balance / divisor if divisor > 0 else ira_balance


class TaxStrategy(ABC):
    """Abstract base class for tax strategies."""
    
    def __init__(self, tax_bracket: float = 0.24, cap_gains_rate: float = 0.15):
        self.tax_bracket = tax_bracket
        self.cap_gains_rate = cap_gains_rate
    
    @abstractmethod
    def simulate(
        self,
        initial_ira: float,
        initial_taxable: float,
        cost_basis: float,
        start_age: int,
        death_age: int,
        market_returns: np.ndarray
    ) -> Dict:
        """Run the strategy simulation and return results."""
        pass


class HoldToDeathStrategy(TaxStrategy):
    """
    Hold-to-Death Strategy: Take only required RMDs.
    
    Keep taxable account untouched to maximize step-up in basis benefit.
    """
    
    def simulate(
        self,
        initial_ira: float,
        initial_taxable: float,
        cost_basis: float,
        start_age: int,
        death_age: int,
        market_returns: np.ndarray
    ) -> Dict:
        years = death_age - start_age
        
        ira = initial_ira
        taxable = initial_taxable
        basis = cost_basis
        
        total_taxes = 0.0
        total_rmds = 0.0
        
        for year in range(years):
            age = start_age + year + 1
            ret = market_returns[year] if year < len(market_returns) else 0.0
            
            # Apply market return
            ira *= (1 + ret)
            taxable *= (1 + ret)
            
            # Take RMD if required
            rmd = calculate_rmd(ira, age)
            if rmd > 0:
                ira -= rmd
                total_taxes += rmd * self.tax_bracket
                total_rmds += rmd
        
        # Terminal wealth calculation
        ira_after_tax = ira * (1 - self.tax_bracket)
        unrealized_gain = taxable - basis
        step_up_benefit = unrealized_gain * self.cap_gains_rate
        taxable_after_tax = taxable  # No tax due to step-up
        
        return {
            'terminal_wealth': ira_after_tax + taxable_after_tax,
            'total_taxes': total_taxes,
            'total_rmds': total_rmds,
            'step_up_benefit': step_up_benefit,
            'death_age': death_age
        }


class AggressiveConversionStrategy(TaxStrategy):
    """
    Aggressive Roth Conversion Strategy.
    
    Convert IRA to Roth before RMDs begin to reduce future RMD burden.
    """
    
    def __init__(
        self,
        tax_bracket: float = 0.24,
        cap_gains_rate: float = 0.15,
        annual_conversion: float = 100_000,
        conversion_end_age: int = 72
    ):
        super().__init__(tax_bracket, cap_gains_rate)
        self.annual_conversion = annual_conversion
        self.conversion_end_age = conversion_end_age
    
    def simulate(
        self,
        initial_ira: float,
        initial_taxable: float,
        cost_basis: float,
        start_age: int,
        death_age: int,
        market_returns: np.ndarray
    ) -> Dict:
        years = death_age - start_age
        
        ira = initial_ira
        roth = 0.0
        taxable = initial_taxable
        basis = cost_basis
        
        total_taxes = 0.0
        total_rmds = 0.0
        
        for year in range(years):
            age = start_age + year + 1
            ret = market_returns[year] if year < len(market_returns) else 0.0
            
            # Apply market return
            ira *= (1 + ret)
            roth *= (1 + ret)
            taxable *= (1 + ret)
            
            # Roth conversion before RMD age
            if age <= self.conversion_end_age and ira > 0:
                convert = min(self.annual_conversion, ira)
                ira -= convert
                roth += convert
                total_taxes += convert * self.tax_bracket
            
            # Take RMD on remaining IRA
            rmd = calculate_rmd(ira, age)
            if rmd > 0:
                ira -= rmd
                total_taxes += rmd * self.tax_bracket
                total_rmds += rmd
        
        # Terminal wealth
        ira_after_tax = ira * (1 - self.tax_bracket)
        roth_after_tax = roth  # Tax-free
        unrealized_gain = taxable - basis
        step_up_benefit = unrealized_gain * self.cap_gains_rate
        
        return {
            'terminal_wealth': ira_after_tax + roth_after_tax + taxable,
            'total_taxes': total_taxes,
            'total_rmds': total_rmds,
            'step_up_benefit': step_up_benefit,
            'death_age': death_age
        }

