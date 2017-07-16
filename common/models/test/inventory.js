module.exports = function(Inventory) {

    Inventory.prototype.atomicTypes = ['DEBIT'];

    Inventory.prototype.nonAtomicTypes = ['CREDIT'];

    Inventory.prototype.associatedModels = ['InventoryTransaction'];

    Inventory.prototype.stateObj = {quantity: 0};

    Inventory.prototype.validateCondition = function(actor, activity) {
        if (activity.instructionType === 'DEBIT') {
            return actor.quantity >= activity.payload.value;
        }
    };

    Inventory.prototype.atomicInstructions = function(actor, activity) {
        if (activity.instructionType === 'DEBIT') {
            actor.quantity = actor.quantity - activity.payload.value;
            return actor;
        }
    };

    Inventory.prototype.nonAtomicInstructions = function(actor, activity) {
        if (activity.instructionType === 'CREDIT') {
            actor.quantity = actor.quantity + activity.payload.value;
            return actor;
        }
    };

    Inventory.prototype.processPendingMessage = function(message, actor) {
        if (message.instructionType === 'CREDIT') {
            actor.quantity +=  message.payload.value;
        } else if (message.instructionType === 'DEBIT') {
            actor.quantity -=  message.payload.value;
        }
        return actor;
    };
};
