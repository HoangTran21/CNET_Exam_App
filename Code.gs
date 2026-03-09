/**
 * Google Apps Script - CNET Exam File Receiver
 * 
 * Chức năng: Nhận bài thi từ web app và lưu vào Google Drive
 * 
 * Hướng dẫn setup:
 * 1. Thay FOLDER_ID bằng ID folder Drive của bạn
 * 2. Deploy as Web App: Execute as "Me", Who has access "Anyone"
 * 3. Copy Web App URL và paste vào script.js
 */

// ============== CẤU HÌNH ==============
const FOLDER_ID = "PASTE_FOLDER_ID_CUA_BAN_VAO_DAY"; // VD: "1AW6BtY_lHC8y8gr72_npDcnzASN_LPz8"
const SUBMIT_SECRET = "cnet_secret_2026"; // Phải trùng với secret trong script.js
// ======================================

/**
 * Xử lý OPTIONS request cho CORS preflight
 */
function doOptions() {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * Xử lý POST request từ web app
 */
function doPost(e) {
  try {
    // Parse JSON body
    const body = JSON.parse(e.postData.contents || "{}");

    // Kiểm tra secret để chặn spam/unauthorized access
    if (body.secret !== SUBMIT_SECRET) {
      Logger.log("Unauthorized access attempt");
      return jsonResponse({ 
        ok: false, 
        error: "Unauthorized - Invalid secret" 
      });
    }

    // Lấy dữ liệu từ body
    const fileName = body.fileName || `nop_bai_${Date.now()}.doc`;
    const htmlContent = body.htmlContent || "";
    const payload = body.payload || {};

    // Validate folder ID
    if (!FOLDER_ID || FOLDER_ID === "PASTE_FOLDER_ID_CUA_BAN_VAO_DAY") {
      return jsonResponse({ 
        ok: false, 
        error: "FOLDER_ID chưa được cấu hình trong Apps Script" 
      });
    }

    // Lấy folder trong Drive
    let folder;
    try {
      folder = DriveApp.getFolderById(FOLDER_ID);
    } catch (err) {
      return jsonResponse({ 
        ok: false, 
        error: "Không tìm thấy folder. Kiểm tra lại FOLDER_ID." 
      });
    }

    // Tạo file Word (HTML format)
    const blob = Utilities.newBlob(
      htmlContent, 
      "application/msword", 
      fileName
    );
    const docFile = folder.createFile(blob);

    // Tạo file JSON kèm theo để xem nhanh
    const jsonFileName = fileName.replace(/\.doc$/, ".json");
    const jsonContent = JSON.stringify({
      ...payload,
      uploadedAt: new Date().toISOString(),
      fileId: docFile.getId()
    }, null, 2);
    
    const jsonFile = folder.createFile(
      Utilities.newBlob(
        jsonContent,
        MimeType.PLAIN_TEXT,
        jsonFileName
      )
    );

    // Log thành công
    Logger.log(`Successfully saved: ${fileName} for ${payload.name || 'Unknown'}`);

    // Trả về kết quả thành công
    return jsonResponse({
      ok: true,
      fileId: docFile.getId(),
      fileName: docFile.getName(),
      url: docFile.getUrl(),
      jsonUrl: jsonFile.getUrl(),
      submittedAt: payload.submittedAt,
      studentName: payload.name,
      score: payload.score
    });

  } catch (err) {
    Logger.log("Error in doPost: " + err.toString());
    return jsonResponse({ 
      ok: false, 
      error: err.toString() 
    });
  }
}

/**
 * Tạo JSON response với CORS headers
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * Test function - chạy để kiểm tra FOLDER_ID có đúng không
 */
function testFolderAccess() {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log("✓ Folder found: " + folder.getName());
    Logger.log("✓ Folder URL: " + folder.getUrl());
    return true;
  } catch (err) {
    Logger.log("✗ Error accessing folder: " + err.toString());
    Logger.log("✗ Check your FOLDER_ID: " + FOLDER_ID);
    return false;
  }
}
