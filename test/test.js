var assert = require('assert');
var util = require('util');
var fsm = require('../src/fsm.js');

describe('when transitioning from state to state', function() {
    it('should invoke entry, exit, and action callbacks', function(done) {
        let callbackCount = 0;
        const EXPECTED_CALLBACK_COUNT = 3;

        const machine = fsm.createMachine({
            spec: {
                START: {
                    entry: () => ++callbackCount,
                    exit: () => ++callbackCount,
                    transitions: {
                        EVENT: {
                            nextState: 'END',
                            action: () => {
                                ++callbackCount;
                                done(callbackCount !== EXPECTED_CALLBACK_COUNT);
                            }
                        }
                    }
                }
            }
        });

        machine.postStart();
        machine.postEvent('EVENT');
    });

    it("should invoke current state's exit(), then the event's action(), then the next state's entry()", function(done) {
        const callbacksCalled = [];
        const EXPECTED_CALLBACKS_CALLED = ["exit", "action", "entry"];

        const machine = fsm.createMachine({
            spec: {
                START: {
                    exit: () => callbacksCalled.push('exit'),
                    transitions: {
                        EVENT: {
                            nextState: 'END',
                            action: () =>  callbacksCalled.push('action')
                        }
                    }
                },
                END: {
                    entry: () => {
                        callbacksCalled.push('entry');
                        done(!util.isDeepStrictEqual(callbacksCalled, EXPECTED_CALLBACKS_CALLED));
                    }
                },
            }
        });

        machine.postStart();
        machine.postEvent('EVENT');
    });

    describe('when ignoreUnexpectedEvents == false', function() {
        it('should error if event is received before machine is started', function(done) {
            const machine = fsm.createMachine({
                spec: {
                    START: {
                        transitions: {
                            EVENT: {
                                nextState: 'END'
                            }
                        }
                    }
                }
            });

            assert.rejects(machine.postEvent('EVENT'))
                .then(() => done())
                .catch(() => done(true));
        });
    });

    describe('when ignoreUnexpectedEvents == true', function() {
        it('should not error if event is received before machine is started', function(done) {
            const machine = fsm.createMachine({
                options: {
                    ignoreUnexpectedEvents: true
                },
                spec: {
                    START: {
                        transitions: {
                            EVENT: {
                                nextState: 'END'
                            }
                        }
                    }
                }
            });

            assert.doesNotReject(machine.postEvent('EVENT'))
                .then(() => done())
                .catch(() => done(true));
        });
    });
});
