import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Platform terms & disclaimers. Not a substitute for legal advice; have counsel review for your jurisdiction.
 */
export default function Terms() {
  return (
    <div className="min-h-[100dvh] text-[var(--text)]" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-5 py-10 pb-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight">Terms &amp; conditions</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Last updated: {new Date().toISOString().slice(0, 10)} · GharSip (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;the platform&rdquo;) operates
          the website and related technology at <strong>gharsip.com</strong> and associated services.
        </p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-[var(--text-muted)]">
          <section>
            <h2 className="text-lg font-bold text-white mb-2">1. Not legal advice</h2>
            <p>
              This page is provided for general information. It does not create a lawyer–client relationship.
              You should obtain independent legal advice about selling, advertising, or delivering products in
              your region before going live.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">2. What GharSip is (and is not)</h2>
            <p>
              GharSip provides <strong className="text-white">software only</strong>: storefront pages, ordering tools, and related
              communication features that connect <strong className="text-white">customers</strong> with <strong className="text-white">independent vendors</strong>{' '}
              (&ldquo;stores&rdquo;, &ldquo;merchants&rdquo;).{' '}
              <strong className="text-white">
                We are not the seller, manufacturer, distributor, or delivery agent of any product.
              </strong>{' '}
              We do not hold inventory, set product prices (except as configured by the vendor in the tool),
              verify licences, or guarantee fulfilment. Each vendor is an independent business using the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">3. Vendor obligations</h2>
            <p>
              Vendors alone are responsible for: product listings, legality of what they offer, permits and
              licences, age verification where required, taxes, packaging, quality, allergens and safety,
              delivery or pickup, refunds, and compliance with all applicable laws (including advertising and
              regulated goods, where relevant). By using the platform, vendors represent that they have the
              right to sell their products and will comply with local rules.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">4. Customer obligations</h2>
            <p>
              Customers must provide accurate information, comply with the vendor&rsquo;s policies and the law,
              and pay the vendor as agreed. For age-restricted products, customers must meet legal age
              requirements; the vendor is responsible for verification at handover. Orders are ultimately
              between customer and vendor; the platform facilitates messaging and order details only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">5. Orders, payments &amp; disputes</h2>
            <p>
              Payment arrangements (e.g. UPI, cash on delivery) are between customer and vendor unless we
              explicitly offer a separate payment feature.{' '}
              <strong className="text-white">
                Disputes about products, refunds, late delivery, or wrong items are solely between customer and vendor.
              </strong>{' '}
              We may try to help operationally but are not obliged to mediate or refund.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">6. Third-party services</h2>
            <p>
              The platform may rely on hosting, messaging (e.g. WhatsApp links), maps, or other third parties.
              Their terms apply when you use those channels. We are not responsible for outages or changes by
              third-party providers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">7. Disclaimer of warranties</h2>
            <p>
              The service is provided <strong className="text-white">&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>. To the fullest extent
              permitted by law, we disclaim all warranties, express or implied, including merchantability, fitness
              for a particular purpose, and non-infringement. We do not warrant uninterrupted or error-free
              operation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">8. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by applicable law,{' '}
              <strong className="text-white">
                GharSip, gharsip.com, and its owners, operators, affiliates, and team members shall not be liable
              </strong>{' '}
              for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits,
              data, goodwill, or other intangible losses, arising out of or related to your use of the platform,
              any vendor&rsquo;s products or conduct, or any third party. Our total liability for any claim arising
              from the service shall not exceed the amount you paid us (if any) solely for platform fees in the
              three (3) months before the claim, or five thousand Indian rupees (₹5,000), whichever is greater,
              except where liability cannot be limited by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">9. Indemnity</h2>
            <p>
              You agree to defend and indemnify GharSip and gharsip.com and their operators against any claims,
              damages, losses, or expenses (including reasonable legal fees) arising from your use of the service,
              your products (if a vendor), your breach of these terms, or your violation of law or third-party
              rights.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">10. Changes</h2>
            <p>
              We may update these terms by posting a new version on this page. Continued use after changes
              constitutes acceptance of the updated terms where permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">11. Contact</h2>
            <p>
              For platform support or legal notices regarding GharSip / gharsip.com, use the contact details
              provided by the site operator (add your support email in the codebase or env when ready).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
