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
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [hasSavedPaymentMethods, setHasSavedPaymentMethods] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [cart, setCart] = useState<Array<{product: Product, quantity: number}>>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

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

        // Fetch user details for display name
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        if (userData) {
          const displayName = userData.first_name 
            ? `${userData.first_name}${userData.last_name ? ` ${userData.last_name}` : ''}`
            : user.email?.split('@')[0] || 'User';
          setUserName(displayName);
        } else {
          setUserName(user.email?.split('@')[0] || 'User');
        }

        // Fetch all products
        const response = await fetch('/api/products');
        const data = await response.json();
        
        if (response.ok) {
          setProducts(data.products || []);
        } else {
          console.error('Failed to fetch products:', data.error);
        }

        // Check if user has saved payment methods
        try {
          const paymentMethodsResponse = await fetch(`/api/payment-methods?userId=${user.id}`);
          if (paymentMethodsResponse.ok) {
            const paymentMethodsData = await paymentMethodsResponse.json();
            setHasSavedPaymentMethods(paymentMethodsData.paymentMethods && paymentMethodsData.paymentMethods.length > 0);
          }
        } catch (error) {
          console.error('Error fetching payment methods:', error);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);



  // Cart utility functions
  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart => 
      prevCart.map(item => 
        item.product.id === productId 
          ? { ...item, quantity }
          : item
      )
    );
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const handlePurchase = async () => {
    if (!user || cart.length === 0) {
      return;
    }

    setPurchasing(true);

    try {
      // For now, we'll process the first item in the cart
      // In a full implementation, you'd want to handle multiple items
      const firstItem = cart[0];
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: firstItem.product.stripe_product_id,
          quantity: firstItem.quantity,
          userId: user.id,
          savePaymentMethod: savePaymentMethod,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Clear cart and redirect to Stripe Checkout
        setCart([]);
        setShowCheckout(false);
        window.location.href = data.url;
      } else {
        alert('Failed to create checkout session: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to create checkout session');
    } finally {
      setPurchasing(false);
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
                <p className="text-sm text-gray-600">Welcome, {userName} browse products from our partner business</p>
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
                onClick={() => setShowCart(true)}
                className="relative text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-xl">🛒</span>
                {getCartItemCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#21431E] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getCartItemCount()}
                  </span>
                )}
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
                      onClick={() => addToCart(product)}
                      className="w-full bg-[#21431E] hover:bg-[#1a3618] text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>🛒</span>
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
                 )}
       </div>

       {/* Cart Modal */}
       {showCart && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-semibold text-gray-900">Shopping Cart</h2>
               <button
                 onClick={() => setShowCart(false)}
                 className="text-gray-400 hover:text-gray-600 text-2xl"
               >
                 ×
               </button>
             </div>
             
             {cart.length === 0 ? (
               <div className="text-center py-8">
                 <div className="text-4xl mb-4">🛒</div>
                 <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
                 <p className="text-gray-600 mb-4">
                   Add some products to get started!
                 </p>
                 <button
                   onClick={() => setShowCart(false)}
                   className="bg-[#21431E] hover:bg-[#1a3618] text-white font-medium py-2 px-4 rounded-lg transition-colors"
                 >
                   Continue Shopping
                 </button>
               </div>
             ) : (
               <>
                 <div className="space-y-4 mb-6">
                   {cart.map((item) => (
                     <div key={item.product.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                       <div className="flex items-center space-x-4">
                         <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                           <span className="text-2xl">🛍️</span>
                         </div>
                         <div>
                           <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                           <p className="text-sm text-gray-600">{item.product.description}</p>
                           <p className="text-sm text-gray-500">From {item.product.businesses.business_name}</p>
                         </div>
                       </div>
                       <div className="flex items-center space-x-4">
                         <div className="flex items-center space-x-2">
                           <button
                             onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                             className="w-8 h-8 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50"
                           >
                             -
                           </button>
                           <span className="w-8 text-center">{item.quantity}</span>
                           <button
                             onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                             className="w-8 h-8 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50"
                           >
                             +
                           </button>
                         </div>
                         <div className="text-right">
                           <p className="font-medium text-gray-900">${(item.product.price * item.quantity).toFixed(2)}</p>
                           <p className="text-sm text-gray-500">${item.product.price.toFixed(2)} each</p>
                         </div>
                         <button
                           onClick={() => removeFromCart(item.product.id)}
                           className="text-red-500 hover:text-red-700"
                         >
                           🗑️
                         </button>
                       </div>
                     </div>
                   ))}
                 </div>
                 
                 <div className="border-t border-gray-200 pt-4">
                   <div className="flex items-center justify-between mb-4">
                     <span className="text-lg font-medium text-gray-900">Total:</span>
                     <span className="text-2xl font-bold text-[#21431E]">${getCartTotal().toFixed(2)}</span>
                   </div>
                   <div className="flex space-x-3">
                     <button
                       onClick={() => setShowCart(false)}
                       className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                     >
                       Continue Shopping
                     </button>
                     <button
                       onClick={() => {
                         setShowCart(false);
                         setShowCheckout(true);
                       }}
                       className="flex-1 bg-[#21431E] hover:bg-[#1a3618] text-white font-medium py-2 px-4 rounded-lg transition-colors"
                     >
                       Proceed to Checkout
                     </button>
                   </div>
                 </div>
               </>
             )}
           </div>
         </div>
       )}

       {/* Checkout Modal */}
       {showCheckout && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-semibold text-gray-900">Checkout with Loya</h2>
               <button
                 onClick={() => setShowCheckout(false)}
                 className="text-gray-400 hover:text-gray-600 text-2xl"
               >
                 ×
               </button>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* Order Summary */}
               <div>
                 <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
                 <div className="space-y-3 mb-4">
                   {cart.map((item) => (
                     <div key={item.product.id} className="flex justify-between">
                       <div>
                         <p className="font-medium text-gray-900">{item.product.name}</p>
                         <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                       </div>
                       <p className="font-medium text-gray-900">${(item.product.price * item.quantity).toFixed(2)}</p>
                     </div>
                   ))}
                 </div>
                 <div className="border-t border-gray-200 pt-3">
                   <div className="flex justify-between font-bold text-lg">
                     <span>Total:</span>
                     <span className="text-[#21431E]">${getCartTotal().toFixed(2)}</span>
                   </div>
                 </div>
               </div>
               
                               {/* Payment Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Payment with Loya</h3>
                  
                  <div className="p-4 bg-[#21431E] bg-opacity-10 border border-[#21431E] border-opacity-30 rounded-lg mb-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-[#21431E] text-xl">💚</span>
                      <div>
                        <p className="text-sm font-medium text-[#21431E]">Secure payment with Loya</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Your payment will be processed securely and you'll earn cashback on your purchase.
                        </p>
                      </div>
                    </div>
                  </div>
                 
                 <div className="flex space-x-3">
                   <button
                     onClick={() => setShowCheckout(false)}
                     className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                   >
                     Back to Cart
                   </button>
                   <button
                     onClick={handlePurchase}
                     disabled={purchasing}
                     className="flex-1 bg-[#21431E] hover:bg-[#1a3618] text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {purchasing ? 'Processing...' : 'Pay with Loya'}
                   </button>
                 </div>
               </div>
             </div>
           </div>
         </div>
       )}


     </div>
   );
 } 