# Financial Analysis Guide
## Municipal Bond Analytics for Database Students

**Purpose:** This guide explains the financial concepts you'll analyze in the project  
**Audience:** Students with basic finance knowledge  
**Prerequisites:** Understanding of bonds, interest rates, and risk

---

## 📚 Table of Contents

1. [Bond Basics](#bond-basics)
2. [Yield Analysis](#yield-analysis)
3. [Credit Ratings](#credit-ratings)
4. [Duration and Price Sensitivity](#duration-and-price-sensitivity)
5. [Yield Spreads](#yield-spreads)
6. [Economic Indicators](#economic-indicators)
7. [Tax-Equivalent Yield](#tax-equivalent-yield)
8. [Yield Curve Analysis](#yield-curve-analysis)
9. [Trading Patterns](#trading-patterns)
10. [SQL Implementation Examples](#sql-implementation-examples)

---

## 1. Bond Basics

### What is a Municipal Bond?

A **municipal bond** (muni) is a debt security issued by a state, city, county, or other governmental entity to finance public projects.

**Key Terms:**
- **Issuer:** The government entity borrowing money
- **Face Value (Par):** Amount paid at maturity (typically $1,000)
- **Coupon Rate:** Annual interest rate paid to bondholder
- **Maturity Date:** When the bond principal is repaid
- **Yield:** Actual return to investor (changes with price)

**Example:**
```
California issues a bond:
- Face Value: $1,000
- Coupon Rate: 4%
- Maturity: 10 years
- Annual Payment: $40 (4% of $1,000)
```

### Bond Types in Our Dataset

1. **General Obligation (GO) Bonds**
   - Backed by taxing power of issuer
   - Lower risk → lower yields
   - ~60% of our dataset

2. **Revenue Bonds**
   - Backed by specific project revenue (tolls, fees)
   - Higher risk → higher yields
   - ~40% of our dataset

---

## 2. Yield Analysis

### What is Yield?

**Yield** is the return an investor receives from a bond, expressed as a percentage.

**Formula:**
```
Yield ≈ (Annual Coupon Payment / Current Price) × 100
```

**Example:**
```
Bond with $40 annual coupon:
- If price = $1,000 → Yield = 4.0%
- If price = $950 → Yield = 4.2% (higher yield, lower price)
- If price = $1,050 → Yield = 3.8% (lower yield, higher price)
```

### Key Insight: Inverse Relationship

**Price ↑ → Yield ↓**  
**Price ↓ → Yield ↑**

### SQL Query: Average Yield by State

```sql
SELECT 
    i.state,
    COUNT(DISTINCT b.bond_id) AS bond_count,
    ROUND(AVG(t.yield), 2) AS avg_yield,
    ROUND(MIN(t.yield), 2) AS min_yield,
    ROUND(MAX(t.yield), 2) AS max_yield
FROM bonds b
JOIN issuers i ON b.issuer_id = i.issuer_id
JOIN trades t ON b.bond_id = t.bond_id
GROUP BY i.state
ORDER BY avg_yield DESC;
```

**What to Look For:**
- States with higher yields may have higher risk
- Compare to state credit ratings and economic health

---

## 3. Credit Ratings

### What are Credit Ratings?

Credit ratings assess the **default risk** of a bond issuer.

**Rating Scale (Investment Grade):**
```
AAA - Highest quality, lowest risk
AA  - High quality
A   - Upper-medium quality
BBB - Medium quality (lowest investment grade)
```

**Below BBB = "Junk Bonds"** (not in our dataset)

### Rating Impact on Yields

**Lower Rating → Higher Yield** (risk premium)

**Expected Pattern:**
```
AAA bonds: ~2.5% yield
AA bonds:  ~3.0% yield
A bonds:   ~3.5% yield
BBB bonds: ~4.0% yield
```

### SQL Query: Yield by Credit Rating

```sql
WITH latest_ratings AS (
    SELECT 
        bond_id,
        rating,
        ROW_NUMBER() OVER (PARTITION BY bond_id ORDER BY rating_date DESC) AS rn
    FROM credit_ratings
)
SELECT 
    lr.rating,
    COUNT(DISTINCT t.bond_id) AS bond_count,
    ROUND(AVG(t.yield), 2) AS avg_yield,
    ROUND(STDDEV(t.yield), 2) AS yield_volatility
FROM latest_ratings lr
JOIN trades t ON lr.bond_id = t.bond_id
WHERE lr.rn = 1
GROUP BY lr.rating
ORDER BY lr.rating;
```

**What to Look For:**
- Clear progression: AAA < AA < A < BBB
- Volatility increases with lower ratings

---

## 4. Duration and Price Sensitivity

### What is Duration?

**Duration** measures how much a bond's price changes when interest rates change.

**Formula (simplified):**
```
Price Change ≈ -Duration × Interest Rate Change
```

**Example:**
```
Bond with Duration = 7 years
If interest rates rise 1%:
Price falls ≈ 7% × 1% = 7%
```

### Key Insights:

1. **Longer maturity → Higher duration → More price volatility**
2. **Lower coupon → Higher duration**
3. **Duration is always less than time to maturity**

### SQL Query: Duration Analysis

```sql
SELECT 
    CASE 
        WHEN b.duration < 5 THEN 'Short (< 5 years)'
        WHEN b.duration < 10 THEN 'Medium (5-10 years)'
        ELSE 'Long (> 10 years)'
    END AS duration_bucket,
    COUNT(*) AS bond_count,
    ROUND(AVG(b.duration), 2) AS avg_duration,
    ROUND(STDDEV(t.trade_price), 2) AS price_volatility,
    ROUND(AVG(t.yield), 2) AS avg_yield
FROM bonds b
JOIN trades t ON b.bond_id = t.bond_id
GROUP BY duration_bucket
ORDER BY avg_duration;
```

**What to Look For:**
- Longer duration bonds have higher price volatility
- Investors demand higher yields for longer duration (more risk)

---

## 5. Yield Spreads

### What is a Yield Spread?

**Yield Spread** = Difference between two yields

**Most Important Spread:**
```
Muni Yield Spread = Municipal Bond Yield - Treasury Yield
```

### Why It Matters:

- **Positive spread:** Munis yield more than Treasuries (normal)
- **Wider spread:** Higher perceived risk in munis
- **Narrower spread:** Munis becoming more attractive

### SQL Query: Yield Spread Analysis

```sql
SELECT 
    i.state,
    DATE_TRUNC('month', t.trade_date) AS month,
    ROUND(AVG(t.yield), 2) AS avg_muni_yield,
    ROUND(AVG(ei.treasury_10yr), 2) AS avg_treasury_yield,
    ROUND(AVG(t.yield - ei.treasury_10yr), 2) AS avg_spread,
    COUNT(*) AS trade_count
FROM trades t
JOIN bonds b ON t.bond_id = b.bond_id
JOIN issuers i ON b.issuer_id = i.issuer_id
JOIN economic_indicators ei ON 
    i.state = ei.state AND 
    DATE_TRUNC('month', t.trade_date) = ei.date
GROUP BY i.state, month
ORDER BY month, i.state;
```

**What to Look For:**
- Spreads widened in 2020 (COVID panic)
- Spreads narrowed in 2023-2024 (recovery)
- State differences in spreads

---

## 6. Economic Indicators

### Key Indicators in Our Dataset:

1. **Unemployment Rate**
   - Higher unemployment → Higher bond yields (more risk)
   - State-level monthly data

2. **10-Year Treasury Yield**
   - Benchmark for all interest rates
   - Munis move with Treasuries

3. **20-Year Treasury Yield**
   - Longer-term benchmark
   - Usually higher than 10-year

4. **VIX Volatility Index**
   - "Fear gauge" for markets
   - Higher VIX → Higher muni yields

### SQL Query: Economic Correlation

```sql
-- Correlation between unemployment and muni yields
WITH monthly_data AS (
    SELECT 
        i.state,
        DATE_TRUNC('month', t.trade_date) AS month,
        AVG(t.yield) AS avg_yield,
        AVG(ei.unemployment_rate) AS avg_unemployment
    FROM trades t
    JOIN bonds b ON t.bond_id = b.bond_id
    JOIN issuers i ON b.issuer_id = i.issuer_id
    JOIN economic_indicators ei ON 
        i.state = ei.state AND 
        DATE_TRUNC('month', t.trade_date) = ei.date
    GROUP BY i.state, month
)
SELECT 
    state,
    ROUND(CORR(avg_yield, avg_unemployment)::numeric, 3) AS correlation,
    COUNT(*) AS months
FROM monthly_data
GROUP BY state
ORDER BY correlation DESC;
```

**What to Look For:**
- Positive correlation (unemployment ↑ → yields ↑)
- Stronger correlation in some states
- Changes over time (2020 vs 2024)

---

## 7. Tax-Equivalent Yield

### What is Tax-Equivalent Yield?

Municipal bonds are usually **tax-exempt**, so we need to compare them to taxable bonds fairly.

**Formula:**
```
Tax-Equivalent Yield = Muni Yield / (1 - Tax Rate)
```

**Example:**
```
Muni Yield: 3.5%
Tax Rate: 30%

Tax-Equivalent Yield = 3.5% / (1 - 0.30) = 3.5% / 0.70 = 5.0%

This means a 3.5% tax-free muni is equivalent to a 5.0% taxable bond
```

### SQL Query: Tax-Equivalent Yield

```sql
-- Calculate tax-equivalent yield for different tax brackets
SELECT 
    b.bond_id,
    i.issuer_name,
    i.state,
    t.yield AS muni_yield,
    ROUND((t.yield / (1 - 0.22))::numeric, 2) AS tax_equiv_22pct,
    ROUND((t.yield / (1 - 0.32))::numeric, 2) AS tax_equiv_32pct,
    ROUND((t.yield / (1 - 0.37))::numeric, 2) AS tax_equiv_37pct
FROM trades t
JOIN bonds b ON t.bond_id = b.bond_id
JOIN issuers i ON b.issuer_id = i.issuer_id
WHERE t.trade_date = (
    SELECT MAX(trade_date) 
    FROM trades 
    WHERE bond_id = t.bond_id
)
ORDER BY t.yield DESC
LIMIT 20;
```

**What to Look For:**
- Higher tax brackets benefit more from munis
- Compare tax-equivalent yield to corporate bond yields

---

## 8. Yield Curve Analysis

### What is a Yield Curve?

A **yield curve** plots yield vs. time to maturity.

**Normal Yield Curve:**
```
Yield
  ^
  |        /
  |      /
  |    /
  |  /
  |/
  +-----------> Maturity
```

**Shapes:**
- **Normal (upward sloping):** Longer maturity = higher yield
- **Inverted (downward sloping):** Recession signal
- **Flat:** Transition period

### SQL Query: Yield Curve

```sql
SELECT 
    EXTRACT(YEAR FROM (b.maturity_date - t.trade_date)) AS years_to_maturity,
    cr.rating,
    COUNT(*) AS bond_count,
    ROUND(AVG(t.yield), 2) AS avg_yield
FROM trades t
JOIN bonds b ON t.bond_id = b.bond_id
LEFT JOIN LATERAL (
    SELECT rating
    FROM credit_ratings
    WHERE bond_id = b.bond_id AND rating_date <= t.trade_date
    ORDER BY rating_date DESC
    LIMIT 1
) cr ON true
WHERE t.trade_date >= '2024-01-01'
GROUP BY years_to_maturity, cr.rating
HAVING COUNT(*) >= 5
ORDER BY cr.rating, years_to_maturity;
```

**What to Look For:**
- Normal upward slope
- Steeper curves = more uncertainty
- Different curves for different ratings

---

## 9. Trading Patterns

### Trading Volume Analysis

**Key Questions:**
- Which bonds trade most frequently?
- How does trading volume change over time?
- What buyer types dominate?

### SQL Query: Trading Activity

```sql
-- Trading volume by month and buyer type
SELECT 
    DATE_TRUNC('month', trade_date) AS month,
    buyer_type,
    COUNT(*) AS trade_count,
    SUM(quantity) AS total_quantity,
    ROUND(AVG(trade_price), 2) AS avg_price
FROM trades
GROUP BY month, buyer_type
ORDER BY month, buyer_type;
```

**What to Look For:**
- Institutional buyers dominate (60%)
- Volume spikes during market stress
- Retail participation patterns

---

## 10. SQL Implementation Examples

### Example 1: Moving Average (Window Function)

```sql
-- 30-day moving average of bond prices
SELECT 
    bond_id,
    trade_date,
    trade_price,
    ROUND(AVG(trade_price) OVER (
        PARTITION BY bond_id 
        ORDER BY trade_date 
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ), 2) AS moving_avg_30day
FROM trades
WHERE bond_id IN (
    SELECT bond_id 
    FROM trades 
    GROUP BY bond_id 
    HAVING COUNT(*) >= 30
)
ORDER BY bond_id, trade_date;
```

### Example 2: Credit Rating Migration (LAG Function)

```sql
-- Identify rating upgrades and downgrades
WITH rating_changes AS (
    SELECT 
        bond_id,
        rating,
        rating_date,
        LAG(rating) OVER (PARTITION BY bond_id ORDER BY rating_date) AS prev_rating,
        LAG(rating_date) OVER (PARTITION BY bond_id ORDER BY rating_date) AS prev_date
    FROM credit_ratings
)
SELECT 
    bond_id,
    prev_rating,
    rating AS new_rating,
    rating_date,
    CASE 
        WHEN prev_rating IS NULL THEN 'Initial'
        WHEN rating > prev_rating THEN 'Upgrade'
        WHEN rating < prev_rating THEN 'Downgrade'
        ELSE 'No Change'
    END AS movement_type
FROM rating_changes
WHERE prev_rating IS NOT NULL
ORDER BY rating_date;
```

### Example 3: Performance Percentiles (NTILE)

```sql
-- Classify bonds by performance percentile
WITH price_changes AS (
    SELECT 
        bond_id,
        MIN(CASE WHEN trade_date < '2022-01-01' THEN trade_price END) AS price_2021,
        MAX(CASE WHEN trade_date >= '2024-01-01' THEN trade_price END) AS price_2024
    FROM trades
    GROUP BY bond_id
    HAVING 
        MIN(CASE WHEN trade_date < '2022-01-01' THEN trade_price END) IS NOT NULL AND
        MAX(CASE WHEN trade_date >= '2024-01-01' THEN trade_price END) IS NOT NULL
)
SELECT 
    bond_id,
    price_2021,
    price_2024,
    ROUND(((price_2024 - price_2021) / price_2021 * 100), 2) AS pct_change,
    NTILE(10) OVER (ORDER BY (price_2024 - price_2021) / price_2021) AS performance_decile
FROM price_changes
ORDER BY pct_change DESC;
```

---

## 📊 Key Metrics Summary

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **Yield** | Coupon / Price | Return to investor |
| **Yield Spread** | Muni Yield - Treasury Yield | Risk premium |
| **Duration** | Weighted avg time to cash flows | Price sensitivity |
| **Tax-Equiv Yield** | Muni Yield / (1 - Tax Rate) | Fair comparison to taxable |
| **Price Change** | (New Price - Old Price) / Old Price | Performance |

---

## 🎯 Analysis Checklist for Your Project

- [ ] Calculate average yields by state, sector, and rating
- [ ] Analyze yield spreads vs. Treasury bonds
- [ ] Examine credit rating impact on yields
- [ ] Study duration and price volatility relationship
- [ ] Investigate economic indicator correlations
- [ ] Analyze trading patterns over time
- [ ] Identify rating upgrades and downgrades
- [ ] Calculate tax-equivalent yields
- [ ] Build yield curves by rating
- [ ] Assess bond performance (price changes)

---

## 📚 Additional Resources

**Bond Basics:**
- [Investopedia Bond Guide](https://www.investopedia.com/terms/b/bond.asp)
- [MSRB Education](https://www.msrb.org/Education-Center)

**Yield Analysis:**
- [Yield to Maturity](https://www.investopedia.com/terms/y/yieldtomaturity.asp)
- [Current Yield](https://www.investopedia.com/terms/c/currentyield.asp)

**Duration:**
- [Modified Duration](https://www.investopedia.com/terms/m/modifiedduration.asp)
- [Macaulay Duration](https://www.investopedia.com/terms/m/macaulayduration.asp)

**Credit Analysis:**
- [Credit Ratings Explained](https://www.investopedia.com/terms/c/creditrating.asp)
- [Rating Agencies](https://www.investopedia.com/terms/c/credit-agency.asp)

---

**This guide provides the financial foundation you need to complete meaningful analysis in your project. Use these concepts and SQL examples as starting points for your own queries!**

