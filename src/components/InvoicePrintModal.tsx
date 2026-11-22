import React from 'react';
import { InvoiceRecord } from '../types';
import { Printer, X, CheckCircle2, ShieldCheck } from 'lucide-react';

interface InvoicePrintModalProps {
  invoice: InvoiceRecord;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ invoice, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[92dvh] flex flex-col bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Modal Top Actions (Hidden in print) */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading font-bold text-xs sm:text-sm tracking-wide">Official Accounting Invoice & Receipt</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
              Verified
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-5 sm:p-10 space-y-6 sm:space-y-8 font-sans overflow-y-auto print:overflow-visible">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b pb-5 sm:pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-2xl tracking-wider text-slate-950">
                  M R S
                </span>
                <span className="text-xs font-mono font-semibold text-cyan-600 px-1.5 py-0.5 rounded border border-cyan-300">
                  OPERATIONS
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Automate. Deliver. Grow.
              </p>
              <p className="text-xs text-slate-500">
                Contact: mr216873@gmail.com · Dhaka, Bangladesh
              </p>
            </div>

            <div className="sm:text-right">
              <span className="font-mono text-xs uppercase tracking-wider text-slate-400 font-bold block">
                INVOICE & RECEIPT
              </span>
              <div className="font-mono text-sm sm:text-base font-bold text-slate-900 mt-0.5 break-all">
                {invoice.invoiceNumber}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Date: {new Date(invoice.issuedDate || invoice.issuedAt || Date.now()).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Client & Remittance Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-xs">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Billed To
              </span>
              <div className="font-bold text-slate-900 text-sm">{invoice.clientName}</div>
              <div className="font-mono text-xs text-cyan-700 font-semibold">{invoice.clientId}</div>
              {invoice.clientEmail && <div className="text-slate-600 break-all">{invoice.clientEmail}</div>}
            </div>

            <div className="sm:text-right min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Remittance Verification
              </span>
              <div className="text-slate-700">Order: <strong className="font-mono text-slate-900">{invoice.orderId}</strong></div>
              <div className="text-slate-700">Ref: <strong className="font-mono text-slate-900">{invoice.reference}</strong></div>
              <div className="text-slate-700">Method: <strong>{invoice.method}</strong></div>
              <div className="text-slate-700 font-mono text-[11px] break-all">TrxID: <strong className="text-emerald-700">{invoice.trxId}</strong></div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[360px]">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-600">
                  <th className="py-2 text-left font-bold uppercase tracking-wider">Item & Deliverable Scope</th>
                  <th className="py-2 text-right font-bold uppercase tracking-wider">Amount (USD)</th>
                  <th className="py-2 text-right font-bold uppercase tracking-wider">Amount (BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 text-slate-800 font-medium">{item.description}</td>
                    <td className="py-3 text-right font-mono font-semibold whitespace-nowrap">${item.amountUSD} USD</td>
                    <td className="py-3 text-right font-mono font-semibold whitespace-nowrap">{item.amountBDT.toLocaleString()} TK</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900">
                  <td className="pt-3 font-bold text-slate-900 uppercase">Total Settled</td>
                  <td className="pt-3 text-right font-mono font-bold text-base text-slate-950 whitespace-nowrap">${invoice.amountUSD} USD</td>
                  <td className="pt-3 text-right font-mono font-bold text-base text-emerald-700 whitespace-nowrap">{invoice.amountBDT.toLocaleString()} TK</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Official Verification Seal */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div>PAYMENT VERIFIED & SETTLED</div>
                <div className="text-[11px] text-emerald-700 font-normal">Audit statement verified by owner desk (mr216873@gmail.com).</div>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="font-mono text-[10px] text-slate-500 uppercase">M R S Digital Operations</div>
              <div className="font-mono text-[10px] text-slate-500">Security Clearance Level 1</div>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 pt-4 border-t">
            This is an official computer-generated receipt issued by M R S Platform. No physical signature required.
          </div>

        </div>

      </div>
    </div>
  );
};
