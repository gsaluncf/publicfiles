"""
SSA Actuarial Life Tables (2022)
Source: https://www.ssa.gov/oact/STATS/table4c6.html
Used in 2025 Trustees Report

This module provides mortality data for survival analysis in Monte Carlo simulations.
"""

# Death probability (q_x) by age - probability of dying within one year
# Format: {age: (male_death_prob, female_death_prob)}

SSA_DEATH_PROBABILITY = {
    0: (0.006064, 0.005119),
    1: (0.000491, 0.000398),
    2: (0.000309, 0.000240),
    3: (0.000248, 0.000198),
    4: (0.000199, 0.000160),
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

# Life expectancy by age
# Format: {age: (male_life_expectancy, female_life_expectancy)}
SSA_LIFE_EXPECTANCY = {
    0: (74.74, 80.18),
    65: (17.48, 20.12),
    70: (14.09, 16.27),
    75: (10.92, 12.68),
    80: (8.11, 9.49),
    85: (5.75, 6.76),
    90: (3.91, 4.62),
    95: (2.63, 3.10),
    100: (1.88, 2.14),
}

# Number of survivors out of 100,000 born alive (l_x)
# Format: {age: (male_survivors, female_survivors)}
SSA_SURVIVORS = {
    0: (100000, 100000),
    65: (77402, 86231),
    70: (69838, 80893),
    73: (64379, 76705),  # RMD start age
    75: (60263, 73319),
    80: (47715, 62112),
    85: (32340, 46683),
    90: (16504, 27827),
    95: (5055, 10967),
    100: (710, 2205),
}


def get_death_probability(age: int, gender: str = 'M') -> float:
    """
    Get the probability of dying within one year at a given age.
    
    Args:
        age: Current age (0-119)
        gender: 'M' for male, 'F' for female
    
    Returns:
        Probability of dying within one year (0.0 to 1.0)
    """
    idx = 0 if gender.upper() == 'M' else 1
    
    # Find closest age in table
    if age in SSA_DEATH_PROBABILITY:
        return SSA_DEATH_PROBABILITY[age][idx]
    
    # Interpolate between known ages
    ages = sorted(SSA_DEATH_PROBABILITY.keys())
    for i, a in enumerate(ages):
        if a > age:
            lower_age = ages[i-1]
            upper_age = a
            lower_prob = SSA_DEATH_PROBABILITY[lower_age][idx]
            upper_prob = SSA_DEATH_PROBABILITY[upper_age][idx]
            # Linear interpolation
            frac = (age - lower_age) / (upper_age - lower_age)
            return lower_prob + frac * (upper_prob - lower_prob)
    
    return 1.0  # Age beyond table


def get_life_expectancy(age: int, gender: str = 'M') -> float:
    """
    Get remaining life expectancy at a given age.
    
    Args:
        age: Current age
        gender: 'M' for male, 'F' for female
    
    Returns:
        Expected remaining years of life
    """
    idx = 0 if gender.upper() == 'M' else 1
    
    if age in SSA_LIFE_EXPECTANCY:
        return SSA_LIFE_EXPECTANCY[age][idx]
    
    # Simple interpolation for ages not in table
    ages = sorted(SSA_LIFE_EXPECTANCY.keys())
    for i, a in enumerate(ages):
        if a > age:
            if i == 0:
                return SSA_LIFE_EXPECTANCY[a][idx]
            lower_age = ages[i-1]
            upper_age = a
            lower_le = SSA_LIFE_EXPECTANCY[lower_age][idx]
            upper_le = SSA_LIFE_EXPECTANCY[upper_age][idx]
            frac = (age - lower_age) / (upper_age - lower_age)
            return lower_le + frac * (upper_le - lower_le)
    
    return 0.5  # Very old age

