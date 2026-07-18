import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — ClauGas" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold text-primary mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: July 2026</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. What this covers</h2>
            <p>
              This policy explains what information ClauGas collects when you use our website or
              place an order, how we use it, and how it's protected. ClauGas is operated by ClauTech
              Digital Solutions in Buea, Cameroon.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Information we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account details: your name, email address, and phone number</li>
              <li>Delivery addresses: quarter, landmark, and any notes you give our rider</li>
              <li>Order history: what you ordered, when, and its status</li>
              <li>
                Basic technical data: browser type and general usage, used only to keep the site
                working properly
              </li>
            </ul>
            <p className="mt-2">
              We do not collect or store payment card details — payment happens directly via Cash on
              Delivery or Mobile Money at the time of delivery, outside of our systems.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. How we use it</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To process and deliver your orders</li>
              <li>To calculate delivery distance and fees automatically</li>
              <li>To let you view your own order history and receipts</li>
              <li>To contact you about an order if there's a problem</li>
              <li>To identify frequent customers for loyalty consideration</li>
            </ul>
            <p className="mt-2">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Where your data is stored</h2>
            <p>
              Your data is stored using Supabase, a third-party database and authentication
              provider, with access controls (row-level security) restricting who can see what —
              customers can only see their own orders and addresses; only authorized ClauGas staff
              can see the operational data needed to fulfill orders.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Your choices</h2>
            <p>
              You can update your profile information, edit or remove a saved address, and view your
              full order history at any time from your dashboard. If you'd like your account and
              associated data deleted entirely, contact us and we'll process that request, subject
              to any records we're required to keep for legitimate business or legal reasons (such
              as a completed order needed for dispute resolution).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Cookies and local storage</h2>
            <p>
              We use your browser's local storage to remember simple preferences — like your chosen
              language and whether you prefer light or dark mode. We don't use tracking cookies to
              follow you across other websites.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Children's privacy</h2>
            <p>
              ClauGas is not intended for use by children. Cooking gas is a hazardous product, and
              accounts should only be created and used by adults or with direct adult supervision.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Changes to this policy</h2>
            <p>
              If we make a significant change to how we handle your data, we'll update the date at
              the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">9. Contact</h2>
            <p>
              Questions about your data or this policy? Reach us at{" "}
              <a href="mailto:www.agborclauvet@gmail.com" className="text-primary underline">
                www.agborclauvet@gmail.com
              </a>{" "}
              or{" "}
              <a href="tel:+237650556715" className="text-primary underline">
                +237 650 556 715
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
