import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client } from '../types';
import { format } from 'date-fns';

export const generateReceipt = (client: Client, date: string, amount: number) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(0, 77, 77); // Petrol
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('Maid By Ana', 105, 25, { align: 'center' });
  
  doc.setTextColor(212, 175, 55); // Gold
  doc.setFontSize(12);
  doc.text('Professional Cleaning Services', 105, 32, { align: 'center' });

  // Content
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.text('RECEIPT', 20, 55);
  
  doc.setFontSize(10);
  doc.text(`Date: ${format(new Date(), 'MM/dd/yyyy')}`, 150, 55);

  autoTable(doc, {
    startY: 65,
    head: [['Description', 'Details']],
    body: [
      ['Client', client.name],
      ['Service Date', date],
      ['Service Type', client.serviceType.toUpperCase()],
      ['Address', client.address],
      ['Payment Method', client.paymentMethod.toUpperCase()],
      ['Status', 'Paid'],
      ['Total Amount', `$${amount.toFixed(2)}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [0, 77, 77] },
  });

  doc.setFontSize(12);
  doc.text('Thank you for your business!', 105, doc.internal.pageSize.height - 30, { align: 'center' });
  
  doc.save(`Receipt_${client.name}_${date}.pdf`);
};

export const generateBatchReceipt = (client: Client, dates: string[], totalAmount: number, period: string) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(0, 77, 77);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('Maid By Ana', 105, 25, { align: 'center' });
  
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(12);
  doc.text(`${period} Cleaning Summary`, 105, 32, { align: 'center' });

  // Content
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.text('SUMMARY RECEIPT', 20, 55);
  
  doc.setFontSize(10);
  doc.text(`Client: ${client.name}`, 20, 65);
  doc.text(`Address: ${client.address}`, 20, 70);
  doc.text(`Payment Method: ${client.paymentMethod.toUpperCase()}`, 20, 75);
  doc.text(`Status: Paid`, 20, 80);

  autoTable(doc, {
    startY: 90,
    head: [['Service Date', 'Service Type', 'Amount']],
    body: dates.map(date => [
      date,
      client.serviceType.toUpperCase(),
      `$${(totalAmount / dates.length).toFixed(2)}`
    ]),
    foot: [['', 'TOTAL', `$${totalAmount.toFixed(2)}`]],
    theme: 'grid',
    headStyles: { fillColor: [0, 77, 77] },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
  });

  doc.save(`Receipt_${client.name}_${period}.pdf`);
};
