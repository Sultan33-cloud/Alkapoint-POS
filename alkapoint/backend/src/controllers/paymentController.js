const { Payment, Sale, Customer, Purchase, Supplier, CreditTransaction, sequelize } = require('../models');
const { Op } = require('sequelize');
const mpesa = require('../services/mpesaService');
const audit = require('../services/auditService');
const { round2 } = require('../utils/helpers');

/**
 * List payments with filters.
 */
exports.listPayments = async (req, res, next) => {
  try {
    const { startDate, endDate, method, type } = req.query;
    const where = { businessId: req.businessId };
    if (startDate) where.paymentDate = { [Op.gte]: new Date(startDate) };
    if (endDate) where.paymentDate = { ...(where.paymentDate || {}), [Op.lte]: new Date(endDate) };
    if (method) where.method = method;
    if (type) where.type = type;

    const payments = await Payment.findAll({
      where,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
        { model: Sale, as: 'sale', attributes: ['id', 'invoiceNumber'] },
        { model: Purchase, as: 'purchase', attributes: ['id', 'reference', 'totalCost'] },
      ],
      order: [['paymentDate', 'DESC']],
      limit: 500,
    });
    res.json(payments);
  } catch (err) { next(err); }
};

/**
 * Record a standalone payment.
 *
 * Supports three shapes:
 *  1) Walk-in / uncategorized: no customerId, no purchaseId
 *  2) Customer payment: customerId given, applyToCredit optionally true
 *  3) Supplier payment: purchaseId given, updates purchase.amountPaid
 *                       and paymentStatus atomically
 */
exports.createStandalonePayment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      customerId = null,
      purchaseId = null,
      amount,
      method,
      reference = null,
      phoneNumber = null,
      transactionId = null,
      notes = null,
      applyToCredit = false,
    } = req.body;

    if (customerId && purchaseId) {
      await t.rollback();
      return res.status(400).json({
        message: 'Provide either customerId or purchaseId, not both',
      });
    }

    const amt = round2(Number(amount));
    if (!amt || amt <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Invalid amount' });
    }
    if (!method) {
      await t.rollback();
      return res.status(400).json({ message: 'Payment method required' });
    }

    // -------- 1. Determine payment type --------
    let type = 'other';
    if (purchaseId) type = 'purchase';
    else if (customerId && applyToCredit) type = 'debtor';
    else if (customerId) type = 'other';

    // -------- 2. Create the Payment row --------
    const payment = await Payment.create({
      businessId: req.businessId,
      branchId: req.user.branchId,
      saleId: null,
      customerId: customerId || null,
      purchaseId: purchaseId || null,
      type,
      method,
      amount: amt,
      reference,
      phoneNumber,
      transactionId,
      status: 'completed',
      notes,
      createdBy: req.user.id,
    }, { transaction: t });

    let appliedToCredit = 0;
    let newPurchaseBalance = null;
    let purchaseFullyPaid = false;

    // -------- 3a. Apply to customer credit (FIFO across sales) --------
    if (customerId && applyToCredit) {
      const customer = await Customer.findOne({
        where: { id: customerId, businessId: req.businessId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!customer) {
        await t.rollback();
        return res.status(404).json({ message: 'Customer not found' });
      }

      let remaining = amt;
      const creditSales = await Sale.findAll({
        where: {
          customerId,
          businessId: req.businessId,
          isCredit: true,
          balance: { [Op.gt]: 0 },
        },
        order: [['saleDate', 'ASC']],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      for (const sale of creditSales) {
        if (remaining <= 0) break;
        const saleBalance = Number(sale.balance);
        const apply = Math.min(remaining, saleBalance);
        const newSaleBalance = round2(saleBalance - apply);
        const newAmountPaid = round2(Number(sale.amountPaid) + apply);

        await sale.update({
          amountPaid: newAmountPaid,
          balance: newSaleBalance,
          status: newSaleBalance === 0 ? 'completed' : 'pending',
        }, { transaction: t });

        const newCustBalance = round2(Number(customer.balance) - apply);
        await customer.update({ balance: newCustBalance }, { transaction: t });

        await CreditTransaction.create({
          businessId: req.businessId,
          customerId,
          saleId: sale.id,
          type: 'credit',
          amount: apply,
          balance: newCustBalance,
          description: `Standalone payment on invoice ${sale.invoiceNumber}`,
          paymentId: payment.id,
        }, { transaction: t });

        appliedToCredit = round2(appliedToCredit + apply);
        remaining = round2(remaining - apply);
      }

      if (appliedToCredit < amt) {
        // Overpayment — the excess stays as a standalone payment record
        // and can be applied to future sales manually.
        if (!payment.notes) {
          await payment.update(
            { notes: `Overpayment: ${round2(amt - appliedToCredit)} unapplied` },
            { transaction: t }
          );
        }
      }
    }

    // -------- 3b. Apply to a supplier purchase --------
    if (purchaseId) {
      const purchase = await Purchase.findOne({
        where: { id: purchaseId, businessId: req.businessId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!purchase) {
        await t.rollback();
        return res.status(404).json({ message: 'Purchase not found' });
      }

      const total = Number(purchase.totalCost);
      const alreadyPaid = Number(purchase.amountPaid || 0);
      const outstanding = round2(total - alreadyPaid);

      if (outstanding <= 0) {
        await t.rollback();
        return res.status(400).json({ message: 'This purchase is already fully paid' });
      }

      if (amt > outstanding + 0.01) {
        await t.rollback();
        return res.status(400).json({
          message: `Payment exceeds outstanding balance of ${outstanding}`,
        });
      }

      const newPaid = round2(alreadyPaid + amt);
      newPurchaseBalance = round2(total - newPaid);
      purchaseFullyPaid = newPurchaseBalance <= 0.01;

      await purchase.update({
        amountPaid: newPaid,
        paymentStatus: purchaseFullyPaid ? 'paid' : 'partial',
      }, { transaction: t });
    }

    await t.commit();

    // -------- 4. Audit --------
    try {
      await audit.log({
        businessId: req.businessId,
        userId: req.user.id,
        action: 'PAYMENT_RECORDED',
        entity: 'Payment',
        entityId: payment.id,
        newValues: { amount: amt, method, customerId, purchaseId, appliedToCredit },
        req,
      });
    } catch (_) { /* non-fatal */ }

    // -------- 5. Return full payment --------
    const full = await Payment.findByPk(payment.id, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
        { model: Sale, as: 'sale', attributes: ['id', 'invoiceNumber'] },
        { model: Purchase, as: 'purchase', attributes: ['id', 'reference', 'totalCost', 'amountPaid', 'paymentStatus'] },
      ],
    });

    res.status(201).json({
      message: 'Payment recorded',
      payment: full,
      appliedToCredit,
      purchaseBalance: newPurchaseBalance,
      purchaseFullyPaid,
    });
  } catch (err) {
    if (!t.finished) await t.rollback();
    next(err);
  }
};

/**
 * Supplier aging — how much is owed per supplier and per purchase.
 */
exports.getSupplierAging = async (req, res, next) => {
  try {
    const rows = await sequelize.query(`
      SELECT
        s.id AS supplier_id,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        COUNT(p.id) AS purchase_count,
        COALESCE(SUM(p."totalCost"), 0) AS total_purchases,
        COALESCE(SUM(p."amountPaid"), 0) AS total_paid,
        COALESCE(SUM(p."totalCost" - p."amountPaid"), 0) AS outstanding,
        MAX(p."purchaseDate") AS latest_purchase
      FROM suppliers s
      LEFT JOIN purchases p
        ON p."supplierId" = s.id
        AND p."deletedAt" IS NULL
        AND p."paymentStatus" IN ('unpaid','partial')
      WHERE s."businessId" = :businessId
        AND s."deletedAt" IS NULL
      GROUP BY s.id, s.name, s.phone
      ORDER BY outstanding DESC, s.name ASC
    `, { replacements: { businessId: req.businessId }, type: sequelize.QueryTypes.SELECT });

    // Also return each open purchase with age in days
    const openPurchases = await sequelize.query(`
      SELECT
        p.id,
        p.reference,
        p."purchaseDate",
        p."totalCost",
        p."amountPaid",
        (p."totalCost" - p."amountPaid") AS outstanding,
        p."paymentStatus",
        s.id AS supplier_id,
        s.name AS supplier_name,
        EXTRACT(DAY FROM (NOW() - p."purchaseDate"))::int AS age_days
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p."supplierId"
      WHERE p."businessId" = :businessId
        AND p."deletedAt" IS NULL
        AND p."paymentStatus" IN ('unpaid','partial')
      ORDER BY p."purchaseDate" ASC
    `, { replacements: { businessId: req.businessId }, type: sequelize.QueryTypes.SELECT });

    const totals = {
      totalOutstanding: rows.reduce((s, r) => s + Number(r.outstanding), 0),
      totalPurchases: rows.reduce((s, r) => s + Number(r.total_purchases), 0),
      totalPaid: rows.reduce((s, r) => s + Number(r.total_paid), 0),
    };

    res.json({
      totals,
      suppliers: rows.map((r) => ({
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        supplierPhone: r.supplier_phone,
        purchaseCount: Number(r.purchase_count),
        totalPurchases: Number(r.total_purchases),
        totalPaid: Number(r.total_paid),
        outstanding: Number(r.outstanding),
        latestPurchase: r.latest_purchase,
      })),
      openPurchases: openPurchases.map((r) => ({
        id: r.id,
        reference: r.reference,
        purchaseDate: r.purchase_date,
        totalCost: Number(r.total_cost),
        amountPaid: Number(r.amount_paid),
        outstanding: Number(r.outstanding),
        paymentStatus: r.payment_status,
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        ageDays: r.age_days,
      })),
    });
  } catch (err) { next(err); }
};

/**
 * Payments made against a specific purchase.
 */
exports.getPurchasePayments = async (req, res, next) => {
  try {
    const { purchaseId } = req.params;
    const purchase = await Purchase.findOne({
      where: { id: purchaseId, businessId: req.businessId },
      include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'name'] }],
    });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    const payments = await Payment.findAll({
      where: { purchaseId, businessId: req.businessId },
      order: [['paymentDate', 'DESC']],
    });

    res.json({
      purchase: {
        id: purchase.id,
        reference: purchase.reference,
        purchaseDate: purchase.purchaseDate,
        subtotal: Number(purchase.subtotal),
        transportCost: Number(purchase.transportCost),
        otherCosts: Number(purchase.otherCosts),
        totalCost: Number(purchase.totalCost),
        amountPaid: Number(purchase.amountPaid),
        outstanding: round2(Number(purchase.totalCost) - Number(purchase.amountPaid)),
        paymentStatus: purchase.paymentStatus,
        supplier: purchase.supplier,
      },
      payments,
    });
  } catch (err) { next(err); }
};

// -------- M-Pesa (unchanged) --------
exports.initiateMpesa = async (req, res, next) => {
  try {
    const { phone, amount, accountRef, description } = req.body;
    if (!phone || !amount) return res.status(400).json({ message: 'Phone and amount required' });

    const result = await mpesa.stkPush({
      phone, amount: round2(Number(amount)),
      accountRef: accountRef || 'AlkaPoint',
      description: description || 'Payment',
    });
    res.json(result);
  } catch (err) { next(err); }
};

exports.mpesaCallback = async (req, res) => {
  try {
    const body = req.body?.Body?.stkCallback;
    if (!body) return res.json({ ResultCode: 0, ResultDesc: 'Ignored' });
    const { CheckoutRequestID, ResultCode, CallbackMetadata } = body;
    if (ResultCode === 0 && CallbackMetadata) {
      const items = CallbackMetadata.Item || [];
      const amount = items.find((i) => i.Name === 'Amount')?.Value;
      const mpesaReceipt = items.find((i) => i.Name === 'MpesaReceiptNumber')?.Value;
      const payment = await Payment.findOne({ where: { transactionId: CheckoutRequestID } });
      if (payment) {
        payment.status = 'completed';
        payment.reference = mpesaReceipt;
        payment.amount = amount;
        await payment.save();
      }
    }
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (err) {
    console.error('M-Pesa callback error:', err);
    res.json({ ResultCode: 0, ResultDesc: 'Error logged' });
  }
};

exports.mpesaStatus = async (req, res) => {
  res.json({ configured: mpesa.isConfigured() });
};