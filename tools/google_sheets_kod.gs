/** Google Apps Script web uygulaması: her oyun denemesini Drive'a .docx kaydeder. */
var KLASOR_ID = ''; // İsteğe bağlı: mevcut Drive klasörünün kimliği.
var KLASOR_ADI = 'Yem Laboratuvari Sonuclari';

function doGet() {
  return cikti({ ok: true, mesaj: 'Yem Laboratuvarı sonuç servisi çalışıyor.' });
}
function doPost(e) {
  var kilit = LockService.getScriptLock();
  try {
    kilit.waitLock(30000);
    var d = JSON.parse(e.postData.contents);
    if (!d.gonderimId || !d.ogrenciNo || !d.ad || !d.soyad || typeof d.puan !== 'number') throw new Error('Eksik sonuç bilgisi.');
    var klasor = sonucKlasoru();
    var ad = temizle(d.ogrenciNo + ' - ' + d.ad + ' ' + d.soyad + ' - ' + d.gonderimId) + '.docx';
    var mevcut = klasor.getFilesByName(ad);
    if (mevcut.hasNext()) return cikti({ ok: true, dosya: mevcut.next().getUrl() });
    var belge = DocumentApp.create('Yem Laboratuvarı Sonuç Raporu');
    try {
      var govde = belge.getBody();
      govde.appendParagraph('YEM LABORATUVARI SONUÇ RAPORU').setHeading(DocumentApp.ParagraphHeading.TITLE);
      govde.appendParagraph('Öğrenci: ' + d.ad + ' ' + d.soyad);
      govde.appendParagraph('Öğrenci numarası: ' + d.ogrenciNo);
      govde.appendParagraph('Tarih: ' + (d.tarih || ''));
      govde.appendParagraph('Numune: ' + (d.yem || '') + ' (' + (d.grup || '') + ')');
      govde.appendParagraph('Süre: ' + sureBicimle(d.sureSaniye) + ' | Bitiş: ' + (d.bitis || ''));
      govde.appendParagraph('Toplam puan: ' + d.puan + ' / 100').setHeading(DocumentApp.ParagraphHeading.HEADING1);
      govde.appendParagraph('Puan dökümü').setHeading(DocumentApp.ParagraphHeading.HEADING2);
      (d.detay || []).forEach(function(x) { govde.appendParagraph(x.label + ': ' + x.points + (x.max ? ' / ' + x.max : '')); });
      govde.appendParagraph('Puan kırılan yerler').setHeading(DocumentApp.ParagraphHeading.HEADING2);
      if (!(d.kesintiler || []).length) govde.appendParagraph('Kesinti yok.');
      (d.kesintiler || []).forEach(function(x) { govde.appendParagraph(x.yer + ': −' + x.kayip + ' puan'); });
      govde.appendParagraph('Toplam kesinti: ' + (d.toplamKesinti || 0));
      govde.appendParagraph('Yapılan hatalar (' + (d.hataSayisi || 0) + ')').setHeading(DocumentApp.ParagraphHeading.HEADING2);
      if (!(d.hatalar || []).length) govde.appendParagraph('Hata kaydı yok.');
      (d.hatalar || []).forEach(function(x) { govde.appendParagraph('[' + x.dakika + '] ' + x.asama + ': ' + x.aciklama); });
      belge.saveAndClose();
      var mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      var url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(belge.getId()) + '/export?mimeType=' + encodeURIComponent(mime);
      var yanit = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
      if (yanit.getResponseCode() !== 200) throw new Error('Word dışa aktarımı başarısız: ' + yanit.getResponseCode());
      var dosya = klasor.createFile(yanit.getBlob().setName(ad).setContentType(mime));
      return cikti({ ok: true, dosya: dosya.getUrl() });
    } finally {
      DriveApp.getFileById(belge.getId()).setTrashed(true);
    }
  } catch (hata) {
    return cikti({ ok: false, hata: String(hata) });
  } finally {
    try { kilit.releaseLock(); } catch (yoksay) {}
  }
}
function sonucKlasoru() {
  if (KLASOR_ID) return DriveApp.getFolderById(KLASOR_ID);
  var bulunan = DriveApp.getFoldersByName(KLASOR_ADI);
  return bulunan.hasNext() ? bulunan.next() : DriveApp.createFolder(KLASOR_ADI);
}
function temizle(s) { return String(s).replace(/[\\\/:*?"<>|\[\]]/g, ' ').replace(/\s+/g, ' ').trim(); }
function sureBicimle(sn) { sn = Number(sn) || 0; return Math.floor(sn / 60) + ':' + ('0' + (sn % 60)).slice(-2); }
function cikti(x) { return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON); }
