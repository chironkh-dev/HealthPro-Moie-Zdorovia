// Re-exports for export feature.
import { exportReportCSV as _exportReportCSV } from './csv.js';
import { exportPDF as _exportPDF } from './pdf.js';
import { printReportPeriod as _printReportPeriod } from './print.js';
import { getExportMeasurements as _getExportMeasurements, closeExportModal as _closeExportModal, getReportSections as _getReportSections, getExportFormat as _getExportFormat } from './modal.js';
import { generateDoctorReport as _generateDoctorReport, generateReportBlob as _generateReportBlob } from './pdf-report.js';
import { download as _platformDownload } from '../../core/platform.js';
import { state, showToast } from '../../core/state.js';
import { t } from '../../i18n/index.js';

export { exportData, exportCSV, importData } from './csv.js';
export { exportBackup, openBackupFile, restoreBackup, getBackupStats } from './backup.js';
export { setShowPage as setPDFShowPage } from './pdf.js';
export { openExportModal, closeExportModal, selectExportPeriod, getExportMeasurements, updateExportCount, getExportPeriod, getReportSections, toggleReportSection, selectExportFormat, getExportFormat } from './modal.js';

// Wrappers used by the action dispatcher in app.js.
// They wire `getExportMeasurements` into the CSV exporter and close the export
// modal automatically once the user action is initiated/completed.
export function exportReportCSV() {
  try {
    _exportReportCSV(_getExportMeasurements);
  } finally {
    _closeExportModal();
  }
}

export async function exportPDF() {
  try {
    await _exportPDF();
  } finally {
    _closeExportModal();
  }
}

export function printReportPeriod() {
  try {
    _printReportPeriod();
  } finally {
    _closeExportModal();
  }
}

export async function generateDoctorReport() {
  const format       = _getExportFormat();
  const measurements = _getExportMeasurements();
  const sections     = _getReportSections();
  _closeExportModal();
  try {
    if (format === 'csv') {
      _exportReportCSV(() => measurements);
    } else {
      await _generateDoctorReport(measurements, sections);
    }
  } catch (e) {
    console.error('[generateDoctorReport]', e);
  }
}

export async function shareReport() {
  const format       = _getExportFormat();
  const measurements = _getExportMeasurements();
  const sections     = _getReportSections();
  _closeExportModal();
  try {
    if (format === 'csv') {
      // CSV share: generate then share via native share sheet
      _exportReportCSV(() => measurements);
    } else {
      // PDF share: generate blob then share (not just download)
      const result = await _generateReportBlob(measurements, sections);
      if (result && result.blob && result.filename) {
        await _platformDownload(result.filename, result.blob, 'application/pdf');
        showToast(t('e-share-report-done') || '✓ Звіт відправлено!');
      } else {
        await _generateDoctorReport(measurements, sections);
      }
    }
  } catch (e) {
    console.error('[shareReport]', e);
    // fallback to normal download
    try {
      if (format === 'pdf') await _generateDoctorReport(measurements, sections);
      else _exportReportCSV(() => measurements);
    } catch { /* ignore */ }
  }
}
