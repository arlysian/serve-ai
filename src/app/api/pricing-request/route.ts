import { NextResponse } from "next/server";
import { google } from "googleapis";
import { readFileSync } from "fs";
import { join } from "path";

export async function POST(req: Request) {
  try {
    const { companyName, email, phone } = await req.json();

    // Validate required fields
    if (!companyName || !email) {
      return NextResponse.json(
        { error: "Company name and email are required" },
        { status: 400 }
      );
    }

    // Validate Google Sheets configuration
    if (!process.env.GOOGLE_SHEET_ID) {
      console.error("Google Sheets configuration missing: GOOGLE_SHEET_ID");
      return NextResponse.json(
        { error: "Service not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Get credentials from environment variable or file
    let credentials;
    if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
      // Try to parse from environment variable
      try {
        credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
      } catch (parseError) {
        console.error("Failed to parse Google Sheets credentials from env:", parseError);
        return NextResponse.json(
          { error: "Invalid service configuration." },
          { status: 500 }
        );
      }
    } else if (process.env.GOOGLE_SHEETS_CREDENTIALS_PATH) {
      // Try to read from file path
      try {
        const credentialsPath = join(process.cwd(), process.env.GOOGLE_SHEETS_CREDENTIALS_PATH);
        const credentialsFile = readFileSync(credentialsPath, "utf8");
        credentials = JSON.parse(credentialsFile);
      } catch (fileError) {
        console.error("Failed to read Google Sheets credentials file:", fileError);
        return NextResponse.json(
          { error: "Invalid service configuration." },
          { status: 500 }
        );
      }
    } else {
      console.error("Google Sheets credentials not found. Set GOOGLE_SHEETS_CREDENTIALS or GOOGLE_SHEETS_CREDENTIALS_PATH");
      return NextResponse.json(
        { error: "Service not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Authenticate with Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Prepare the row data
    const timestamp = new Date().toISOString();
    const rowData = [
      timestamp, // Timestamp
      companyName, // Company Name
      email, // Email
      phone || "", // Phone (empty string if not provided)
    ];

    // Append data to the sheet
    let sheetName = process.env.GOOGLE_SHEET_NAME || "Sheet1";
    
    // Get spreadsheet metadata to find the correct sheet
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
    });
    
    // Find the sheet by name to get its properties
    let targetSheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );
    
    // If sheet not found, try to use the first sheet as fallback
    if (!targetSheet) {
      const availableSheets = spreadsheet.data.sheets?.map(s => s.properties?.title).join(", ") || "none";
      console.warn(`Sheet "${sheetName}" not found. Available sheets: ${availableSheets}. Using first available sheet.`);
      targetSheet = spreadsheet.data.sheets?.[0];
      if (targetSheet?.properties?.title) {
        sheetName = targetSheet.properties.title;
      }
    }
    
    if (!targetSheet) {
      throw new Error(`No sheets found in spreadsheet`);
    }
    
    // Use the actual sheet name from the properties
    const actualSheetName = targetSheet.properties?.title || sheetName;
    
    // Build the range using proper A1 notation
    // For sheet names with spaces, we need to wrap in single quotes
    // Format: 'Sheet Name'!A1 or SheetName!A1
    let range: string;
    if (actualSheetName.includes(" ") || actualSheetName.includes("'") || actualSheetName.includes("!")) {
      // Escape single quotes by doubling them, then wrap entire name in single quotes
      const escaped = actualSheetName.replace(/'/g, "''");
      range = `'${escaped}'!A1`;
    } else {
      range = `${actualSheetName}!A1`;
    }
    
    console.log("Sheet name:", actualSheetName);
    console.log("Using range:", range);
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [rowData],
      },
    });

    return NextResponse.json(
      { success: true, message: "Pricing request submitted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving pricing request to Google Sheets:", error);
    return NextResponse.json(
      { error: "Failed to submit pricing request. Please try again later." },
      { status: 500 }
    );
  }
}
