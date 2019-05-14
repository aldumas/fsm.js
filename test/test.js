var assert = require("assert");
var fsm = require("../src/fsm.js");

/* NOTE: in several cases, we wrap all the promises returned by the FSM in a
 * single promise (via Promise.all) so we can return it to Mocha, which will
 * fail the test if it is rejected. */

describe("when creating the machine", function() {

    it("should throw error if there is no start state", function() {
        assert.throws(() => fsm.createMachine({spec: {}}),
            {
                message: "missing start state START",
                name: "FiniteStateMachine [STATE: <None>]",
                state: null
            });
    });

    describe("when you specify a different name for the start state", function() {

        it("should not throw error", function() {
            assert.doesNotThrow(() => fsm.createMachine({
                start: "INIT",
                spec: {
                    INIT: {
                        transitions: {
                            EVENT: {
                                nextState: "END"
                            }
                        }
                    }
                }
            }));
        });

        it("should throw error if there is no start state", function() {
            assert.throws(() => fsm.createMachine({
                start: "INIT",
                spec: {
                    START: {
                        transitions: {
                            EVENT: {
                                nextState: "END"
                            }
                        }
                    }
                }
            }),
            {
                message: "missing start state INIT",
                name: "FiniteStateMachine [STATE: <None>]",
                state: null
            });
        });

    });

    it("should not throw error if the end state does not exist", function() {
        assert.doesNotThrow(() => fsm.createMachine({
            spec: {
                START: {
                    transitions: {
                        EVENT: {
                            nextState: "END"
                        }
                    }
                }
            }
        }));
    });

    describe("when you specify a different name for the end state", function() {

        it("should not throw error even though the end state does not have an entry in spec", function() {
            assert.doesNotThrow(() => fsm.createMachine({
                end: "FINAL",
                spec: {
                    START: {
                        transitions: {
                            EVENT: {
                                nextState: "FINAL"
                            }
                        }
                    }
                }
            }));
        });
        
    });

    it("should throw error if a nextState does not exist (other than the end state, which is optional)", function() {
        const spec = {
            START: {
                transitions: {
                    EVENT: {
                        nextState: "NOT_EXIST"
                    }
                }
            }
        };
        
        assert.throws(() => fsm.createMachine({spec}),
            {
                message: "invalid next state - NOT_EXIST",
                name: "FiniteStateMachine [STATE: <None>]",
                state: null
            });
    });

    it("should throw error if there are any transitions out of the end state", function() {
        const spec = {
            START: {
                transitions: {
                    EVENT: {
                        nextState: "END"
                    }
                }
            },
            END: {
                transitions: {
                    EVENT: {
                        nextState: "ENDIER_END"
                    }
                }
            },
            ENDIER_END: {
                // This entry is needed so the test for invalid nextStates does not fail
                // because only the end state is allowed to not have any entry.
            }
        };
        
        assert.throws(() => fsm.createMachine({spec}),
            {
                message: "end state should not have transitions",
                name: "FiniteStateMachine [STATE: <None>]",
                state: null
            });
    });

    it("should throw error if the end state has an exit callback", function() {
        const spec = {
            START: {
                transitions: {
                    EVENT: {
                        nextState: "END"
                    }
                }
            },
            END: {
               exit: () => console.log("Nope, this doesn't make sense.")
            }
        };
        
        assert.throws(() => fsm.createMachine({spec}),
            {
                message: "end state should not have an exit callback",
                name: "FiniteStateMachine [STATE: <None>]",
                state: null
            });
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

    it("should reset to the start state if postStart() is called again", function() {
        let callbackCount = 0;
        const EXPECTED_CALLBACK_COUNT = 2;

        const machine = fsm.createMachine({
            spec: {
                START: {
                    entry: () => ++callbackCount,
                    transitions: {
                        EVENT: {
                            nextState: "MIDDLE"
                        }
                    }
                },
                MIDDLE: {
                    transitions: {
                        EVENT: {
                            nextState: "END"
                        }
                    }
                }
            }
        });

        return Promise.all(
            [
                machine.postStart(),        // ==> callbackCount = 1 after it enters START
                machine.postEvent('EVENT'), // should be in MIDDLE state after it executes
                machine.postStart()         // ==> callbackCount = 2 after it enters START
            ])       
            .then(() => assert.equal(callbackCount, EXPECTED_CALLBACK_COUNT));
    });

    it("should pass the opaque value pass to action, entry, and exit", function() {
        const PASS = {
            some: "data",
            any: "info"
        };

        const callbackPass = {
            entry: null,
            exit: null,
            action: null
        };
        const EXPECTED_CALLBACK_PASS = {
            entry: PASS,
            exit: PASS,
            action: PASS
        };

        const machine = fsm.createMachine({

            pass: PASS,

            spec: {
                START: {
                    entry: pass => callbackPass.entry = pass,
                    exit: pass => callbackPass.exit = pass,
                    transitions: {
                        EVENT: {
                            nextState: "END",
                            action: pass => callbackPass.action = pass
                        }
                    }
                }
            }
        });

        return Promise.all(
            [
                machine.postStart(),
                machine.postEvent("EVENT")
            ])
            .then(() => assert.deepStrictEqual(callbackPass, EXPECTED_CALLBACK_PASS));
    });

    it("should pass arguments to action, but not to entry or exit", function() {
        const callbackArgs = {
            entry: null,
            exit: null,
            action: null
        };
        const EXPECTED_CALLBACK_ARGS = {
            entry: [],
            exit: [],
            action: ['first', 'second']
        };

        const machine = fsm.createMachine({
            spec: {
                START: {
                    entry: (pass, ...args) => callbackArgs.entry = args,
                    exit: (pass, ...args) => callbackArgs.exit = args,
                    transitions: {
                        EVENT: {
                            nextState: "END",
                            action: (pass, ...args) => callbackArgs.action = args
                        }
                    }
                }
            }
        });

        return Promise.all(
            [
                machine.postStart(),
                machine.postEvent("EVENT", 'first', 'second')
            ])
            .then(() => assert.deepStrictEqual(callbackArgs, EXPECTED_CALLBACK_ARGS));
    });

    

    describe("when transitioning from state to state", function() {

        it("should invoke entry, exit, and action callbacks", function() {
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
    
            return Promise.all(
                [
                    machine.postStart(),
                    machine.postEvent("EVENT")
                ])
                .then(() => assert.equal(callbackCount, EXPECTED_CALLBACK_COUNT));
        });
    
        it("should invoke current state's exit(), then the event's action(), then the next state's entry()", function() {
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

            return Promise.all(
                [
                    machine.postStart(),
                    machine.postEvent("EVENT")
                ])
                .then(() => assert.deepStrictEqual(callbacksCalled, EXPECTED_CALLBACKS_CALLED));
        });

    });

});
