/**
 * @jest-environment jsdom
 */
import React from "react";
import { NagareClientProvider, useMutation, useQuery } from ".";
import { act, renderHook } from "@testing-library/react";
import { NagareClient } from "@nagare/core";

const client = new NagareClient();
const wrapper = ({ children }) => (
  <NagareClientProvider client={client}>{children}</NagareClientProvider>
);

describe("useQuery", () => {
  it("should be defined", () => {
    expect(useQuery).toBeDefined();
    expect(typeof useQuery).toBe("function");
  });

  it("throws if no client provided", () => {
    jest.spyOn(console, "error").mockImplementation(jest.fn());
    expect(() => {
      renderHook(() => useQuery("test"));
    }).toThrow();
    jest.spyOn(console, "error").mockRestore();
  });

  it("should render the hook with initialResponse", async () => {
    const { result, rerender } = renderHook(
      () => useQuery("test", () => Promise.resolve()),
      {
        wrapper,
      }
    );

    expect(result.current.queryKey).toBe("test");
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBeFalsy();
    expect(result.current.isFetching).toBeFalsy();
    expect(result.current.isSuccess).toBeFalsy();
    expect(result.current.isRefresh).toBeFalsy();
    expect(result.current.isError).toBeFalsy();
    expect(result.current.isIdle).toBeFalsy();
    expect(result.current.isStale).toBeTruthy();
    expect(result.current.cycle).toBe("initial");

    // Clears the act warning
    await act(async () => {
      await rerender();
    });
  });
});

describe("useMutation", () => {
  it("should be defined", () => {
    expect(useMutation).toBeDefined();
    expect(typeof useMutation).toBe("function");
  });

  it("throws if no client provided", () => {
    jest.spyOn(console, "error").mockImplementation(jest.fn());
    expect(() => {
      renderHook(() => useMutation("test"));
    }).toThrow();
    jest.spyOn(console, "error").mockRestore();
  });

  it("should render the hook with initialResponse", async () => {
    const { result, rerender } = renderHook(
      () => useMutation("test", () => Promise.resolve()),
      {
        wrapper,
      }
    );

    expect(result.current.mutationKey).toBe("test");
    expect(result.current.data).toBeUndefined();
    expect(result.current.isSuccess).toBeFalsy();
    expect(result.current.isLoading).toBeFalsy();
    expect(result.current.isIdle).toBeFalsy();
    expect(result.current.isError).toBeFalsy();
    expect(result.current.cycle).toBe("initial");

    // Clears the act warning
    await act(async () => {
      await rerender();
    });
  });
});
