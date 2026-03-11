import React from 'react';

export default function App() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-6">
            <PricingCard
                planName="Professional"
                price="$49"
                billingPeriod="per month"
                features={[
                    'Up to 100 projects',
                    'Advanced analytics',
                    'Priority support',
                    'Custom integrations',
                    'Team collaboration',
                    'API access'
                ]}
                ctaText="Get Started"
                highlighted={true}
            />
        </div>
    );
}

function PricingCard({ planName, price, billingPeriod, features, ctaText, highlighted }) {
    return (
        <div className={`relative w-full max-w-sm transition-all duration-300 ${
            highlighted
                ? 'ring-2 ring-orange-400 shadow-2xl scale-105'
                : 'shadow-lg hover:shadow-xl'
        }`}>
            {/* Card background */}
            <div className={`p-8 ${
                highlighted
                    ? 'bg-gradient-to-br from-orange-50 to-amber-50'
                    : 'bg-white'
            }`}>

                {/* Badge */}
                {highlighted && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="inline-block bg-orange-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
              MOST POPULAR
            </span>
                    </div>
                )}

                {/* Plan name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                    {planName}
                </h3>

                {/* Decorative line */}
                <div className="h-1 w-12 bg-gradient-to-r from-orange-400 to-amber-400 mb-6"></div>

                {/* Price */}
                <div className="mb-8">
          <span className="text-5xl font-black text-gray-900">
            {price}
          </span>
                    <span className="text-gray-600 text-sm ml-2">
            {billingPeriod}
          </span>
                </div>

                {/* Features list */}
                <ul className="space-y-4 mb-8">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-orange-100">
                                    <svg className="h-3 w-3 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <span className="text-gray-700 text-sm font-medium">
                {feature}
              </span>
                        </li>
                    ))}
                </ul>

                {/* CTA Button */}
                <button className={`w-full py-3 px-6 font-semibold rounded-lg transition-all duration-200 ${
                    highlighted
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg hover:scale-105 active:scale-95'
                        : 'border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white active:scale-95'
                }`}>
                    {ctaText}
                </button>

                {/* Footer text */}
                <p className="text-center text-xs text-gray-500 mt-4">
                    No credit card required. Cancel anytime.
                </p>
            </div>
        </div>
    );
}