/**
 * Weather-Based Location Bid Adjustments Script for MCC - Combined Search and Shopping
 * 
 * This script reads precipitation data from a Google Sheet and applies
 * location bid adjustments across all ENABLED Search and Shopping campaigns
 * in MCC accounts labeled with a specific label. It skips campaigns with no manually-set geo targets.
 *
 * Author: Thomas McCullough
 */

const CONFIG = {
  SHEET_URL: "YOUR_SHEET_URL",
  SHEET_NAME: "GeoTargetMapping",
  ACCOUNT_LABEL: "Weather-Based Bidding",
  PRECIPITATION_THRESHOLD: 0.10,
  BID_MODIFIER_IF_WET: -0.25, //Adjust As Needed
  BID_MODIFIER_IF_DRY: 0.0,
};

function main() {
  const accounts = MccApp.accounts()
    .withCondition(`LabelNames CONTAINS '${CONFIG.ACCOUNT_LABEL}'`)
    .get();

  if (!accounts.hasNext()) {
    Logger.log(`No accounts found with label: ${CONFIG.ACCOUNT_LABEL}`);
    return;
  }

  const sheet = SpreadsheetApp.openByUrl(CONFIG.SHEET_URL).getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error(`Sheet '${CONFIG.SHEET_NAME}' not found.`);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const geoCodeIndex = headers.indexOf('Geo Target Code');
  const precipIndex = headers.indexOf('Percipitation');
  const bidIndex = headers.indexOf('Bid Adjustments');

  if (geoCodeIndex === -1 || precipIndex === -1 || bidIndex === -1) {
    throw new Error('Missing required columns: Geo Target Code, Percipitation, or Bid Adjustments');
  }

  const geoBidMap = {};
  for (let i = 1; i < data.length; i++) {
    const geoCode = data[i][geoCodeIndex];
    const precip = parseFloat(data[i][precipIndex]);
    if (!geoCode || isNaN(precip)) continue;
    const modifier = precip > CONFIG.PRECIPITATION_THRESHOLD ? CONFIG.BID_MODIFIER_IF_WET : CONFIG.BID_MODIFIER_IF_DRY;
    geoBidMap[geoCode] = modifier;
    data[i][bidIndex] = modifier;
  }

  let totalCampaigns = 0;
  let updatedCampaigns = 0;

  while (accounts.hasNext()) {
    const account = accounts.next();
    MccApp.select(account);
    Logger.log(`\n>>> Processing account: ${account.getCustomerId().replace(/-/g, '')}`);

    const campaignSources = [
      AdsApp.campaigns()
        .withCondition("Status = 'ENABLED'")
        .withCondition("AdvertisingChannelType = 'SEARCH'")
        .get(),
      AdsApp.shoppingCampaigns()
        .withCondition("Status = 'ENABLED'")
        .get()
    ];

    for (let campaigns of campaignSources) {
      while (campaigns.hasNext()) {
        const campaign = campaigns.next();

        Logger.log(`Campaign: ${campaign.getName()}`);

        totalCampaigns++;
        const locations = campaign.targeting().targetedLocations().get();
        const locationCount = locations.totalNumEntities();
        Logger.log(`${campaign.getName()} has ${locationCount} targeted locations.`);

        if (locationCount === 0) {
          Logger.log(`No targeted locations found for campaign: ${campaign.getName()}`);
          continue;
        }

        let modified = false;

        while (locations.hasNext()) {
          const location = locations.next();
          const geoCode = location.getId();
          Logger.log(`Checking geo ID ${geoCode} in campaign: ${campaign.getName()}`);

          if (geoBidMap.hasOwnProperty(geoCode)) {
            Logger.log(`Match found for geo ID ${geoCode}. Attempting bid update...`);
            const bidModifier = geoBidMap[geoCode];
            try {
              location.setBidModifier(bidModifier + 1);
              modified = true;
              Logger.log(`Campaign: ${campaign.getName()} | Geo: ${geoCode} | Set to: ${bidModifier * 100}%`);
            } catch (e) {
              Logger.log(`Error updating ${geoCode} in '${campaign.getName()}': ${e.message}`);
            }
          }
        }

        if (modified) updatedCampaigns++;
      }
    }
  }

  sheet.getRange(2, bidIndex + 1, data.length - 1, 1)
    .setValues(data.slice(1).map(row => [row[bidIndex]]));

  Logger.log(`\nScript execution completed.`);
  Logger.log(`Total Search & Shopping Campaigns Checked: ${totalCampaigns}`);
  Logger.log(`Total Campaigns Updated: ${updatedCampaigns}`);
}
