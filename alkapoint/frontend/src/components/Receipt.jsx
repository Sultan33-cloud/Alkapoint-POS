import { forwardRef } from 'react';
import { money } from '../utils/format';

const Receipt = forwardRef(function Receipt({ sale, business }, ref) {
  if (!sale) return null;

  const currency = business?.currency || 'KES';
  const subtotal = Number(sale.subtotal || 0);
  const discount = Number(sale.discount || 0);
  const tax = Number(sale.tax || 0);
  const total = Number(sale.total || 0);
  const paid = Number(sale.amountPaid || 0);
  const balance = Number(sale.balance || 0);
  const items = sale.items || sale.SaleItems || [];
  const payments = sale.payments || sale.Payments || [];

  return (
    <div ref={ref} className="ap-receipt bg-white text-black p-6 w-[320px] mx-auto">
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        {business?.logo ? (
          <img src={business.logo} alt="" style={{ width: 56, height: 56, margin: '0 auto 6px', objectFit: 'contain' }} />
        ) : (
          <div style={{ fontSize: 22, fontWeight: 800 }}>AlkaPoint</div>
        )}
        <div style={{ fontSize: 14, fontWeight: 700 }}>{business?.name || 'Business'}</div>
        {business?.address && <div style={{ fontSize: 11 }}>{business.address}</div>}
        {business?.phone && <div style={{ fontSize: 11 }}>{business.phone}</div>}
      </div>

      <div style={{ borderTop: '1px dashed #333', margin: '10px 0' }} />

      <div style={{ fontSize: 12, marginBottom: 6 }}>
        <Row label="Receipt" value={sale.invoiceNumber} />
        <Row label="Date" value={sale.saleDate || sale.createdAt ? new Date(sale.saleDate || sale.createdAt).toLocaleString('en-KE') : '—'} />
        {sale.customer?.name && <Row label="Customer" value={sale.customer.name} />}
      </div>

      <div style={{ borderTop: '1px dashed #333', margin: '8px 0' }} />

      <table style={{ width: '100%', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Item</th>
            <th style={{ textAlign: 'center' }}>Qty</th>
            <th style={{ textAlign: 'right' }}>Price</th>
            <th style={{ textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td style={{ paddingTop: 4 }}>
                {i.productName || i.ProductVariant?.Product?.name}
                <div style={{ fontSize: 10, color: '#555' }}>{i.variantName || i.ProductVariant?.name}</div>
              </td>
              <td style={{ textAlign: 'center', paddingTop: 4 }}>{i.quantity}</td>
              <td style={{ textAlign: 'right', paddingTop: 4 }}>{money(i.unitPrice, currency)}</td>
              <td style={{ textAlign: 'right', paddingTop: 4 }}>{money(i.subtotal || i.total, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px dashed #333', margin: '10px 0' }} />

      <div style={{ fontSize: 12 }}>
        <Row label="Subtotal" value={money(subtotal, currency)} />
        {discount > 0 && <Row label="Discount" value={`- ${money(discount, currency)}`} />}
        {tax > 0 && <Row label="Tax" value={money(tax, currency)} />}
        <Row label="TOTAL" value={money(total, currency)} bold />
        <Row label="Paid" value={money(paid, currency)} />
        {balance > 0 && <Row label="Balance Due" value={money(balance, currency)} bold />}
      </div>

      {payments.length > 0 && (
        <>
          <div style={{ borderTop: '1px dashed #333', margin: '10px 0' }} />
          <div style={{ fontSize: 11 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Payments</div>
            {payments.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ textTransform: 'capitalize' }}>
                  {p.method}
                  {p.reference ? ` · ${p.reference}` : ''}
                </span>
                <span>{money(p.amount, currency)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ borderTop: '1px dashed #333', margin: '12px 0' }} />

      <div style={{ textAlign: 'center', fontSize: 11 }}>
        <div style={{ fontWeight: 700 }}>✓ DIGITALLY VERIFIED</div>
        <div style={{ fontFamily: 'monospace', fontSize: 10, marginTop: 4 }}>Code: {sale.invoiceNumber}</div>
        <div style={{ marginTop: 8 }}>Thank you for your business</div>
      </div>
    </div>
  );
});

function Row({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: bold ? 700 : 400, padding: '2px 0' }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

export default Receipt;
