"""
Survival Analysis using SSA Life Tables

This module provides the SurvivalModel class for sampling
death ages from actuarial mortality data.
"""

import numpy as np
from typing import Optional

# SSA 2022 Period Life Table - Death probabilities by age
# Source: https://www.ssa.gov/oact/STATS/table4c6.html
# Format: {age: (male_q_x, female_q_x)}
SSA_DEATH_PROBABILITY = {
    0: (0.006064, 0.005119),
    1: (0.000491, 0.000398),
    5: (0.000167, 0.000134),
    10: (0.000127, 0.000111),
    15: (0.000451, 0.000224),
    20: (0.001301, 0.000496),
    25: (0.001776, 0.000699),
    30: (0.002332, 0.000988),
    35: (0.002791, 0.001324),
    40: (0.003353, 0.001803),
    45: (0.004175, 0.002352),
    50: (0.005666, 0.003407),
    55: (0.008348, 0.005040),
    60: (0.012458, 0.007658),
    65: (0.017897, 0.011018),
    66: (0.019017, 0.011743),
    67: (0.020213, 0.012532),
    68: (0.021569, 0.013512),
    69: (0.023088, 0.014684),
    70: (0.024828, 0.016025),
    71: (0.026705, 0.017468),
    72: (0.028761, 0.019195),
    73: (0.031116, 0.021195),
    74: (0.033861, 0.023452),
    75: (0.037088, 0.025980),
    76: (0.041126, 0.029153),
    77: (0.045241, 0.032394),
    78: (0.049793, 0.035888),
    79: (0.054768, 0.039676),
    80: (0.060660, 0.044156),
    81: (0.067027, 0.049087),
    82: (0.073999, 0.054635),
    83: (0.081737, 0.061066),
    84: (0.090458, 0.068431),
    85: (0.100525, 0.076841),
    86: (0.111793, 0.086205),
    87: (0.124494, 0.096851),
    88: (0.138398, 0.109019),
    89: (0.153207, 0.121867),
    90: (0.169704, 0.135805),
    91: (0.187963, 0.151108),
    92: (0.208395, 0.168020),
    93: (0.230808, 0.186340),
    94: (0.253914, 0.206432),
    95: (0.277402, 0.228086),
    96: (0.300882, 0.250406),
    97: (0.324326, 0.273699),
    98: (0.347332, 0.296984),
    99: (0.369430, 0.319502),
    100: (0.391927, 0.342716),
    105: (0.508032, 0.466891),
    110: (0.648392, 0.624805),
    115: (0.827531, 0.827531),
    119: (1.000000, 1.000000),
}


class SurvivalModel:
    """
    Models human survival using SSA actuarial life tables.
    
    Uses mortality chain approach: for each year, sample whether
    the person dies based on age-specific death probability q_x.
    """
    
    def __init__(self, max_age: int = 119):
        """
        Initialize the survival model.
        
        Args:
            max_age: Maximum age to simulate (default 119)
        """
        self.max_age = max_age
        self._build_mortality_table()
    
    def _build_mortality_table(self):
        """Build interpolated mortality table for all ages."""
        self.q_male = {}
        self.q_female = {}
        
        ages = sorted(SSA_DEATH_PROBABILITY.keys())
        
        for age in range(self.max_age + 1):
            if age in SSA_DEATH_PROBABILITY:
                self.q_male[age] = SSA_DEATH_PROBABILITY[age][0]
                self.q_female[age] = SSA_DEATH_PROBABILITY[age][1]
            else:
                # Linear interpolation
                for i, a in enumerate(ages):
                    if a > age:
                        lower = ages[i - 1]
                        upper = a
                        frac = (age - lower) / (upper - lower)
                        self.q_male[age] = (
                            SSA_DEATH_PROBABILITY[lower][0] * (1 - frac) +
                            SSA_DEATH_PROBABILITY[upper][0] * frac
                        )
                        self.q_female[age] = (
                            SSA_DEATH_PROBABILITY[lower][1] * (1 - frac) +
                            SSA_DEATH_PROBABILITY[upper][1] * frac
                        )
                        break
                else:
                    self.q_male[age] = 1.0
                    self.q_female[age] = 1.0
    
    def get_death_probability(self, age: int, gender: str = 'M') -> float:
        """Get probability of dying within one year at given age."""
        q_table = self.q_male if gender.upper() == 'M' else self.q_female
        return q_table.get(age, 1.0)
    
    def sample_death_ages(
        self,
        current_age: int,
        n_samples: int,
        gender: str = 'M',
        seed: Optional[int] = None
    ) -> np.ndarray:
        """
        Sample death ages from the survival distribution.
        
        Args:
            current_age: Starting age
            n_samples: Number of samples to generate
            gender: 'M' for male, 'F' for female
            seed: Random seed for reproducibility
        
        Returns:
            Array of death ages, shape (n_samples,)
        """
        if seed is not None:
            np.random.seed(seed)
        
        q_table = self.q_male if gender.upper() == 'M' else self.q_female
        death_ages = np.zeros(n_samples, dtype=int)
        
        for i in range(n_samples):
            age = current_age
            while age < self.max_age:
                if np.random.random() < q_table.get(age, 1.0):
                    death_ages[i] = age
                    break
                age += 1
            else:
                death_ages[i] = self.max_age
        
        return death_ages

