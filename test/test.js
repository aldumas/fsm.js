var assert = require('assert');
var fsm = require('../src/fsm.js');

/*
describe('Array', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', function() {
      assert.equal([1, 2, 3].indexOf(4), -1);
    });
  });
});
*/

describe('fsm.js', function() {
    it('should invoke all user-defined callbacks', function(done) {
        let callbacksCalled = 0;

        let machine = fsm.createMachine({
            spec: {
                START: {
                    entry: () => ++callbacksCalled,
                    exit: () => ++callbacksCalled,
                    transitions: {
                        EVENT: {
                            nextState: 'END',
                            action: () => {
                                ++callbacksCalled;
                                done(callbacksCalled !== 3);
                            }
                        }
                    }
                }
            }
        });

        machine.postStart();
        machine.postEvent('EVENT');
    });
});
