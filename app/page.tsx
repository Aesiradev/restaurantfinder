"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ApiResponse, Restaurant } from "@/lib/types";

// Maps category keywords to display emojis for restaurant cards
const ICONS: Record<string, string> = {
  sushi:"🍣",ramen:"🍜",noodle:"🍜",pho:"🍜",pizza:"🍕",italian:"🍝",pasta:"🍝",
  taco:"🌮",mexican:"🌮",burrito:"🌯",burger:"🍔",american:"🍔",bbq:"🥩",
  korean:"🥘",chinese:"🥡",thai:"🍛",indian:"🍛",curry:"🍛",brunch:"🥞",
  breakfast:"🥞",cafe:"☕",coffee:"☕",bar:"🍺",pub:"🍺",seafood:"🦞",
  fish:"🐟",sandwich:"🥪",deli:"🥪",salad:"🥗",healthy:"🥗",vegan:"🥗",
  steak:"🥩",french:"🥐",bakery:"🥐",default:"🍽️",
};

const getIcon = (cat: string) => {
  const l = cat.toLowerCase();
  for (const [k, v] of Object.entries(ICONS)) if (l.includes(k)) return v;
  return ICONS.default;
};

// Pre-built search queries shown as clickable chips below the search box
const SUGGESTIONS = [
  { icon:"🍣", label:"Cheap sushi · LA",  query:"Cheap sushi in downtown Los Angeles open now" },
  { icon:"🍜", label:"Ramen · NYC",        query:"Best ramen in East Village New York" },
  { icon:"🍕", label:"Pizza · Chicago",    query:"Deep dish pizza in Chicago" },
  { icon:"🌮", label:"Tacos · Austin",     query:"Highly rated tacos in Austin open now" },
  { icon:"🥘", label:"Korean BBQ · NYC",   query:"Affordable Korean BBQ near Times Square" },
  { icon:"🥞", label:"Brunch · SF",        query:"Outdoor brunch spots in San Francisco" },
];

// Carousel tiles — bg colors are baked in as static data to avoid hydration mismatches
const TILES = [
  { icon:"🍣", label:"Sushi",   query:"Best sushi near me",               bg:"#fdf0f7" },
  { icon:"🍕", label:"Pizza",   query:"Best pizza near me",               bg:"#f3effe" },
  { icon:"🍜", label:"Ramen",   query:"Best ramen near me",               bg:"#eef9ff" },
  { icon:"🌮", label:"Mexican", query:"Best Mexican restaurants near me", bg:"#fff5ef" },
  { icon:"🍔", label:"Burgers", query:"Best burgers near me",             bg:"#fdf0f7" },
  { icon:"🥘", label:"Korean",  query:"Best Korean restaurants near me",  bg:"#f3effe" },
  { icon:"🍛", label:"Thai",    query:"Best Thai restaurants near me",    bg:"#eef9ff" },
  { icon:"☕", label:"Coffee",  query:"Best coffee shops near me open now",bg:"#fff5ef" },
  { icon:"🥞", label:"Brunch",  query:"Best brunch spots near me open now",bg:"#fdf0f7" },
  { icon:"🦞", label:"Seafood", query:"Best seafood near me",             bg:"#f3effe" },
  { icon:"🥐", label:"Bakery",  query:"Best bakeries open now",           bg:"#eef9ff" },
  { icon:"🍝", label:"Italian", query:"Best Italian restaurants near me", bg:"#fff5ef" },
];

// Cycles through these in the animated typing placeholder
const PLACEHOLDERS = [
  "cheap sushi in downtown LA that's open now…",
  "cozy Italian in Brooklyn with good reviews…",
  "best tacos near Times Square…",
  "outdoor brunch in San Francisco…",
  "affordable Korean BBQ open late…",
  "highly rated ramen in Chicago…",
];

// Content for the "How it works" modal steps
const HOW_STEPS = [
  { n:"01", icon:"✍️", bg:"bg-pink-50",   title:"Describe your craving",
    desc:"Type anything in plain English — cuisine, neighborhood, price, vibe, or 'open now'." },
  { n:"02", icon:"🧠", bg:"bg-purple-50", title:"AI interprets your request",
    desc:"Your message is parsed into structured search params using Claude AI, then sent to Foursquare." },
  { n:"03", icon:"📍", bg:"bg-sky-50",    title:"Browse real results",
    desc:"Real places with ratings, prices, hours, and photos — filtered to match exactly what you asked." },
];

// Static examples shown in the API reference modal
const API_EXAMPLE_REQ  = `GET /api/execute?message=Find%20me%20a%20cheap%20sushi%20restaurant%20in%20downtown%20Los%20Angeles%20that%27s%20open%20now&code=pioneerdevai`;
const API_EXAMPLE_RESP = `{
  "success": true,
  "query_understood": "Budget sushi in downtown Los Angeles open now",
  "results": [
    {
      "fsq_id": "abc123",
      "name": "Sugarfish",
      "address": "600 W 7th St, Los Angeles",
      "category": "Sushi Restaurant",
      "rating": 8.9,
      "price": 2,
      "distance": 420,
      "hours_display": "Mon-Sun 11am–10pm",
      "phone": "+12135551234",
      "website": "https://sugarfishsushi.com"
    }
  ]
}`;

// Animates the search box placeholder — types out each string, pauses, then deletes it
// Uses a mounted flag to avoid server/client hydration mismatch on first render
function useTyping() {
  const [text, setText]       = useState("");
  const [idx, setIdx]         = useState(0);
  const [del, setDel]         = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const target = PLACEHOLDERS[idx];
    const id = setTimeout(() => {
      if (!del) {
        const next = target.slice(0, text.length + 1);
        setText(next);
        if (next === target) setTimeout(() => setDel(true), 2000);
      } else {
        const next = target.slice(0, text.length - 1);
        setText(next);
        if (next === "") { setDel(false); setIdx(i => (i + 1) % PLACEHOLDERS.length); }
      }
    }, del ? 28 : 52);
    return () => clearTimeout(id);
  }, [text, del, idx, mounted]);
  return { text, mounted };
}

// Reusable modal wrapper — closes on backdrop click or Escape key
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div className="modal-bg fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d2035]/40 backdrop-blur-md" onClick={onClose}>
      <div className="modal-box bg-white rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl border border-purple-100" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white rounded-t-3xl z-10 flex items-center justify-between px-6 py-5 border-b border-purple-100">
          <h2 className="serif font-bold text-xl text-[#2d2035]">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl border border-purple-100 bg-purple-50 text-purple-400 hover:bg-purple-100 transition-colors flex items-center justify-center text-sm">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// Color-coded rating badge: green ≥ 8, amber ≥ 6, red below
function RatingBadge({ rating }: { rating: number }) {
  const cls = rating >= 8 ? "bg-emerald-50 text-emerald-600 border-emerald-200"
    : rating >= 6 ? "bg-amber-50 text-amber-600 border-amber-200"
    : "bg-red-50 text-red-500 border-red-200";
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${cls}`}>★ {rating.toFixed(1)}</span>;
}

// Renders price level as filled/empty $ signs (e.g. $$◦◦ for price 2)
function PriceDots({ price }: { price: number }) {
  return (
    <span className="text-xs tracking-widest font-bold">
      {[1,2,3,4].map(i => <span key={i} className={i <= price ? "text-amber-400" : "text-purple-100"}>$</span>)}
    </span>
  );
}

// Individual restaurant card — photo/emoji header links to Foursquare place page
function RestaurantCard({ r, index }: { r: Restaurant; index: number }) {
  const icon = getIcon(r.category);
  return (
    <article className="card-in bg-white border border-purple-100 rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-100/50 hover:border-purple-200 transition-all duration-300" style={{ animationDelay:`${index * 55}ms` }}>
      <div className="relative h-44 shrink-0 overflow-hidden">
        {/* Clicking the image/thumbnail opens the Foursquare place page */}
        <a
          href={r.foursquare_url ?? r.website ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-full group"
          aria-label={`View ${r.name} on Foursquare`}
        >
          {r.photo_url
            ? <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            : <div className="w-full h-full bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center text-5xl group-hover:scale-105 transition-transform duration-300">{icon}</div>}
          {r.photo_url && <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />}
          <div className="absolute inset-0 bg-[#2d2035]/0 group-hover:bg-[#2d2035]/10 transition-colors duration-200 flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[11px] font-bold text-white bg-[#2d2035]/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
              View on Foursquare ↗
            </span>
          </div>
        </a>
        <span className="absolute top-2.5 right-2.5 text-base bg-white/85 backdrop-blur-sm rounded-xl px-1.5 py-1 border border-purple-100">{icon}</span>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex justify-between items-start gap-2">
          <h3 className="serif font-bold text-[15px] text-[#2d2035] leading-snug">{r.name}</h3>
          {r.rating != null && <RatingBadge rating={r.rating} />}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wide text-purple-500 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded">{r.category}</span>
          {r.price != null && <PriceDots price={r.price} />}
          {r.distance != null && <span className="text-[11px] text-purple-300">{r.distance < 1000 ? `${r.distance}m` : `${(r.distance/1000).toFixed(1)}km`}</span>}
        </div>
        <p className="text-xs text-purple-400 leading-relaxed">📍 {r.address}</p>
        {r.hours_display && <p className="text-[11px] text-purple-300">🕐 {r.hours_display}</p>}
        {(r.phone || r.website) && (
          <div className="flex gap-4 mt-auto pt-3 border-t border-purple-50">
            {r.phone && <a href={`tel:${r.phone}`} className="text-xs text-purple-500 font-semibold hover:text-pink-500 transition-colors">📞 Call</a>}
            {r.website && <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-500 font-semibold hover:text-pink-500 transition-colors">🌐 Website ↗</a>}
          </div>
        )}
      </div>
    </article>
  );
}

// Placeholder card shown in a grid while search results are loading
function SkeletonCard() {
  return (
    <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden">
      <div className="h-44 shimmer" />
      <div className="p-4 flex flex-col gap-3">
        {[65,40,80,50].map((w,i) => <div key={i} className="h-3 rounded-lg shimmer" style={{ width:`${w}%` }} />)}
      </div>
    </div>
  );
}

// Horizontally scrolling category row — direction controls left vs right animation
// Tiles are duplicated to create a seamless infinite loop effect
function CarouselRow({ dir, onSearch }: { dir:"l"|"r"; onSearch:(q:string)=>void }) {
  const tiles = [...TILES, ...TILES];
  return (
    <div className="overflow-hidden" style={{ maskImage:"linear-gradient(to right,transparent,black 10%,black 90%,transparent)" }}>
      <div className={dir === "l" ? "track-l" : "track-r"}>
        {tiles.map((t, i) => (
          <button key={i} onClick={() => onSearch(t.query)}
            className="shrink-0 flex flex-col items-center justify-center gap-2 rounded-2xl border border-purple-100 mx-2 hover:border-purple-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer"
            style={{ width:144, height:96, background:t.bg }}>
            <span className="text-3xl">{t.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState<ApiResponse | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [modal, setModal]     = useState<"how"|"api"|null>(null);
  const inputRef              = useRef<HTMLTextAreaElement>(null);
  const resultsRef            = useRef<HTMLDivElement>(null);
  const { text: typer, mounted } = useTyping();
  const closeModal = useCallback(() => setModal(null), []);

  // Auto-resize the textarea as the user types
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [message]);

  // Prevent background scroll when a modal is open
  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modal]);

  // Fires the search — accepts either the textarea value or a pre-built query string
  async function handleSubmit(query?: string) {
    const q = (query ?? message).trim();
    if (!q || loading) return;
    if (query) setMessage(query);
    setLoading(true); setData(null); setError(null);
    try {
      const res  = await fetch(`/api/execute?${new URLSearchParams({ message: q, code: "pioneerdevai" })}`);
      const json: ApiResponse = await res.json();
      setData(json);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 150);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const results = data?.success ? data.results : [];

  // Decorative animated background orbs defined as data to keep JSX clean
  const ORBS_BIG = [
    { cls:"orb-a", top:"-8%",  left:"-4%",  size:420, color:"rgba(196,176,240,0.18)", delay:"0s",  blur:60 },
    { cls:"orb-b", top:"50%",  left:"78%",  size:500, color:"rgba(249,168,201,0.15)", delay:"4s",  blur:70 },
    { cls:"orb-c", top:"60%",  left:"-5%",  size:380, color:"rgba(147,213,245,0.16)", delay:"2s",  blur:55 },
    { cls:"orb-a", top:"15%",  left:"70%",  size:320, color:"rgba(253,184,150,0.14)", delay:"7s",  blur:50 },
  ];
  const ORBS_SMALL = [
    { cls:"orb-pulse", top:"30%", left:"22%", size:160, color:"rgba(196,176,240,0.22)", delay:"0s" },
    { cls:"orb-pulse", top:"65%", left:"60%", size:200, color:"rgba(249,168,201,0.18)", delay:"2s" },
    { cls:"orb-b",     top:"10%", left:"45%", size:180, color:"rgba(147,213,245,0.15)", delay:"5s" },
    { cls:"orb-c",     top:"80%", left:"40%", size:140, color:"rgba(253,184,150,0.16)", delay:"1s" },
  ];

  return (
    <div className="min-h-screen text-[#2d2035] flex flex-col">

      {/* Sticky header with logo and nav links */}
      <header className="sticky top-0 z-40 bg-[#faf8f5]/90 backdrop-blur-xl border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-8 sm:px-12 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center text-lg shadow-sm">🍽️</div>
            <span className="serif font-bold text-2xl text-[#2d2035]">TableFinder</span>
          </div>
          <nav className="flex gap-1">
            <button onClick={() => setModal("how")} className="text-sm font-semibold text-purple-400 px-4 py-2 rounded-xl hover:text-[#2d2035] hover:bg-purple-50 transition-colors">How it works</button>
            <button onClick={() => setModal("api")}  className="text-sm font-semibold text-purple-400 px-4 py-2 rounded-xl hover:text-[#2d2035] hover:bg-purple-50 transition-colors">API</button>
          </nav>
          <span className="hidden sm:block text-[9px] font-bold tracking-widest uppercase text-purple-300 bg-white border border-purple-100 px-3 py-2 rounded-lg">REST API ✓</span>
        </div>
      </header>

      {/* Hero section — search box, suggestion chips, and category carousel */}
      <section className="relative overflow-hidden" style={{ background:"radial-gradient(ellipse 55% 60% at 15% 40%,rgba(196,176,240,0.25) 0%,transparent 65%),radial-gradient(ellipse 45% 50% at 85% 25%,rgba(249,168,201,0.22) 0%,transparent 65%),radial-gradient(ellipse 40% 55% at 55% 85%,rgba(147,213,245,0.18) 0%,transparent 65%),#faf8f5" }}>

        {ORBS_BIG.map((o, i) => (
          <div key={i} className={`${o.cls} absolute rounded-full pointer-events-none`}
            style={{ top:o.top, left:o.left, width:o.size, height:o.size, background:o.color, filter:`blur(${o.blur}px)`, animationDelay:o.delay }} />
        ))}
        {ORBS_SMALL.map((o, i) => (
          <div key={`s${i}`} className={`${o.cls} absolute rounded-full pointer-events-none`}
            style={{ top:o.top, left:o.left, width:o.size, height:o.size, background:o.color, filter:"blur(35px)", animationDelay:o.delay }} />
        ))}

        <div className="relative max-w-5xl mx-auto px-8 sm:px-12 pt-20 pb-12 sm:pt-28 sm:pb-16 text-center">

          <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] uppercase text-purple-500 bg-purple-50 border border-purple-100 rounded-full px-4 py-1.5 mb-8">
            ✦ AI-Powered Restaurant Discovery
          </div>

          <h1 className="serif font-bold leading-[1.05] text-[#2d2035] mb-6 text-[2.8rem] sm:text-6xl lg:text-[5rem]">
            Find what you{" "}
            <span className="grad-text italic relative inline-block">
              crave
              <svg className="absolute -bottom-2 left-0 w-full overflow-visible" height="8" viewBox="0 0 100 8">
                <defs>
                  <linearGradient id="ul" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#f9a8c9"/>
                    <stop offset="50%"  stopColor="#c4b0f0"/>
                    <stop offset="100%" stopColor="#93d5f5"/>
                  </linearGradient>
                </defs>
                <path d="M0,6 Q25,1 50,6 Q75,11 100,6" stroke="url(#ul)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
              </svg>
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-purple-400 leading-relaxed max-w-xl mx-auto mb-12">
            Describe what you want in plain English —<br className="hidden sm:block"/>
            we'll find the best matches nearby.
          </p>

          {/* Search box with auto-expanding textarea and animated placeholder */}
          <div className="w-full">
            <div className="bg-white border-[1.5px] border-purple-100 rounded-2xl shadow-2xl shadow-purple-200/30 focus-within:border-purple-300 focus-within:ring-4 focus-within:ring-purple-100 transition-all duration-200">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                  disabled={loading}
                  maxLength={500}
                  rows={1}
                  className="w-full bg-transparent border-none resize-none text-[16px] text-[#2d2035] leading-relaxed px-6 pt-5 pb-4 caret-purple-400 outline-none min-h-[64px]"
                  suppressHydrationWarning
                />
                {mounted && !message && (
                  <div className="absolute top-5 left-6 text-[16px] leading-relaxed text-purple-300 pointer-events-none select-none flex items-center">
                    <span>{typer}</span>
                    <span className="cursor w-0.5 h-[18px] bg-purple-200 rounded-sm ml-0.5 inline-block" />
                  </div>
                )}
                {/* Static fallback placeholder rendered server-side before hydration */}
                {!mounted && !message && (
                  <div className="absolute top-5 left-6 text-[16px] text-purple-300 pointer-events-none">
                    e.g. cheap sushi in downtown LA that's open now…
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-t border-purple-50">
                <span className="text-[11px] text-purple-200">{message.length}/500 · Enter to search</span>
                <button onClick={() => handleSubmit()} disabled={loading || !message.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 shadow-md shadow-purple-200/50 hover:shadow-lg hover:shadow-purple-200/70 hover:-translate-y-0.5 active:scale-95 transition-all duration-150 disabled:from-purple-100 disabled:to-pink-100 disabled:text-purple-300 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed">
                  {loading ? (
                    <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>Searching…</>
                  ) : <>Search <span className="opacity-60 text-xs">→</span></>}
                </button>
              </div>
            </div>

            {/* Quick-start suggestion chips */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-[10px] font-semibold text-purple-300 shrink-0">Try:</span>
              <div className="flex gap-2 flex-wrap">
                {SUGGESTIONS.map(s => (
                  <button key={s.query} onClick={() => handleSubmit(s.query)} disabled={loading}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-400 bg-white border border-purple-100 rounded-full px-3 py-1.5 hover:border-purple-300 hover:text-[#2d2035] hover:bg-purple-50 transition-all duration-150 disabled:opacity-40 whitespace-nowrap">
                    <span className="text-sm">{s.icon}</span>{s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scrolling category carousel — two rows, opposite directions */}
        <div className="pb-14 flex flex-col gap-3">
          <p className="text-center text-[10px] font-bold tracking-[0.2em] uppercase text-purple-300 mb-2">Popular categories</p>
          <CarouselRow dir="l" onSearch={handleSubmit} />
          <CarouselRow dir="r" onSearch={handleSubmit} />
        </div>
      </section>

      {/* Main content area — shows skeletons while loading, results grid when done */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 sm:px-12 py-12">
        {(error || (data && !data.success)) && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-red-500 text-sm">
            <span>⚠️</span>
            <span>{error ?? (data && !data.success ? data.error : "")}</span>
          </div>
        )}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[0,1,2,3,4,5,6,7].map(i => <SkeletonCard key={i} />)}
          </div>
        )}
        {data?.success && !loading && (
          <section ref={resultsRef}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-8">
              <div>
                <h2 className="serif font-bold text-3xl text-[#2d2035]">
                  {results.length > 0 ? `${results.length} result${results.length!==1?"s":""} found` : "No results found"}
                </h2>
                <p className="text-sm text-purple-300 mt-1">for <span className="text-purple-500 font-bold">"{data.query_understood}"</span></p>
              </div>
              {results.length === 0 && <p className="text-xs text-purple-300">Try removing "open now" or broadening the location.</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {results.map((r, i) => <RestaurantCard key={r.fsq_id} r={r} index={i} />)}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-purple-100 bg-white">
        <div className="max-w-7xl mx-auto px-8 sm:px-12 py-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center text-sm">🍽️</div>
            <span className="serif font-bold text-base text-[#2d2035]">TableFinder</span>
          </div>
          <p className="text-[11px] text-purple-300" suppressHydrationWarning>© {new Date().getFullYear()} TableFinder. All rights reserved.</p>
          <p className="text-[10px] text-purple-200">Places data via Foursquare</p>
        </div>
      </footer>

      {/* How it works modal — explains the 3-step search flow to users */}
      {modal === "how" && (
        <Modal title="How it works" onClose={closeModal}>
          <div className="flex flex-col gap-4">
            {HOW_STEPS.map((s, i) => (
              <div key={i} className={`flex gap-4 p-4 rounded-2xl border border-purple-100 ${s.bg}`}>
                <div className="w-11 h-11 rounded-xl bg-white border border-purple-100 flex items-center justify-center text-xl shrink-0">{s.icon}</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-extrabold tracking-widest text-purple-400 uppercase">{s.n}</span>
                    <h3 className="serif font-bold text-[16px] text-[#2d2035]">{s.title}</h3>
                  </div>
                  <p className="text-[13px] text-purple-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 text-[13px] text-purple-500 leading-relaxed">
              <strong className="text-[#2d2035]">Tip:</strong> Be as vague or specific as you like — "ramen", "cheap ramen Chicago", or "cozy late-night ramen in Wicker Park open after midnight" all work.
            </div>
          </div>
        </Modal>
      )}

      {/* API reference modal — documents the GET endpoint for external use */}
      {modal === "api" && (
        <Modal title="API Reference" onClose={closeModal}>
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-purple-300 mb-2">Endpoint</p>
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 font-mono text-sm text-purple-600 font-semibold">GET /api/execute</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex gap-2.5 items-start">
              <span>🔒</span>
              <p className="text-[12px] text-amber-700 leading-relaxed">All requests require the <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">code</code> parameter. Invalid or missing codes return <strong>401 Unauthorized</strong>.</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-purple-300 mb-2">Parameters</p>
              <div className="rounded-xl overflow-hidden border border-purple-100 text-[12px]">
                {[
                  { name:"message", type:"string", req:true,  desc:"Natural language restaurant search query" },
                  { name:"code",    type:"string", req:true,  desc:'Must equal "pioneerdevai" to authenticate' },
                ].map((p, i) => (
                  <div key={i} className={`grid grid-cols-[1fr_70px_1fr] gap-3 px-4 py-2.5 ${i===0?"bg-white":"bg-purple-50/50"}`}>
                    <div className="flex items-center gap-1.5">
                      <code className="font-bold text-purple-600 text-[13px]">{p.name}</code>
                      {p.req && <span className="text-[9px] font-bold text-red-400 bg-red-50 px-1.5 rounded tracking-wide">required</span>}
                    </div>
                    <span className="text-purple-300 font-mono">{p.type}</span>
                    <span className="text-purple-400">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-purple-300 mb-2">Example request</p>
              <pre className="bg-[#1e1530] text-purple-300 rounded-xl px-4 py-3 text-[12px] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">{API_EXAMPLE_REQ}</pre>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-purple-300 mb-2">Example response</p>
              <pre className="bg-[#1e1530] text-sky-300 rounded-xl px-4 py-3 text-[11px] overflow-x-auto leading-relaxed max-h-64 overflow-y-auto">{API_EXAMPLE_RESP}</pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}