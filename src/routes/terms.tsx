import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service — ClauGas" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold text-primary mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: July 2026</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Who we are</h2>
            <p>
              ClauGas is a cooking gas cylinder delivery service operating in Buea, Cameroon, built
              and operated by ClauTech Digital Solutions. By creating an account or placing an order
              through ClauGas, you agree to these Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Who can use ClauGas</h2>
            <p>
              You must be at least 18 years old, or ordering with the consent and supervision of an
              adult household member, to place an order. Cooking gas is a hazardous product, and
              ClauGas relies on customers providing accurate delivery information and handling
              cylinders safely once delivered.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Orders and pricing</h2>
            <p>
              Prices shown at checkout are in Central African CFA francs (XAF) and include the
              calculated delivery fee, which is determined automatically based on the distance
              between our depot and your delivery address. Prices and delivery fees may change over
              time; the price shown at the moment you confirm your order is the price you pay. We
              reserve the right to refuse or cancel an order — for example if a cylinder becomes
              unavailable after you've ordered, if the delivery address is outside our service area,
              or if we suspect fraudulent activity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Payment</h2>
            <p>
              We currently accept Cash on Delivery and Mobile Money (MTN MoMo / Orange Money) paid
              directly to our number at the time of delivery or confirmation. ClauGas does not
              process card payments and does not store any payment card information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Delivery</h2>
            <p>
              We deliver to the quarters listed in our service area within Buea. Delivery times are
              estimates, not guarantees, and can be affected by traffic, weather, or rider
              availability. You're responsible for providing an accurate address and being
              reasonably reachable at the phone number on your account so our rider can complete the
              delivery.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Cancellations and refunds</h2>
            <p>
              You may request cancellation of an order that has not yet been marked "Confirmed" by
              contacting us directly. Once a cylinder has been delivered and accepted, refunds are
              handled on a case-by-case basis — for example, a leaking or damaged cylinder will be
              replaced or refunded. Contact us as soon as possible if there's a problem with your
              delivery.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Gas safety</h2>
            <p>
              ClauGas delivers cylinders but is not responsible for their storage, connection, or
              use after delivery. Always check for leaks, use a compliant regulator and hose, keep
              cylinders upright and away from open flame or heat sources, and follow the
              manufacturer's safety guidance. If you smell gas, do not switch on lights or
              appliances — shut the valve, ventilate the area, and contact a qualified technician.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by Cameroonian law, ClauGas and ClauTech Digital
              Solutions are not liable for indirect, incidental, or consequential damages arising
              from the use of a delivered cylinder once it has left our rider's possession, except
              where such damage results from our own negligence or a defect in the cylinder that
              existed at the time of delivery.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">9. Changes to these terms</h2>
            <p>
              We may update these terms as ClauGas grows. If we make a significant change, we'll
              post the updated date at the top of this page. Continuing to use ClauGas after a
              change means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">10. Governing law</h2>
            <p>These terms are governed by the laws of the Republic of Cameroon.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">11. Contact</h2>
            <p>
              Questions about these terms? Reach us at{" "}
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
