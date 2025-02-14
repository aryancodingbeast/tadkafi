import { Card } from "@/components/ui/card";

export default function TermsAndConditions() {
  const lastUpdated = "11-02-2025 01:32:40";

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Terms and Conditions</h1>
      <Card className="max-w-4xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-500 mb-4">Last updated on {lastUpdated}</p>
        
        <div className="space-y-4">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
            <p>Welcome to TADKAF!. By accessing and using our website and services, you agree to be bound by these terms and conditions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Definitions</h2>
            <p>"Service" refers to the website and services provided by TADKAF!</p>
            <p>"User" refers to anyone who uses our service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Use License</h2>
            <p>Permission is granted to temporarily access the materials (information or software) on TADKAF!'s website for personal, non-commercial transitory viewing only.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Disclaimer</h2>
            <p>The materials on TADKAF!'s website are provided on an 'as is' basis. TADKAF! makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
          </section>
        </div>
      </Card>
    </div>
  );
}
