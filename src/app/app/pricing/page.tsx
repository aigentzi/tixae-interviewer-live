import { PricingContent } from "./components/content.component";
import { SubscriptionProvider } from "@root/app/providers/SubscriptionProvider";

function PricingPage() {
  return (
    <SubscriptionProvider>
      <section className="relative z-10 overflow-hidden pb-12 pt-20 lg:pb-[90px] lg:pt-[120px]">
        <div className="container mx-auto">
          <div className="-mx-4 flex flex-wrap">
            <div className="w-full px-4">
              <div className="mx-auto mb-[60px] text-center">
                <span className="mb-2 block text-lg font-semibold text-primary">
                  Pricing Table
                </span>
                <h2 className="mb-3 text-3xl font-bold leading-[1.208] text-foreground sm:text-4xl md:text-[40px]">
                  Our Pricing Plan
                </h2>
                <p className="text-base text-foreground-600">
                  There are many variations of passages of Lorem Ipsum available
                  but the majority have suffered alteration in some form.
                </p>
              </div>
            </div>
          </div>

          <PricingContent />
        </div>
      </section>
    </SubscriptionProvider>
  );
};

export default PricingPage;