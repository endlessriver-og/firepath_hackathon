import * as Print from 'expo-print';

// Native: hand the sheet to the system print dialog (AirPrint / Android print service).
export async function printHtml(html) {
  await Print.printAsync({ html });
}
