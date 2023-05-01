import { createModel } from "@xstate/test";
import { Machine, assign } from "xstate";
import Order from "./Order";
import { render, RenderResult, fireEvent, wait } from "@testing-library/react";
import React from "react";

////////////////////////////////////////////////////////////////////////////////
// Using Test Machine Context to explore non-shortest paths
////////////////////////////////////////////////////////////////////////////////

// 1. Add cancel event to event config
// 2. Update test machine to have cancel option
// 3. Run the test, notice how the Cancel action is not taken
// 4. Use context to make the test Cancel once
// 5. Don't forget to filter path generation!

const getTestMachine = () =>
  Machine(
    {
      id: "order",
      initial: "shopping",
      context: {
        ordersCompleted: 0,
        ordersCanceled: 0,
      },
      states: {
        shopping: { on: { ADD_TO_CART: "cart" } },
        cart: {
          on: {
            PLACE_ORDER: "ordered",
            CANCEL: {
              actions: ["orderCanceled"],
              target: "shopping",
            },
          },
        },
        ordered: {
          on: {
            CONTINUE_SHOPPING: {
              actions: ["orderCompleted"],
              target: "shopping",
            },
          },
        },
      },
    },
    {
      actions: {
        orderCompleted: assign((context) => ({
          ordersCompleted: context.ordersCompleted + 1,
        })),
        orderCanceled: assign((context) => ({
          ordersCanceled: context.ordersCanceled + 1,
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
    CANCEL: {
      exec: async ({ getByText }: RenderResult) => {
        fireEvent.click(getByText("Cancel"));
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

    const testPlans = testModel.getShortestPathPlans({
      filter: (state) =>
        state.context.ordersCompleted <= 1 && state.context.ordersCanceled <= 1,
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
