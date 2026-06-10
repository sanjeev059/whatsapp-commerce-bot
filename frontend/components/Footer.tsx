import Link from "next/link";
import { GHARSIP_WHATSAPP_NUMBER } from "@/lib/whatsapp";

const WA_NUMBER = GHARSIP_WHATSAPP_NUMBER;

export function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white font-extrabold text-sm">G</div>
              <div className="flex flex-col leading-tight">
                <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-brand">Gharsip</span>
                <span className="text-[13px] font-extrabold text-zinc-900">Home-Style Meals</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Home-style meals &amp; monthly tiffin subscriptions, delivered fresh. Saree &amp; blouse services at your doorstep in Bengaluru.
            </p>
            <p className="mt-1.5 text-xs font-semibold text-brand">Varthur · Balagere · Whitefield · Marathahalli</p>
            <a
              href={`https://wa.me/${WA_NUMBER}?text=Hi%20Gharsip%2C%20I%20need%20help`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#1ebe58] transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chat on WhatsApp
            </a>
          </div>

          {/* Meals */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Meals</h3>
            <ul className="mt-4 space-y-2.5">
              {[
                { href: "/menu",                       label: "Today's Menu"      },
                { href: "/menu?meal=breakfast",        label: "Breakfast Combos"   },
                { href: "/menu?meal=lunch_dinner",     label: "Lunch & Dinner"     },
                { href: "/plans",                      label: "Subscription Plans" },
                { href: "/track",                      label: "Track Subscription" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-zinc-500 hover:text-brand transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Saree services */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Saree Services</h3>
            <ul className="mt-4 space-y-2.5">
              {[
                { href: "/saree",             label: "All Services"       },
                { href: "/saree#pico",        label: "Pico Work"          },
                { href: "/saree#fall",        label: "Fall Work"          },
                { href: "/saree#blouse",      label: "Blouse Stitching"   },
                { href: "/saree#packages",    label: "Bridal Packages"    },
                { href: "/saree#booking",     label: "Book Home Pickup"   },
              ].map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-zinc-500 hover:text-brand transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help + trust */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Help</h3>
            <ul className="mt-4 space-y-2.5">
              {[
                { href: "/track", label: "Track Subscription" },
                { href: "#",      label: "Delivery Areas"      },
                { href: "#",      label: "Pause / Cancel Plan" },
                { href: "#",      label: "Contact Us"          },
              ].map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-zinc-500 hover:text-brand transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
            <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Why Gharsip</h3>
            <ul className="mt-3 space-y-2">
              {[
                { icon: "🍱", text: "Home-style cooking" },
                { icon: "🥗", text: "Macro info per meal" },
                { icon: "🚚", text: "Free home delivery" },
                { icon: "📅", text: "Pause anytime" },
              ].map((b) => (
                <li key={b.text} className="flex items-center gap-2 text-sm text-zinc-500">
                  <span>{b.icon}</span>{b.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-6 sm:flex-row">
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} Gharsip. Bengaluru, India · hello@gharsip.com
          </p>
          <div className="flex gap-4 text-xs text-zinc-400">
            <Link href="#" className="hover:text-brand transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-brand transition-colors">Terms</Link>
            <Link href="#" className="hover:text-brand transition-colors">Shipping Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
