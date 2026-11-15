/**
 * Clinic backups -> your Google Drive.
 * Paste this into a new Google Apps Script project (script.google.com) in YOUR Google
 * account, set the two Script properties below, and deploy it as a Web app
 * (Execute as: Me, Who has access: Anyone). The nightly GitHub job sends each clinic's
 * daily database copy here, and it is saved in your Drive folder.
 *
 * Script properties (Project Settings > Script properties):
 *   FOLDER_ID   the ID of your Drive folder (the long part of its link after /folders/)
 *   KEY         any long secret phrase; put the same phrase in GitHub as DRIVE_BACKUP_KEY
 *
 * Files older than 90 days in the folder are moved to Drive's trash automatically.
 */
function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var body = JSON.parse(e.postData.contents || '{}');
  if (!props.getProperty('KEY') || body.key !== props.getProperty('KEY')) return reply({ ok: false, error: 'bad key' });
  if (!/^[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.sqlite$/.test(body.name || '')) return reply({ ok: false, error: 'bad name' });
  var folder = DriveApp.getFolderById(props.getProperty('FOLDER_ID'));
  var same = folder.getFilesByName(body.name);
  while (same.hasNext()) same.next().setTrashed(true);
  var blob = Utilities.newBlob(Utilities.base64Decode(body.data), 'application/vnd.sqlite3', body.name);
  var file = folder.createFile(blob);
  var cutoff = Date.now() - 90 * 24 * 3600 * 1000;
  var all = folder.getFiles();
  while (all.hasNext()) { var f = all.next(); if (f.getDateCreated().getTime() < cutoff) f.setTrashed(true); }
  return reply({ ok: true, id: file.getId(), size: file.getSize() });
}
function reply(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
