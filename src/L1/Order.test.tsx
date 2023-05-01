import { createModel } from "@xstate/test";
import { Machine } from "xstate";
import Order, { getOrderMachineDefinition } from "./Order";
import { render, RenderResult, fireEvent, wait } from "@testing-library/react";
import React from "react";

////////////////////////////////////////////////////////////////////////////////
// Basic MBT UI Tests
////////////////////////////////////////////////////////////////////////////////

// This is the basic setup for model based testing
// Note the relation to the MBT diagram
// render(<Order />) is passed into path.test, thus all Event and Assert
//    functions can deconstruct from render
// Fill in the comments
// 1. Deconstruct getByText
// 2. Act and Assert as you would in any ordinary test

const getEventConfigs = () => {
  const eventConfigs = {
    // What action in the UI would trigger this event?
    ADD_TO_CART: {
      exec: async ({ getByText }: RenderResult) => {
        // Action
        fireEvent.click(getByText("Add to cart"));
      },
    },
    PLACE_ORDER: {
      exec: async ({ getByText }: RenderResult) => {
        // Action
        fireEvent.click(getByText("Place Order"));
      },
    },
  };

  return eventConfigs;
};

const shoppingTest = {
  // What do I assert to verify the UI is in the Shopping state?
  test: async ({ getByText }: RenderResult) => {
    // Assert
    await wait(() => expect(() => getByText("shopping")).not.toThrowError());
  },
};
const cartTest = {
  test: async ({ getByText }: RenderResult) => {
    // Assert
    await wait(() => expect(() => getByText("cart")).not.toThrowError());
  },
};
const orderedTest = {
  test: async ({ getByText }: RenderResult) => {
    // Assert
    await wait(() => expect(() => getByText("ordered")).not.toThrowError());
  },
};

describe("Order", () => {
  describe("matches all paths", () => {
    const testMachineDefinition = getOrderMachineDefinition();

    (testMachineDefinition.states.shopping as any).meta = shoppingTest;
    (testMachineDefinition.states.cart as any).meta = cartTest;
    (testMachineDefinition.states.ordered as any).meta = orderedTest;

    const testMachine = Machine(testMachineDefinition);

    const testModel = createModel(testMachine).withEvents(
      getEventConfigs() as any
    );

    const testPlans = testModel.getShortestPathPlans();

    console.log(
      "%ctestPlans>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",
      "color: green; font-size: larger; font-weight: bold",
      testPlans
    );

    testPlans.forEach((plan) => {
      describe(plan.description, () => {
        plan.paths.forEach((path) => {
          console.log("path: >>>>>", JSON.stringify(path, null, 2));
          it(path.description, async () => {
            await path.test(render(<Order />));
          });
        });
      });
    });

    it("should have full coverage", () => {
      return testModel.testCoverage();
    });
  });
});
