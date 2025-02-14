import { Card } from "@/components/ui/card";

export default function ContactUs() {
  const lastUpdated = "11-02-2025 01:32:40";

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Contact Us</h1>
      <Card className="max-w-2xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-500 mb-4">Last updated on {lastUpdated}</p>
        
        <p className="text-base">You may contact us using the information below:</p>
        
        <div className="space-y-3">
          <div>
            <h2 className="font-semibold">Merchant Legal entity name:</h2>
            <p>NIBHA DEVI</p>
          </div>
          
          <div>
            <h2 className="font-semibold">Registered Address:</h2>
            <p>Flat No. 2153, 20th Floor, Vijay Nagar, Uttar Pradesh, PIN: 201009</p>
          </div>
          
          <div>
            <h2 className="font-semibold">Operational Address:</h2>
            <p>Flat No. 2153, 20th Floor, Vijay Nagar, Uttar Pradesh, PIN: 201009</p>
          </div>
          
          <div>
            <h2 className="font-semibold">Telephone No:</h2>
            <p>
              <a href="tel:+919871322647" className="text-blue-600 hover:underline">
                +91 9871322647
              </a>
            </p>
          </div>
          
          <div>
            <h2 className="font-semibold">E-Mail ID:</h2>
            <p>
              <a href="mailto:aryansingh8117@gmail.com" className="text-blue-600 hover:underline">
                aryansingh8117@gmail.com
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
