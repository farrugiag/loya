// pages/store.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';

interface Product {
  id: string;
  stripe_product_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  created_at: string;
  businesses: {
    business_name: string;
    stripe_id: string;
  };
}

export default function Store() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/user/login');
          return;
        }
        setUser(user);

        // Fetch all products
        const response = await fetch('/api/products');
        const data = await response.json();
        
        if (response.ok) {
          setProducts(data.products || []);
        } else {
          console.error('Failed to fetch products:', data.error);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handlePurchaseClick = (product: Product) => {
    setSelectedProduct(product);
    setShowPurchaseModal(true);
  };

  const handlePurchase = async () => {
    if (!user || !selectedProduct) {
      return;
    }

    setPurchasing(selectedProduct.stripe_product_id);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedProduct.stripe_product_id,
          quantity: 1,
          userId: user.id,
          savePaymentMethod: savePaymentMethod,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        alert('Failed to create checkout session: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to create checkout session');
    } finally {
      setPurchasing(null);
      setShowPurchaseModal(false);
      setSelectedProduct(null);
      setSavePaymentMethod(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white font-sans">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21431E] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading store...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header with Logo and Navigation */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Image 
                src="/loya-logo.svg" 
                alt="Loya" 
                width={128} 
                height={128}
                className="w-32 h-16"
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Loya Store</h1>
                <p className="text-sm text-gray-600">Browse products from our partner businesses</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/user/dashboard')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/business/dashboard')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Business
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🛍️</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No products available</h2>
            <p className="text-gray-600 mb-6">
              Check back soon for new products from our partner businesses!
            </p>
            <button
              onClick={() => router.push('/business/dashboard')}
              className="bg-[#21431E] hover:bg-[#1a3618] text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Add Your Products
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Products</h2>
              <p className="text-gray-600">
                Browse and purchase products from our partner businesses
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {product.name}
                      </h3>
                      <span className="text-2xl">🛍️</span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {product.description}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-500">From</p>
                        <p className="font-medium text-gray-900">{product.businesses.business_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#21431E]">
                          ${product.price.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">{product.currency.toUpperCase()}</p>
                      </div>
                    </div>

                                         <button
                       onClick={() => handlePurchaseClick(product)}
                       disabled={purchasing === product.stripe_product_id}
                      className="w-full bg-[#21431E] hover:bg-[#1a3618] text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {purchasing === product.stripe_product_id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <span>Purchase Now</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
                 )}
       </div>

       {/* Purchase Modal */}
       {showPurchaseModal && selectedProduct && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
             <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-semibold text-gray-900">Complete Purchase</h2>
               <button
                 onClick={() => {
                   setShowPurchaseModal(false);
                   setSelectedProduct(null);
                   setSavePaymentMethod(false);
                 }}
                 className="text-gray-400 hover:text-gray-600 text-2xl"
               >
                 ×
               </button>
             </div>
             
             <div className="mb-4">
               <h3 className="font-medium text-gray-900 mb-2">{selectedProduct.name}</h3>
               <p className="text-sm text-gray-600 mb-2">{selectedProduct.description}</p>
               <p className="text-lg font-bold text-[#21431E]">${selectedProduct.price.toFixed(2)}</p>
             </div>

             <div className="mb-6">
               <label className="flex items-center space-x-2">
                 <input
                   type="checkbox"
                   checked={savePaymentMethod}
                   onChange={(e) => setSavePaymentMethod(e.target.checked)}
                   className="rounded border-gray-300 text-[#21431E] focus:ring-[#21431E]"
                 />
                 <span className="text-sm text-gray-700">
                   Save payment method for future purchases
                 </span>
               </label>
               <p className="text-xs text-gray-500 mt-1">
                 Your payment information will be securely stored for faster checkout next time.
               </p>
             </div>
             
             <div className="flex space-x-3">
               <button
                 onClick={() => {
                   setShowPurchaseModal(false);
                   setSelectedProduct(null);
                   setSavePaymentMethod(false);
                 }}
                 className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
               >
                 Cancel
               </button>
               <button
                 onClick={handlePurchase}
                 disabled={purchasing === selectedProduct.stripe_product_id}
                 className="flex-1 bg-[#21431E] hover:bg-[#1a3618] text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {purchasing === selectedProduct.stripe_product_id ? 'Processing...' : 'Proceed to Payment'}
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 } 