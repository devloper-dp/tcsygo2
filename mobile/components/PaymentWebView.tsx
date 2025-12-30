import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';

// ... (imports remain)

interface PaymentWebViewProps {
    orderId: string;
    amount: number; // in paise
    currency: string;
    userContact: string;
    userEmail: string;
    userName: string;
    appName?: string;
    appDescription?: string;
    appLogo?: string;
    prefillMethod?: string;
    onSuccess: (paymentId: string, signature: string) => void;
    onError: (error: string) => void;
    onClose: () => void;
}

export default function PaymentWebView({
    orderId,
    amount,
    currency,
    userContact,
    userEmail,
    userName,
    appName = 'TCSYGO',
    appDescription = 'Trip Booking',
    appLogo = 'https://ui-avatars.com/api/?name=TCSYGO&background=3b82f6&color=fff',
    prefillMethod,
    onSuccess,
    onError,
    onClose
}: PaymentWebViewProps) {
    const [loading, setLoading] = useState(true);

    // Razorpay Standard Checkout HTML
    // We inject the options and handle the submission automatically
    const razorpayHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f9fafb; }
            .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div id="loader" class="loader"></div>
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
          <script>
            var options = {
              "key": "${process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_1234567890'}", 
              "amount": "${amount}", 
              "currency": "${currency}",
              "name": "${appName}",
              "description": "${appDescription}",
              "image": "${appLogo}",
              "order_id": "${orderId}",
              "prefill": {
                "name": "${userName}",
                "email": "${userEmail}",
                "contact": "${userContact}",
                "method": "${prefillMethod || ''}"
              },
              "theme": {
                "color": "#3399cc"
              },
              "handler": function (response){
                // Send success data back to React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SUCCESS',
                    payload: {
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature
                    }
                }));
              },
              "modal": {
                "ondismiss": function(){
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'CANCELLED'
                    }));
                }
              }
            };
            
            var rzp1 = new Razorpay(options);
            
            rzp1.on('payment.failed', function (response){
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'FAILED',
                    payload: {
                        code: response.error.code,
                        description: response.error.description,
                        source: response.error.source,
                        step: response.error.step,
                        reason: response.error.reason,
                        metadata: response.error.metadata
                    }
                }));
            });

            // Automatically open when loaded
            document.getElementById('loader').style.display = 'none';
            rzp1.open();
          </script>
        </body>
      </html>
    `;

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'SUCCESS') {
                onSuccess(data.payload.razorpay_payment_id, data.payload.razorpay_signature);
            } else if (data.type === 'FAILED') {
                onError(data.payload.description || 'Payment Failed');
            } else if (data.type === 'CANCELLED') {
                onClose();
            }
        } catch (e) {
            console.error('Error parsing webview message', e);
        }
    };

    return (
        <View style={styles.container}>
            <WebView
                originWhitelist={['*']}
                source={{ html: razorpayHtml }}
                onMessage={handleMessage}
                javaScriptEnabled={true}
                style={{ flex: 1, backgroundColor: 'transparent' }}
                onLoadEnd={() => setLoading(false)}
            />
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    }
});
