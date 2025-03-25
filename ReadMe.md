# Bid By Weather

This project automates bid adjustments in Google Ads at the MCC (Manager Account) level based on real-time weather data. It consists of two scripts:

- **`Import_Weather.js`** (Google Apps Script) — Fetches precipitation data from WeatherAPI and stores it in a Google Sheet.
- **`Weather_Based_Bidding_Script.js`** (Google Ads Script) — Reads precipitation data from the sheet and applies bid adjustments based on weather conditions across all labeled accounts in an MCC account.

## Setup Instructions

### 1. Google Sheets & Apps Script

#### Step 1: Create a Google Sheet
1. Open [Google Sheets](https://docs.google.com/spreadsheets/).
2. Create a new sheet by making a copy of this template: [Bid By Weather Sheet](https://docs.google.com/spreadsheets/d/1vhQ4_1IhdKygCVVvUMFGjAw8z3A1mSJRv9_HToAuVmw/copy).
3. Add the following column headers in row 1:
   - `ZIP Code` (Column A)
   - `Geo Target Code` (Column B)
   - `Precipitation` (Column C)

#### Step 2: Add Google Apps Script
1. In your Google Sheet, go to **Extensions > Apps Script**.
2. Delete any default code and paste the contents of `Import_Weather.js`.
3. Replace `apiKey` with your own WeatherAPI key.
4. Click the disk icon to save the script.
5. Run the function `getPrecipitationWithRestart` to fetch weather data.
6. Set a trigger to run this function daily at 10 AM and 5 PM.

### 2. Google Ads Script Setup

#### Step 1: Add the Script to Google Ads
1. Go to [Google Ads](https://ads.google.com/) and sign in.
2. Click **Tools & Settings > Scripts**.
3. Click the **+** button to create a new script.
4. Copy and paste the contents of `Weather_Based_Bidding_Script.js`.
5. Replace `SHEET_URL` with the URL of your Google Sheet.
6. Save and authorize the script.
7. Click **Run** to execute it.

### 3. How It Works
1. The **Apps Script** fetches precipitation data and updates the Google Sheet.
2. The **Google Ads Script** reads this data and applies bid adjustments to campaigns labeled `Weather-Based Bidding` across all MCC accounts.
3. If precipitation is **above 0.10 inches**, bids are reduced by **25%**.
4. If precipitation is **below 0.10 inches**, no adjustment is made.

### 4. Troubleshooting
- Ensure your Google Sheet URL is correctly set in `Weather_Based_Bidding_Script.js`.
- Check API limits for WeatherAPI to avoid rate limiting.
- Verify triggers in Apps Script to ensure data updates regularly.

## License
This project is open-source. Feel free to modify and adapt it to your needs.

