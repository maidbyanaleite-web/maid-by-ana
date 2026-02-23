import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { Service, Settings } from '../types';

export const generateReceiptPDF = (services: Service[], type: 'single' | 'biweekly' | 'monthly', settings?: Settings) => {
  const doc = new jsPDF() as any;
  const companyName = settings?.company_name || 'Maid By Ana';
  const companySubtitle = settings?.company_subtitle || 'Professional Cleaning Services';
  const companyAddress = settings?.company_address || '';

  const primaryColor = [13, 45, 58]; // Teal 900
  const accentColor = [212, 175, 55]; // Gold 500

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text(companyName, 20, 25);
  
  doc.setFontSize(10);
  doc.text(companySubtitle, 20, 32);
  if (companyAddress) {
    doc.setFontSize(8);
    doc.text(companyAddress, 20, 37);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  const title = type === 'single' ? 'Service Receipt' : type === 'biweekly' ? 'Bi-weekly Report' : 'Monthly Report';
  doc.text(title, 20, 55);

  doc.setFontSize(10);
  doc.text(`Date: ${format(new Date(), 'MM/dd/yyyy')}`, 150, 55);

  const tableData = services.map(s => [
    format(new Date(s.date), 'MM/dd/yyyy'),
    s.client_name || 'N/A',
    s.service_type,
    `$${s.service_value.toFixed(2)}`
  ]);

  doc.autoTable({
    startY: 65,
    head: [['Date', 'Client', 'Service', 'Amount']],
    body: tableData,
    headStyles: { fillColor: primaryColor },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  const total = services.reduce((sum, s) => sum + s.service_value, 0);
  const finalY = (doc as any).lastAutoTable.finalY || 70;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Amount: $${total.toFixed(2)}`, 140, finalY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Thank you for choosing ${companyName}!`, 20, finalY + 30);
  doc.text('For any questions, please contact us.', 20, finalY + 35);

  doc.save(`${companyName.replace(/\s+/g, '')}_Receipt_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
