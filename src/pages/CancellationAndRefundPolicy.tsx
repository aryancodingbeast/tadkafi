import { Card } from "@/components/ui/card";

export default function CancellationAndRefundPolicy() {
  const lastUpdated = "11-02-2025 01:32:40";

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Cancellation and Refund Policy</h1>
      <Card className="max-w-4xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-500 mb-4">Last updated on {lastUpdated}</p>
        
        <div className="space-y-4">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Cancellation Policy</h2>
            <p>Orders can be cancelled before they are processed. Once an order is being processed, cancellation may not be possible.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Refund Timeline</h2>
            <p>Refunds will be processed within 5-7 business days after approval. The time taken for the refund to reflect in your account may vary depending on your payment method and bank.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Refund Conditions</h2>
            <p>Refunds are provided for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Undelivered services</li>
              <li>Services not matching the description</li>
              <li>Technical issues preventing service delivery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Contact Information</h2>
            <p>For any queries regarding cancellation or refunds, please contact us at:</p>
            <p className="mt-2">
              <a href="mailto:aryansingh8117@gmail.com" className="text-blue-600 hover:underline">
                aryansingh8117@gmail.com
              </a>
            </p>
            <p>
              <a href="tel:+919871322647" className="text-blue-600 hover:underline">
                +91 9871322647
              </a>
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
