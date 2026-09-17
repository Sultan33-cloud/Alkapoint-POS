const { InventoryBatch, StockMovement } = require('../models');
const { Op } = require('sequelize');

async function deductFIFO({ businessId, branchId, variantId, quantity, referenceId, type, userId, transaction }) {
  const batches = await InventoryBatch.findAll({
    where: { businessId, branchId, variantId, quantityRemaining: { [Op.gt]: 0 } },
    order: [['receivedAt', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  let remaining = quantity;
  const consumed = [];
  let totalCost = 0;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantityRemaining, remaining);
    const previousQty = batch.quantityRemaining;
    batch.quantityRemaining = previousQty - take;
    await batch.save({ transaction });

    const cost = Number(batch.costPerUnit) * take;
    totalCost += cost;
    consumed.push({ batchId: batch.id, quantity: take, costPerUnit: Number(batch.costPerUnit) });

    await StockMovement.create({
      businessId, branchId, variantId, batchId: batch.id, type,
      quantity: -take, referenceId, previousQty, newQty: batch.quantityRemaining, createdBy: userId,
    }, { transaction });

    remaining -= take;
  }

  if (remaining > 0) {
    const error = new Error(`Insufficient stock for variant ${variantId}. Short by ${remaining}`);
    error.status = 400;
    throw error;
  }

  return { consumed, totalCost, avgCost: totalCost / quantity };
}

async function addBatch({ businessId, branchId, variantId, quantity, unitCost, purchaseItemId, batchRef, transaction, userId }) {
  const batch = await InventoryBatch.create({
    businessId, branchId, variantId, purchaseItemId, batchRef,
    quantityReceived: quantity, quantityRemaining: quantity, costPerUnit: unitCost,
    receivedAt: new Date(),
  }, { transaction });

  await StockMovement.create({
    businessId, branchId, variantId, batchId: batch.id, type: 'purchase',
    quantity, referenceId: purchaseItemId, previousQty: 0, newQty: quantity, createdBy: userId,
  }, { transaction });

  return batch;
}

async function adjustStock({ businessId, branchId, variantId, newQuantity, reason, userId, transaction }) {
  const current = (await InventoryBatch.sum('quantityRemaining', {
    where: { businessId, branchId, variantId },
    transaction,
  })) || 0;

  const diff = newQuantity - current;
  if (diff === 0) return;

  if (diff > 0) {
    await InventoryBatch.create({
      businessId, branchId, variantId,
      quantityReceived: diff, quantityRemaining: diff, costPerUnit: 0,
      batchRef: `ADJ-${Date.now()}`,
    }, { transaction });
  } else {
    await deductFIFO({
      businessId, branchId, variantId,
      quantity: -diff, type: 'adjustment', referenceId: null, userId, transaction,
    });
  }

  await StockMovement.create({
    businessId, branchId, variantId, type: 'adjustment',
    quantity: diff, previousQty: current, newQty: newQuantity,
    notes: reason, createdBy: userId,
  }, { transaction });
}

module.exports = { deductFIFO, addBatch, adjustStock };