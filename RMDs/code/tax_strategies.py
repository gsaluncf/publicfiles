"""
Tax Strategy Implementation for RMD Simulation

This module implements:
1. RMD calculation using IRS Uniform Lifetime Table
2. Hold-to-Death strategy
3. Aggressive Conversion strategy
4. Terminal wealth calculation with step-up in basis
"""

import numpy as np
from typing import Dict, List, Tuple
from dataclasses import dataclass

# IRS Uniform Lifetime Table (2024)
# Used to calculate RMD divisor based on age
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


def get_rmd_divisor(age: int) -> float:
    """Get the RMD distribution period for a given age."""
    if age < 72:
        return 0.0  # No RMD required
    if age in RMD_DIVISORS:
        return RMD_DIVISORS[age]
    if age > 120:
        return 2.0
    # Interpolate for missing ages
    return RMD_DIVISORS.get(age, 2.0)


def calculate_rmd(ira_balance: float, age: int) -> float:
    """
    Calculate Required Minimum Distribution for a given year.
    
    RMD = Account Balance / Distribution Period
    
    Args:
        ira_balance: IRA balance at end of prior year
        age: Age at end of current year
    
    Returns:
        Required minimum distribution amount
    """
    if age < 73:  # RMDs start at 73 (as of SECURE 2.0)
        return 0.0
    
    divisor = get_rmd_divisor(age)
    if divisor <= 0:
        return ira_balance  # Distribute everything
    
    return ira_balance / divisor


@dataclass
class YearSnapshot:
    """State at end of a simulation year."""
    year: int
    age: int
    ira_balance: float
    taxable_balance: float
    taxable_basis: float
    rmd_taken: float
    taxes_paid: float
    market_return: float


def simulate_hold_to_death(
    initial_ira: float,
    initial_taxable: float,
    taxable_basis: float,
    start_age: int,
    death_age: int,
    market_returns: np.ndarray,
    tax_bracket: float = 0.24,
    cap_gains_rate: float = 0.15,
    rmd_start_age: int = 73,
) -> Tuple[float, float, float, float, List[YearSnapshot]]:
    """
    Simulate the Hold-to-Death strategy.
    
    Strategy: Take only required RMDs. Keep taxable account untouched.
    At death, heirs receive step-up in basis on taxable account.
    
    Args:
        initial_ira: Starting Traditional IRA balance
        initial_taxable: Starting taxable brokerage balance
        taxable_basis: Cost basis in taxable account
        start_age: Age at simulation start
        death_age: Age at death
        market_returns: Array of annual returns for each year
        tax_bracket: Marginal income tax rate
        cap_gains_rate: Long-term capital gains rate
        rmd_start_age: Age when RMDs begin
    
    Returns:
        Tuple of (terminal_wealth, total_taxes, total_rmds, step_up_benefit, snapshots)
    """
    years_to_simulate = death_age - start_age
    
    ira = initial_ira
    taxable = initial_taxable
    basis = taxable_basis
    
    total_taxes = 0.0
    total_rmds = 0.0
    snapshots = []
    
    for year in range(years_to_simulate):
        age = start_age + year + 1  # Age at end of year
        market_return = market_returns[year] if year < len(market_returns) else 0.0
        
        # Apply market return to both accounts
        ira *= (1 + market_return)
        taxable *= (1 + market_return)
        # Basis doesn't change with market (it's what you paid)
        
        # Calculate and take RMD if required
        rmd = calculate_rmd(ira, age)
        if rmd > 0:
            ira -= rmd
            taxes = rmd * tax_bracket
            total_taxes += taxes
            total_rmds += rmd
        else:
            taxes = 0.0
        
        snapshots.append(YearSnapshot(
            year=year + 1,
            age=age,
            ira_balance=ira,
            taxable_balance=taxable,
            taxable_basis=basis,
            rmd_taken=rmd,
            taxes_paid=taxes,
            market_return=market_return,
        ))
    
    # At death: calculate terminal wealth
    # IRA is fully taxable to heirs (no step-up)
    ira_after_tax = ira * (1 - tax_bracket)
    
    # Taxable account gets step-up in basis
    # Heirs inherit at current market value, no capital gains tax
    unrealized_gain = taxable - basis
    step_up_benefit = unrealized_gain * cap_gains_rate  # Taxes avoided
    taxable_after_tax = taxable  # No tax due to step-up
    
    terminal_wealth = ira_after_tax + taxable_after_tax
    
    return terminal_wealth, total_taxes, total_rmds, step_up_benefit, snapshots


def simulate_aggressive_conversion(
    initial_ira: float,
    initial_taxable: float,
    taxable_basis: float,
    start_age: int,
    death_age: int,
    market_returns: np.ndarray,
    tax_bracket: float = 0.24,
    cap_gains_rate: float = 0.15,
    annual_conversion: float = 100_000,
    conversion_end_age: int = 72,
) -> Tuple[float, float, float, float, List[YearSnapshot]]:
    """
    Simulate the Aggressive Roth Conversion strategy.
    
    Strategy: Convert $X per year from Traditional IRA to Roth IRA
    until RMDs begin. Pay taxes now at known rates.
    """
    years_to_simulate = death_age - start_age
    
    ira = initial_ira
    roth = 0.0
    taxable = initial_taxable
    basis = taxable_basis
    
    total_taxes = 0.0
    total_rmds = 0.0
    snapshots = []
    
    for year in range(years_to_simulate):
        age = start_age + year + 1
        market_return = market_returns[year] if year < len(market_returns) else 0.0
        
        # Apply market return
        ira *= (1 + market_return)
        roth *= (1 + market_return)
        taxable *= (1 + market_return)
        
        # Roth conversion (before RMD age)
        conversion_tax = 0.0
        if age <= conversion_end_age and ira > 0:
            convert_amount = min(annual_conversion, ira)
            ira -= convert_amount
            roth += convert_amount
            conversion_tax = convert_amount * tax_bracket
            total_taxes += conversion_tax
        
        # RMD on remaining IRA
        rmd = calculate_rmd(ira, age)
        rmd_tax = 0.0
        if rmd > 0:
            ira -= rmd
            rmd_tax = rmd * tax_bracket
            total_taxes += rmd_tax
            total_rmds += rmd
        
        snapshots.append(YearSnapshot(
            year=year + 1,
            age=age,
            ira_balance=ira + roth,  # Combined for comparison
            taxable_balance=taxable,
            taxable_basis=basis,
            rmd_taken=rmd,
            taxes_paid=conversion_tax + rmd_tax,
            market_return=market_return,
        ))
    
    # Terminal wealth
    ira_after_tax = ira * (1 - tax_bracket)
    roth_after_tax = roth  # Roth is tax-free
    unrealized_gain = taxable - basis
    step_up_benefit = unrealized_gain * cap_gains_rate
    taxable_after_tax = taxable
    
    terminal_wealth = ira_after_tax + roth_after_tax + taxable_after_tax
    
    return terminal_wealth, total_taxes, total_rmds, step_up_benefit, snapshots

