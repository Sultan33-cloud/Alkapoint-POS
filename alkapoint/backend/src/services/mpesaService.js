const isConfigured = () =>
  !!process.env.MPESA_CONSUMER_KEY &&
  !!process.env.MPESA_CONSUMER_SECRET &&
  !!process.env.MPESA_PASSKEY;

exports.isConfigured = isConfigured;

exports.stkPush = async ({ phone, amount, accountRef, description }) => {
  if (!isConfigured()) {
    const mockId = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    return {
      success: true,
      mock: true,
      checkoutRequestId: mockId,
      merchantRequestId: `M-${mockId}`,
      message: 'M-Pesa is not configured. This is a mock response. Configure Daraja credentials to enable live STK push.',
    };
  }
  throw new Error('Live M-Pesa not yet implemented. Add Daraja credentials and code in mpesaService.js');
};