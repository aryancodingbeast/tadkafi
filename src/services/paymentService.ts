// This is a dummy payment service that simulates a payment gateway
interface PaymentDetails {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  name: string;
  amount: number;
}

interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export async function processPayment(details: PaymentDetails): Promise<PaymentResponse> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Basic validation
  if (!details.cardNumber || details.cardNumber.length !== 16) {
    return {
      success: false,
      error: 'Invalid card number. Must be 16 digits.'
    };
  }

  if (!details.cvv || details.cvv.length !== 3) {
    return {
      success: false,
      error: 'Invalid CVV. Must be 3 digits.'
    };
  }

  // Simple test card validation
  if (details.cardNumber === '4111111111111111') {
    return {
      success: true,
      transactionId: 'txn_' + Math.random().toString(36).substr(2, 9)
    };
  }

  // Randomly fail some payments to simulate real-world scenarios
  if (Math.random() < 0.1) {
    return {
      success: false,
      error: 'Payment failed. Please try again.'
    };
  }

  return {
    success: true,
    transactionId: 'txn_' + Math.random().toString(36).substr(2, 9)
  };
}
