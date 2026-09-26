import * as Print from 'expo-print';
import { Platform } from 'react-native';

// Native: hand the sheet to the system print dialog (AirPrint / Android print service).
export async function printHtml(html) {
  if (Platform.OS === 'web') {
    // expo-print's web fallback prints the app window. Use an isolated document.
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden';
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => frame.remove(), 60000);
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
    return;
  }
  await Print.printAsync({ html });
}
