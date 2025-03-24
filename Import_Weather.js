function getPrecipitationWithRestart() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("WeatherData"); // Target "Sheet2"
  
  var apiKey = "YOUR_API_KEY"; // Your WeatherAPI Key
  var baseUrl = "http://api.weatherapi.com/v1/current.json";

  var zipCodes = sheet.getRange("A2:A" + sheet.getLastRow()).getValues().flat(); // Read ZIP codes
  zipCodes = zipCodes.filter(zip => zip && !isNaN(zip)); // Remove empty & non-numeric values

  if (zipCodes.length === 0) {
    Logger.log("No valid ZIP codes found. Exiting script.");
    return;
  }

  var batchSize = 50; // Process 50 ZIP codes at a time
  var sleepTime = 1000; // 1 second delay between batches

  // Track last processed row
  var lastProcessedCell = sheet.getRange("E1"); // Stores the last processed row
  var lastProcessed = Number(lastProcessedCell.getValue()) || 2; // Default to row 2 if empty

  Logger.log(`🔹 Total ZIP Codes: ${zipCodes.length}`);
  Logger.log(`⏳ Resuming from row: ${lastProcessed}`);

  var output = [];
  var startTime = new Date().getTime(); // Start time for execution tracking

  for (var i = lastProcessed - 2; i < zipCodes.length; i += batchSize) {
    var batch = zipCodes.slice(i, i + batchSize);
    var urls = batch.map(zip => `${baseUrl}?key=${apiKey}&q=${zip.toString()}`);

    Logger.log(`Sending batch from row ${i + 2} to ${i + batchSize + 2}...`);

    try {
      var responses = UrlFetchApp.fetchAll(urls); // Send batch requests
      responses.forEach((response, index) => {
        var zip = batch[index];

        try {
          var data = JSON.parse(response.getContentText());
          Logger.log(`Response for ZIP ${zip}: ${JSON.stringify(data)}`);

          output.push([data.current?.precip_in ?? "Error"]);
        } catch (e) {
          Logger.log(`Parsing Error for ZIP ${zip}: ${e}`);
          output.push(["Error"]);
        }
      });
    } catch (e) {
      Logger.log(`Batch Request Failed: ${e}`);
      batch.forEach(() => output.push(["Error"]));
    }

    // Write precipitation values to Column D
    sheet.getRange(i + 2, 4, output.length, 1).setValues(output);
    output = []; // Reset output for next batch

    lastProcessedCell.setValue(i + batchSize + 2); // Save last processed row
    Logger.log(`Saved progress at row ${i + batchSize + 2}`);

    // Add delay to avoid API rate limits
    Logger.log("⏳ Waiting 1 second before next batch...");
    Utilities.sleep(sleepTime);

    // **Check Execution Time** (If near limit, stop and restart)
    var elapsedTime = new Date().getTime() - startTime;
    if (elapsedTime > 300000) { // If execution is close to 5 minutes, stop
      Logger.log("Execution time limit reached. Setting trigger to restart script...");
      createRestartTrigger();
      return; // Exit script early to restart later
    }
  }

  // **If all ZIP codes are processed, remove the restart trigger**
  Logger.log("All ZIP codes processed! Removing restart trigger...");
  deleteTriggers();

  // Reset last processed row
  lastProcessedCell.setValue(2);
  Logger.log("Process complete. Resetting last processed row.");

  // Reset last processed row
lastProcessedCell.setValue(2);
Logger.log("Process complete. Resetting last processed row.");

// Create next daily trigger if needed
ensureDailyTriggers();

}

// **🔹 Helper Function: Create Restart Trigger**
function createRestartTrigger() {
  deleteTriggers(); // Delete existing triggers before creating a new one

  Logger.log("Creating new time-based trigger...");
  ScriptApp.newTrigger("getPrecipitationWithRestart")
    .timeBased()
    .after(15000) // Restart in 15 seconds
    .create();

  Logger.log("Restart trigger set for 15 seconds.");
}

// **🔹 Helper Function: Delete Old Triggers**
function deleteTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === "getPrecipitationWithRestart") {
      ScriptApp.deleteTrigger(trigger);
      Logger.log("🗑 Deleted old restart trigger.");
    }
  });
}

function ensureDailyTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  const existingTimes = triggers
    .filter(t => t.getHandlerFunction() === "getPrecipitationWithRestart")
    .map(t => t.getTriggerSourceId?.()); // Doesn't give time, but we can count them

  const now = new Date();
  const hour = now.getHours();

  const alreadyHas10am = triggers.some(t =>
    t.getHandlerFunction() === "getPrecipitationWithRestart" &&
    t.getEventType() === ScriptApp.EventType.CLOCK &&
    t.getUniqueId() &&
    t.getTriggerSourceId?.() // can't access time, so we just limit to 2 total
  );

  const count = triggers.filter(t => t.getHandlerFunction() === "getPrecipitationWithRestart").length;

  // If total restart triggers are less than 2, we may need to add one
  if (count < 2) {
    if (hour >= 10 && hour < 11) {
      Logger.log("After 10 AM run: Ensuring 5 PM trigger exists...");
      ScriptApp.newTrigger("getPrecipitationWithRestart")
        .timeBased()
        .atHour(17)
        .everyDays(1)
        .create();
      Logger.log("Created 5 PM daily trigger.");
    } else if (hour >= 17 && hour < 18) {
      Logger.log("After 5 PM run: Ensuring 10 AM trigger exists...");
      ScriptApp.newTrigger("getPrecipitationWithRestart")
        .timeBased()
        .atHour(10)
        .everyDays(1)
        .create();
      Logger.log("Created 10 AM daily trigger.");
    } else {
      Logger.log("Outside 10–11AM or 5–6PM, not creating daily triggers.");
    }
  } else {
    Logger.log("Daily triggers already in place.");
  }
}
