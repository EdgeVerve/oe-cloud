/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
module.exports = function (Inventory) {
  Inventory.prototype.atomicTypes = ['DEBIT'];

  Inventory.prototype.nonAtomicTypes = ['CREDIT'];

  Inventory.prototype.associatedModels = ['InventoryTransaction'];

  Inventory.prototype.stateObj = {quantity: 0};

  Inventory.prototype.MAX_RETRY_COUNT = 20;

  Inventory.prototype.validateCondition = function (actor, activity) {
    if (activity.instructionType === 'DEBIT') {
      return actor.quantity >= activity.payload.value;
    }
  };

  Inventory.prototype.atomicInstructions = function (actor, activity) {
    if (activity.instructionType === 'DEBIT') {
      actor.quantity = actor.quantity - activity.payload.value;
      return actor;
    }
  };

  Inventory.prototype.nonAtomicInstructions = function (actor, activity) {
    if (activity.instructionType === 'CREDIT') {
      actor.quantity = actor.quantity + activity.payload.value;
      return actor;
    }
  };

  Inventory.prototype.processPendingMessage = function (message, actor) {
    if (message.instructionType === 'CREDIT') {
      actor.quantity +=  message.payload.value;
    } else if (message.instructionType === 'DEBIT') {
      actor.quantity -=  message.payload.value;
    }
    return actor;
  };
};
