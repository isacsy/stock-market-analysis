# Isabel Chong Sui Ying � Financial Analysis Portfolio

Hello and welcome.
This is my personal financial analysis portfolio, where I showcase my projects related to finance, business and data-driven insights.

## About Me
My name is Isabel Chong Sui Ying, and I was born and raised in Sabah, Malaysia.

I am currently pursuing a Bachelor�s Degree in Finance at Universiti Tunku Abdul Rahman(UTAR), Kampar, Perak, Malaysia. 

I am particularly interested in areas related to:
- Business & Financial Analytics 
- Data-driven decision making

Language spoken: 
- English (Upper-Intermediate)
- Chinese (Native)
- Malay (Intermediate)

Contact:
- LinkedIn: www.linkedin.com/in/isabel-chong-a42459289
- E-Mail: itzisacsy@gmail.com
- GitHub: https://github.com/isacsy

# About this project - stock-market-analysis
This project analyzes the stock performance of Apple Inc. (AAPL) over a one-year period from April 2025 to April 2026. The aim is to evaluate return, risk, and price trends to assess Apple�s attractiveness as an investment.
The analysis focuses on transforming raw stock price data into meaningful financial insights using data analysis techniques.


## Apple Inc. (AAPL) Stock Performance & Risk Analysis (Apr 2025 � Apr 2026)


## Objective
The objective of this project is to identify and analyze the performance of Apple Inc. (AAPL) over a one year period (24 Apr 2025 � 24 Apr 2026)using historical stock price data. The focus is to understand return, risk, and overall price trends over the year.


## Dataset
- Data Source: Yahoo Finance & Investing.com  
- Period: 24 April 2025 � 24 April 2026  
- Frequency: Daily  
- Main variable data: Closing Price  


## Methodology
Several basic yet important financial metrics were calculated:

- **Daily Return**  
  To measure how much the closing price changes from day to day.

- **Average Daily Return**  
  To measure the overall average growth of the stock.

- **Total Return**  
  To measure the overall gain or loss over the year.

- **Volatility (Standard Deviation)**  
  To measure how much the price fluctuates, which indicates the risk.

- **10-Day Moving Average**  
  TO help smooth out daily fluctuations and makes the trend easier to read.


## Key Findings
- Apple had an overall **increment in price** across the year, resulting in a total return of around 30%.  
- The **average daily return** is **positive**, showing a stable growth over the year.  
- The **volatility is moderate**, meaning the stock does fluctuate, but not excessively.  
- The stock showed a **clear upward growing trend** during **mid to late 2025**, followed by a dip in early 2026 before recovering again.  
- The moving average helps confirm the general trend by reducing short-term distractions.


## Visualization (?? Interactive Dashboard)
?? View the full interactive dashboard here: https://public.tableau.com/shared/P2NKG5J54?:display_count=n&:origin=viz_share_link


## Conclusion
In conclusion, Apple�s stock performed well during the year, with stable growth and moderate risk. Although there are short-term fluctuations of the closing price, the general trend still remains positive, which means that the stock is relatively stable in the long run.


## Tools Used
- Microsoft Excel (Data Cleaning)
- MySQL (Data Storage & Query-based Analysis)
- Tableau (Data Visualization & Dashboard)
- GitHub  


# News Feed App

A self-updating news feed that scans for stories relevant to my finance work and interests — Apple (AAPL), the stock market, business & financial analytics, and Malaysia's economy — and keeps them all in one place.

- **`docs/`** — the web app. Open `docs/index.html` (or enable GitHub Pages on this repo pointed at `/docs`) to browse the feed, search headlines, and filter by topic.
- **`scripts/fetch_news.py`** — pulls the latest stories per topic from Google News and finance RSS feeds, dedupes them, and writes `docs/data/news.json`.
- **`scripts/config.json`** — the list of topics/keywords to track. Edit this to add or change interests.
- **`.github/workflows/update-news.yml`** — a GitHub Action that runs the fetch script every 3 hours and commits any changes, so the feed refreshes automatically with no server to maintain.

To enable the live site: repo **Settings → Pages → Deploy from a branch → `main` / `docs`**. The Action needs no setup — it starts running on this schedule as soon as it's merged to the default branch (scheduled workflows only fire from the repo's default branch).

To run it locally:
```bash
pip install requests
python3 scripts/fetch_news.py   # writes docs/data/news.json
python3 -m http.server 8000 --directory docs
```

