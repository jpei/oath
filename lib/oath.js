_ = require('underscore');
// Since objects only compare === to the same object (i.e. the same reference)
// we can do something like this instead of using integer enums because we can't
// ever accidentally compare these to other values and get a false-positive.
//
// For instance, `rejected === resolved` will be false, even though they are
// both {}.
var rejected = {}, resolved = {}, waiting = {};

// This is a promise. It's a value with an associated temporal
// status. The value might exist or might not, depending on
// the status.
var Promise = function (value, status) {
  this.value = value;
  this.status = status;
  this.success = [];
  this.failure = [];
  this.successor = [];
};

// The user-facing way to add functions that want
// access to the value in the promise when the promise
// is resolved.
Promise.prototype.then = function (success, _failure) {
  this.success.push(success);
  this.failure.push(_failure);
  var successor = new Promise(this.value, this.status);
  this.successor.push(successor);

  var todoArray;
  if (this.status === resolved){
    todoArray = this.success;
  } else if (this.status === rejected) {
    todoArray = this.failure;
  } else {
    todoArray = []; // waiting
  }

  _.each(todoArray, function(cb, i){
    if(cb) {
      var x = cb(this.value);
      if (x && x.then) { // thenable
        // promise resolution procedure
        this.successor[i].status = x.status;
        this.successor[i].value = x.value;
        x.success.push(null);
        x.failure.push(null);
        x.successor.push(this.successor[i]);
      } else {
        this.successor[i].status = resolved;
        this.successor[i].value = x;
        this.successor[i].then();
      }
    } else {
      this.successor[i].value = this.value;
      this.successor[i].status = this.status;
      if (this.successor[i] !== waiting && this.successor[i].success.length) {
        this.successor[i].then(); // infinite loop
      }
    }
  }, this);

  if (this.status !== waiting) {
    this.success = this.failure = this.successor = [];
  }
  return successor;
};

// The user-facing way to add functions that should fire on an error. This
// can be called at the end of a long chain of .then()s to catch all .reject()
// calls that happened at any time in the .then() chain. This makes chaining
// multiple failable computations together extremely easy.
Promise.prototype.catch = function (failure) {
  return this.then(null, failure);
};

// This is the object returned by defer() that manages a promise.
// It provides an interface for resolving and rejecting promises
// and also provides a way to extract the promise it contains.
var Deferred = function (promise) {
  this.promise = promise;
};

// Resolve the contained promise with data.
//
// This will be called by the creator of the promise when the data
// associated with the promise is ready.
Deferred.prototype.resolve = function (data) {
  this.promise.status = resolved;
  this.promise.value = data;
  this.promise.then();
};

// Reject the contained promise with an error.
//
// This will be called by the creator of the promise when there is
// an error in getting the data associated with the promise.
Deferred.prototype.reject = function (error) {
  this.promise.status = rejected;
  this.promise.value = error;
  this.promise.catch();
};

// The external interface for creating promises
// and resolving them. This returns a Deferred
// object with an empty promise.
var defer = function () {
  return new Deferred(new Promise(null, waiting));
};

var promisify = function() {

};

module.exports.defer = defer;

module.exports.promisify = promisify;