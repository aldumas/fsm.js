var assert = require("assert");
var util = require("util");
var fsm = require("../src/fsm.js");

describe("when creating the machine", function() {

    it("should throw error if there is no start state", function() {
        assert.fail();
    });

    it("should not throw error if the end state does not exist", function() {
        assert.fail();
    });

    it("should throw error if a nextState does not exist (other than the end state, which is optional)", function() {
        assert.fail();
    });

    it("should throw error if there are any transitions out of the end state", function() {
        assert.fail();
    });

    it("should throw error if the end state has an exit callback", function() {
        assert.fail();
    });

});

describe("before the machine has started", function() {

    it("should error if event was received and option ignoreUnexpectedEvents is false", function() {
        const machine = fsm.createMachine({
            spec: {
                START: {
                    transitions: {
                        EVENT: {
                            nextState: "END"
                        }
                    }
                }
            }
        });

        return assert.rejects(machine.postEvent("EVENT"));
    });

    it("should not error if event is received and option ignoreUnexpectedEvents is true", function() {
        const machine = fsm.createMachine({
            options: {
                ignoreUnexpectedEvents: true
            },
            spec: {
                START: {
                    transitions: {
                        EVENT: {
                            nextState: "END"
                        }
                    }
                }
            }
        });

        return assert.doesNotReject(machine.postEvent("EVENT"));
    });

});

describe("when the machine is running", function() {

    describe("when transitioning from state to state", function() {

        it("should invoke entry, exit, and action callbacks", function(done) {
            let callbackCount = 0;
            const EXPECTED_CALLBACK_COUNT = 3;
            
            const machine = fsm.createMachine({
                spec: {
                    START: {
                        entry: () => ++callbackCount,
                        exit: () => ++callbackCount,
                        transitions: {
                            EVENT: {
                                nextState: "END",
                                action: () => ++callbackCount
                            }
                        }
                    }
                }
            });
    
            machine.postStart();
            machine.postEvent("EVENT")
                .then(() => done(callbackCount !== EXPECTED_CALLBACK_COUNT));
        });
    
        it("should invoke current state's exit(), then the event's action(), then the next state's entry()", function(done) {
            const callbacksCalled = [];
            const EXPECTED_CALLBACKS_CALLED = ["exit", "action", "entry"];
    
            const machine = fsm.createMachine({
                spec: {
                    START: {
                        exit: () => callbacksCalled.push("exit"),
                        transitions: {
                            EVENT: {
                                nextState: "END",
                                action: () =>  callbacksCalled.push("action")
                            }
                        }
                    },
                    END: {
                        entry: () => callbacksCalled.push("entry")
                    }
                }
            });
    
            machine.postStart();
            machine.postEvent("EVENT")
                .then(() => done(!util.isDeepStrictEqual(callbacksCalled, EXPECTED_CALLBACKS_CALLED)));
        });

    });

});
