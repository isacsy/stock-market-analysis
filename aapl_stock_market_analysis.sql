-- Apple Inc. (AAPL) Stock Performance & Risk Analysis
-- Period: Apr 2025 - Apr 2026
-- Tool: MySQL
-- Author: Isabel Chong
-- Project: AAPL Stock Performance Analysis
-- Tools: Excel, MySQL

CREATE DATABASE aapl_stock_market_analysis;
USE aapl_stock_market_analysis;

-- Create table for AAPL stock data
CREATE TABLE aapl_stock_prices(
trade_date DATE,
closing_price DECIMAL(10,2),
daily_return DECIMAL(10,6),
ma_10 DECIMAL(10,2),
ma_20 DECIMAL(10,2),
ma_50 DECIMAL(10,2)
);

-- Preview imported data
SELECT *
FROM aapl_stock_prices
LIMIT 10;

-- Calculate total return over the full analysis period
SELECT 
    ROUND(((last_price.closing_price / first_price.closing_price) - 1) * 100, 2) AS total_return_percent
FROM 
    (SELECT closing_price
     FROM aapl_stock_prices
     ORDER BY trade_date ASC
     LIMIT 1) AS first_price,
    (SELECT closing_price
     FROM aapl_stock_prices
     ORDER BY trade_date DESC
     LIMIT 1) AS last_price;

-- Calculate average daily return
SELECT 
    ROUND(AVG(daily_return) * 100, 2) AS average_daily_return_percent
FROM aapl_stock_prices
WHERE daily_return IS NOT NULL;

-- Calculate volatility using standard deviation of daily returns
SELECT 
    ROUND(STDDEV(daily_return) * 100, 2) AS volatility_percent
FROM aapl_stock_prices
WHERE daily_return IS NOT NULL;

-- Find highest and lowest closing price
SELECT 
    MAX(closing_price) AS highest_price,
    MIN(closing_price) AS lowest_price
FROM aapl_stock_prices;

-- Calculate monthly average closing price
SELECT 
    DATE_FORMAT(trade_date, '%Y-%m') AS month,
    ROUND(AVG(closing_price), 2) AS average_closing_price
FROM aapl_stock_prices
GROUP BY DATE_FORMAT(trade_date, '%Y-%m')
ORDER BY month;

-- Identify best trading day
SELECT 
    trade_date,
    closing_price,
    ROUND(daily_return * 100, 2) AS daily_return_percent
FROM aapl_stock_prices
WHERE daily_return IS NOT NULL
ORDER BY daily_return DESC
LIMIT 1;

-- Identify worst trading day
SELECT 
    trade_date,
    closing_price,
    ROUND(daily_return * 100, 2) AS daily_return_percent
FROM aapl_stock_prices
WHERE daily_return IS NOT NULL
ORDER BY daily_return ASC
LIMIT 1;

-- Count positive, negative, and neutral trading days
SELECT 
    SUM(CASE WHEN daily_return > 0 THEN 1 ELSE 0 END) AS positive_days,
    SUM(CASE WHEN daily_return < 0 THEN 1 ELSE 0 END) AS negative_days,
    SUM(CASE WHEN daily_return = 0 THEN 1 ELSE 0 END) AS neutral_days
FROM aapl_stock_prices
WHERE daily_return IS NOT NULL;

-- Generate moving average trading signals
SELECT 
    trade_date,
    closing_price,
    ma_10,
    ma_50,
    CASE 
        WHEN ma_10 > ma_50 THEN 'Bullish Signal'
        WHEN ma_10 < ma_50 THEN 'Bearish Signal'
        ELSE 'Neutral'
    END AS moving_average_signal
FROM aapl_stock_prices
WHERE ma_10 IS NOT NULL 
  AND ma_50 IS NOT NULL;