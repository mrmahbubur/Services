import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Search,
  CheckCircle2,
  ChevronRight,
  Bot,
  Copy,
  Check,
  QrCode,
  Share2,
  Lock,
  Clock,
  Sparkles,
  ShieldCheck,
  X,
  ExternalLink,
} from 'lucide-react';
import { getServiceShortUrl, getServiceOrderUrl, getServiceQrUrl } from '../utils/serviceLinks';
import { CamelliaAvatar } from '../services/camelliaService';

export const ServicesPage: React.FC = () => {
  const { services, theme, openConcierge, showToast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  // Map category slug to catalog category name
  const catFromSlug = useMemo(() => {
    if (!categorySlug) return null;
    const s = categorySlug.toLowerCase();
    if (s.includes('mrs') || s === 'm-r-s') return 'M R S Services';
    if (s.includes('gravatar')) return 'Gravatar Services';
    if (s.includes('iptv')) return 'M R S IPTV';
    return null;
  }, [categorySlug]);

  const initialCat = catFromSlug || searchParams.get('cat') || 'all';
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [timingFilter, setTimingFilter] = useState<'all' | 'mode_a' | 'mode_b' | 'mode_c'>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | 'under25' | '25to50' | 'above50'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');

  // QR Modal state
  const [activeQrService, setActiveQrService] = useState<{ id: string; name: string; url: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (catFromSlug) {
      setSelectedCategory(catFromSlug);
    }
  }, [catFromSlug]);

  // Jump to service if exact Service ID is entered in search (e.g., S-MRS-01)
  useEffect(() => {
    const trimmed = searchQuery.trim().toUpperCase();
    if (/^S-(MRS|GRV|IPTV)-\d{2}/.test(trimmed)) {
      const match = services.find((s) => s.id?.toUpperCase() === trimmed || s.serviceId?.toUpperCase() === trimmed);
      if (match) {
        // If exact match found, scroll to or offer direct jump
      }
    }
  }, [searchQuery, services]);

  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      // Category filter
      if (selectedCategory !== 'all' && svc.category !== selectedCategory) {
        return false;
      }

      // Timing filter
      if (timingFilter !== 'all') {
        const mode = svc.paymentTimingMode || 'mode_a';
        if (timingFilter === 'mode_a' && mode !== 'mode_a') return false;
        if (timingFilter === 'mode_b' && mode !== 'mode_b') return false;
        if (timingFilter === 'mode_c' && mode !== 'mode_c') return false;
      }

      // Search filter (Matches Name, Service ID, Short Description, or Slug)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = svc.id.toLowerCase().includes(q);
        const matchShortCode = svc.shortCode?.toLowerCase().includes(q);
        const matchSlug = svc.slug?.toLowerCase().includes(q);
        const matchName = svc.name.toLowerCase().includes(q);
        const matchDesc = svc.shortDescription.toLowerCase().includes(q);
        if (!matchId && !matchShortCode && !matchSlug && !matchName && !matchDesc) return false;
      }

      // Price filter
      const baselinePrice = svc.fixedPriceUSD || svc.minPriceUSD || 15;
      if (priceFilter === 'under25' && baselinePrice >= 25) return false;
      if (priceFilter === '25to50' && (baselinePrice < 25 || baselinePrice > 50)) return false;
      if (priceFilter === 'above50' && baselinePrice <= 50) return false;

      return true;
    }).sort((a, b) => {
      const priceA = a.fixedPriceUSD || a.minPriceUSD || 0;
      const priceB = b.fixedPriceUSD || b.minPriceUSD || 0;
      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      return a.sortOrder - b.sortOrder;
    });
  }, [services, selectedCategory, timingFilter, searchQuery, priceFilter, sortBy]);

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    if (cat === 'all') {
      searchParams.delete('cat');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ cat });
    }
  };

  const copyShortLink = (serviceId: string) => {
    const url = getServiceShortUrl(serviceId);
    navigator.clipboard.writeText(url);
    setCopiedId(serviceId);
    showToast('Link Copied', `Short link for ${serviceId} copied to clipboard`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 ${isDark ? 'text-[#E6EDF7]' : 'text-[#0B1220]'}`}>
      
      {/* Page Title & AI Advisor Button */}
      <div className={`flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6 ${
        isDark ? 'border-slate-800/60' : 'border-slate-200'
      }`}>
        <div>
          <span className="text-xs font-mono font-bold text-cyan-500 uppercase tracking-wider block mb-1">
            Permanent Catalog & Service IDs
          </span>
          <h1 className="font-heading font-extrabold text-2xl sm:text-4xl tracking-tight">
            {services.length} Professional Digital Solutions
          </h1>
          <p className={`text-xs sm:text-sm mt-1 max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Deterministic technical execution across AI workflows, Gravatar identity, and IPTV live streaming. Search by name or Service ID (e.g.{' '}
            <span className={`font-mono font-semibold ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>S-MRS-01</span>).
          </p>
        </div>

        <button
          onClick={() => openConcierge()}
          className={`self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors shadow-sm min-h-[44px] ${
            isDark
              ? 'bg-pink-500/10 border-pink-500/30 text-pink-300 hover:bg-pink-500/20'
              : 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100'
          }`}
        >
          <CamelliaAvatar size={18} />
          <span>Need help choosing? Ask Camellia</span>
        </button>
      </div>

      {/* Category Tabs & Controls */}
      <div className="space-y-4">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
          <button
            onClick={() => handleCategorySelect('all')}
            className={`px-3.5 py-2 rounded-xl border transition-colors text-nowrap min-h-[40px] ${
              selectedCategory === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm'
                : isDark
                ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
                : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
            }`}
          >
            All Solutions ({services.length})
          </button>

          <button
            onClick={() => handleCategorySelect('M R S Services')}
            className={`px-3.5 py-2 rounded-xl border transition-colors text-nowrap min-h-[40px] ${
              selectedCategory === 'M R S Services'
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm'
                : isDark
                ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
                : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
            }`}
          >
            M R S Services ({services.filter((s) => s.category === 'M R S Services').length})
          </button>

          <button
            onClick={() => handleCategorySelect('Gravatar Services')}
            className={`px-3.5 py-2 rounded-xl border transition-colors text-nowrap min-h-[40px] ${
              selectedCategory === 'Gravatar Services'
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm'
                : isDark
                ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
                : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
            }`}
          >
            Gravatar Identity ({services.filter((s) => s.category === 'Gravatar Services').length})
          </button>

          <button
            onClick={() => handleCategorySelect('M R S IPTV')}
            className={`px-3.5 py-2 rounded-xl border transition-colors text-nowrap min-h-[40px] ${
              selectedCategory === 'M R S IPTV'
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm'
                : isDark
                ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
                : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
            }`}
          >
            M R S IPTV VIP Pass ({services.filter((s) => s.category === 'M R S IPTV').length})
          </button>
        </div>

        {/* Filter Bar (Search by name or S-MRS-XX, Timing, Price, Sort) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or ID (e.g. S-MRS-03)..."
              className={`w-full rounded-xl pl-9 pr-8 py-2.5 border focus:outline-none focus:ring-1 focus:ring-cyan-500 font-sans ${
                isDark
                  ? 'bg-[#111B2E] border-[#22314D] text-white placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Payment Timing Filter */}
          <div>
            <select
              value={timingFilter}
              onChange={(e: any) => setTimingFilter(e.target.value)}
              className={`w-full rounded-xl px-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                isDark
                  ? 'bg-[#111B2E] border-[#22314D] text-slate-200'
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <option value="all">Timing: All Policies</option>
              <option value="mode_a">🟢 Pay After Delivery (Mode A)</option>
              <option value="mode_b">🟡 Deposit Required (Mode B)</option>
              <option value="mode_c">🔵 Prepay Only (Mode C)</option>
            </select>
          </div>

          {/* Price Range Filter */}
          <div>
            <select
              value={priceFilter}
              onChange={(e: any) => setPriceFilter(e.target.value)}
              className={`w-full rounded-xl px-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                isDark
                  ? 'bg-[#111B2E] border-[#22314D] text-slate-200'
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <option value="all">Price: All Ranges</option>
              <option value="under25">Budget: Under $25</option>
              <option value="25to50">Standard: $25 to $50</option>
              <option value="above50">Advanced: Above $50</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className={`w-full rounded-xl px-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                isDark
                  ? 'bg-[#111B2E] border-[#22314D] text-slate-200'
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <option value="default">Sort by: Catalog Order</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

      </div>

      {/* Services Grid (All 16 cards) */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl border-dashed border-slate-700/60 p-8 space-y-3">
          <p className="text-slate-400 text-sm">No services match your active search or filters.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setTimingFilter('all');
              setPriceFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((svc) => {
            const timing = svc.paymentTimingMode || 'mode_a';

            return (
              <div
                key={svc.id}
                id={svc.id}
                className={`p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isDark
                    ? 'bg-[#111B2E] border-[#22314D] hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                    : 'bg-white border-slate-200 hover:border-cyan-500/40 hover:shadow-lg'
                }`}
              >
                <div>
                  {/* Top Bar: Permanent Service ID + Category + Timing Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold px-2 py-0.5 rounded-md border text-[10px] ${
                        isDark
                          ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                          : 'bg-cyan-50 border-cyan-300 text-cyan-800'
                      }`}>
                        {svc.id}
                      </span>
                      <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{svc.category}</span>
                    </div>

                    {/* Timing Badge */}
                    {timing === 'mode_a' && (
                      <span className="inline-flex items-center gap-1 font-semibold text-[10px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Pay after delivery</span>
                      </span>
                    )}
                    {timing === 'mode_b' && (
                      <span className="inline-flex items-center gap-1 font-semibold text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        <span>Deposit required</span>
                      </span>
                    )}
                    {timing === 'mode_c' && (
                      <span className="inline-flex items-center gap-1 font-semibold text-[10px] text-cyan-500 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" />
                        <span>Prepay only</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-heading font-bold text-lg mb-2 text-inherit hover:text-cyan-500 transition-colors">
                    <Link to={`/services/${svc.slug || svc.id}`}>
                      {svc.name}
                    </Link>
                  </h3>

                  <p className={`text-xs line-clamp-3 mb-4 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {svc.shortDescription}
                  </p>

                  {/* Inclusions preview */}
                  <div className={`space-y-1.5 mb-5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {svc.inclusions.slice(0, 3).map((inc, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{inc}</span>
                      </div>
                    ))}
                  </div>

                  {/* Price Display */}
                  <div className={`p-3 rounded-xl border mb-4 flex items-center justify-between gap-2 ${
                    isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">USD Pricing</span>
                      <span className="font-mono text-xs font-bold text-emerald-500">
                        {svc.rateUSD}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">BDT Price</span>
                      <span className={`font-mono text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {svc.rateBDT}
                      </span>
                    </div>
                  </div>

                  {/* Turnaround & Links Toolbar */}
                  <div className={`flex items-center justify-between text-[11px] mb-4 pb-3 border-b ${
                    isDark ? 'text-slate-400 border-slate-800/60' : 'text-slate-600 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{svc.typicalTurnaround}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyShortLink(svc.id)}
                        className={`p-1 rounded-lg transition-colors flex items-center gap-1 text-[10px] ${
                          isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-cyan-300' : 'hover:bg-slate-100 text-slate-600 hover:text-cyan-700'
                        }`}
                        title="Copy short link /s/..."
                      >
                        {copiedId === svc.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="font-mono">/s/{svc.id}</span>
                      </button>

                      <button
                        onClick={() =>
                          setActiveQrService({
                            id: svc.id,
                            name: svc.name,
                            url: getServiceShortUrl(svc.id),
                          })
                        }
                        className={`p-1 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-cyan-300' : 'hover:bg-slate-100 text-slate-600 hover:text-cyan-700'
                        }`}
                        title="Show QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/services/${svc.slug || svc.id}`}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium text-center transition-colors ${
                        isDark
                          ? 'border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                          : 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Specifications
                    </Link>

                    <Link
                      to={`/order/${svc.id}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs text-center transition-colors shadow-sm"
                    >
                      {svc.priceType === 'fixed' || svc.priceType === 'plan' ? 'Buy Now' : 'Request Quote'}
                    </Link>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Modal */}
      {activeQrService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`border rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl ${
            isDark ? 'bg-[#111B2E] border-cyan-500/30 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className="font-mono text-xs font-bold text-cyan-500">{activeQrService.id}</span>
              <button
                onClick={() => setActiveQrService(null)}
                className={`p-1 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-heading font-bold text-base text-inherit">{activeQrService.name}</h3>
              <p className="text-xs text-slate-500">Scan to open canonical service page</p>
            </div>

            <div className="p-4 bg-white rounded-xl inline-block shadow-lg mx-auto border border-slate-200">
              <img
                src={getServiceQrUrl(activeQrService.id, 200)}
                alt={`QR code for ${activeQrService.id}`}
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div className={`p-2 rounded-xl border text-[11px] font-mono break-all select-all ${
              isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              {activeQrService.url}
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(activeQrService.url);
                showToast('Copied', 'URL copied to clipboard', 'success');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Short Link</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
