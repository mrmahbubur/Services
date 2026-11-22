import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  getServicePageUrl,
  getServiceShortUrl,
  getServiceOrderUrl,
  getQrCodeUrl,
} from '../utils/serviceLinks';
import {
  Copy,
  Check,
  Download,
  QrCode,
  ExternalLink,
  Share2,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
} from 'lucide-react';

export const ShareKitTab: React.FC = () => {
  const { services, settings, theme, showToast } = useApp();
  const isDark = theme === 'dark';

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [qrModalService, setQrModalService] = useState<{ id: string; name: string; url: string } | null>(null);

  const siteBase = settings.siteBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Copied to Clipboard', text, 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyAllLinksText = () => {
    const lines = services.map((s) => {
      const pageLink = getServicePageUrl(siteBase, s.slug);
      const shortLink = getServiceShortUrl(siteBase, s.serviceId);
      const orderLink = getServiceOrderUrl(siteBase, s.serviceId);
      return `[${s.serviceId}] ${s.name} (${s.rateUSD})\n- Page: ${pageLink}\n- Short: ${shortLink}\n- Order: ${orderLink}\n`;
    });

    const fullText = `M R S Professional Services & Automation — Official Share Kit\n=======================================================\n\n` + lines.join('\n');
    navigator.clipboard.writeText(fullText);
    showToast('Exported All Links', 'Full text summary copied to clipboard.', 'success');
  };

  const handleExportCsv = () => {
    const headers = ['ServiceID', 'Name', 'Category', 'RateUSD', 'PageURL', 'ShortURL', 'OrderURL', 'ViewCount', 'OrderCount'];
    const rows = services.map((s) => [
      `"${s.serviceId}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.category}"`,
      `"${s.rateUSD}"`,
      `"${getServicePageUrl(siteBase, s.slug)}"`,
      `"${getServiceShortUrl(siteBase, s.serviceId)}"`,
      `"${getServiceOrderUrl(siteBase, s.serviceId)}"`,
      s.viewCount || 0,
      s.orderCount || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MRS_Services_Share_Kit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV Exported', 'Share Kit CSV downloaded.', 'success');
  };

  const filtered = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.serviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Export Actions */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h3 className="font-heading font-bold text-lg">Permanent Service IDs & Share Kit</h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/30">
              16 Permanent IDs
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Canonical URLs, short links (<code className="text-cyan-400">/s/S-MRS-XX</code>), direct order links, and QR codes ready for proposals & profiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAllLinksText}
            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              isDark ? 'bg-[#16233B] border-[#22314D] text-slate-200 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Copy All as Text</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Service ID (e.g. S-MRS-06) or name..."
            className={`w-full rounded-xl pl-9 pr-3 py-2 border font-mono ${
              isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['All', 'M R S Services', 'Gravatar Services', 'M R S IPTV'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl border text-nowrap font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                  : isDark
                  ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Table */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[11px] font-mono uppercase tracking-wider ${
              isDark ? 'bg-[#16233B] border-[#22314D] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <tr>
                <th className="py-3 px-4">Service ID</th>
                <th className="py-3 px-4">Service Name</th>
                <th className="py-3 px-4">Canonical Page Link</th>
                <th className="py-3 px-4">Short Link</th>
                <th className="py-3 px-4">Direct Order Link</th>
                <th className="py-3 px-3 text-center">QR</th>
                <th className="py-3 px-3 text-right">Views / Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono">
              {filtered.map((s) => {
                const pageUrl = getServicePageUrl(siteBase, s.slug);
                const shortUrl = getServiceShortUrl(siteBase, s.serviceId);
                const orderUrl = getServiceOrderUrl(siteBase, s.serviceId);

                return (
                  <tr key={s.serviceId} className={isDark ? 'hover:bg-[#16233B]/50' : 'hover:bg-slate-50'}>
                    <td className="py-3 px-4 font-bold text-cyan-400">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                        {s.serviceId}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-inherit text-[13px]">
                      {s.name}
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{s.rateUSD}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 truncate max-w-[150px]">{pageUrl}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(pageUrl, `p-${s.serviceId}`)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Copy Page Link"
                        >
                          {copiedKey === `p-${s.serviceId}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-cyan-300 font-bold truncate max-w-[130px]">{shortUrl}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(shortUrl, `s-${s.serviceId}`)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Copy Short Link"
                        >
                          {copiedKey === `s-${s.serviceId}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-300 truncate max-w-[130px]">{orderUrl}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(orderUrl, `o-${s.serviceId}`)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Copy Order Link"
                        >
                          {copiedKey === `o-${s.serviceId}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setQrModalService({ id: s.serviceId, name: s.name, url: pageUrl })}
                        className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 transition-colors"
                        title="Generate QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">
                      <span className="text-white font-bold">{s.viewCount || 0}</span> / <span className="text-emerald-400 font-bold">{s.orderCount || 0}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Preview Modal */}
      {qrModalService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-sm p-6 rounded-2xl border text-center space-y-4 ${
            isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-2xl'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-heading font-bold text-sm text-cyan-400">{qrModalService.id} QR Code</span>
              <button onClick={() => setQrModalService(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <h4 className="font-heading font-bold text-base text-inherit">{qrModalService.name}</h4>
            <img
              src={getQrCodeUrl(qrModalService.url, 260)}
              alt="Service QR"
              className="w-56 h-56 mx-auto rounded-xl bg-white p-3 shadow-md"
            />
            <p className="text-[11px] font-mono text-slate-400 select-all break-all">{qrModalService.url}</p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleCopy(qrModalService.url, 'qr-url')}
                className="flex-1 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
              >
                Copy Link
              </button>
              <button
                type="button"
                onClick={() => setQrModalService(null)}
                className="py-2 px-4 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
