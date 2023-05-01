import { createModel } from "@xstate/test";
import { Machine, assign } from "xstate";
import Order from "./Order";
import { render, RenderResult, fireEvent, wait } from "@testing-library/react";
import React from "react";

////////////////////////////////////////////////////////////////////////////////
// Using Test Machine Context to repeat paths
////////////////////////////////////////////////////////////////////////////////

// 1. Add Event
// 2. Run tests, notice that the tests does not loop over previously visited states
// 3. Context is consider part of a unique state, use context to allow the
//    test to iterated a second time.
// 4. Woh! You'll need a filter on the path generation to stop it from looping forever

// Context is considered a unique state
const getTestMachine = () =>
  Machine(
    {
      id: "order",
      initial: "shopping",
      context: {
        completedOrder: 0,
      },
      states: {
        shopping: { on: { ADD_TO_CART: { target: "cart" } } },
        cart: { on: { PLACE_ORDER: { target: "ordered" } } },
        ordered: {
          on: {
            CONTINUE_SHOPPING: {
              target: "shopping",
              actions: ["setCompletedOrder"],
            },
          },
        },
      },
    },
    {
      actions: {
        setCompletedOrder: assign(({ completedOrder }) => ({
          completedOrder: completedOrder + 1,
        })),
      },
    }
  );

const getEventConfigs = () => {
  const eventConfigs = {
    ADD_TO_CART: {
      exec: async ({ getByText }: RenderResult) => {
        fireEvent.click(getByText("Add to cart"));
      },
    },
    PLACE_ORDER: {
      exec: async ({ getByText }: RenderResult) => {
        fireEvent.click(getByText("Place Order"));
      },
    },
    CONTINUE_SHOPPING: {
      exec: async ({ getByText }: RenderResult) => {
        fireEvent.click(getByText("Continue Shopping"));
      },
    },
  };

  return eventConfigs;
};

const shoppingTest = {
  test: async ({ getByText }: RenderResult) => {
    await wait(() => expect(() => getByText("shopping")).not.toThrowError());
  },
};
const cartTest = {
  test: async ({ getByText }: RenderResult) => {
    await wait(() => expect(() => getByText("cart")).not.toThrowError());
  },
};
const orderedTest = {
  test: async ({ getByText }: RenderResult) => {
    await wait(() => expect(() => getByText("ordered")).not.toThrowError());
  },
};

describe("Order", () => {
  describe("matches all paths", () => {
    const testMachine = getTestMachine();

    (testMachine.states.shopping as any).meta = shoppingTest;
    (testMachine.states.cart as any).meta = cartTest;
    (testMachine.states.ordered as any).meta = orderedTest;

    const testModel = createModel(testMachine).withEvents(
      getEventConfigs() as any
    );

    // Add filter to handle infinite iterations
    const testPlans = testModel.getShortestPathPlans({
      filter: (state) => state.context.completedOrder <= 1,
    });

    testPlans.forEach((plan) => {
      describe(plan.description, () => {
        plan.paths.forEach((path) => {
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
