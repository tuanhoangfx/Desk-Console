import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HubSearchField } from "./HubSearchField";

function inputValue() {
  return (screen.getByRole("searchbox") as HTMLInputElement).value;
}

describe("HubSearchField debounced draft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("does not clobber a newer draft when parent lags with an older value", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <HubSearchField value="" onChange={onChange} debounceMs={100} placeholder="Search…" />,
    );
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "ng" } });
    expect(inputValue()).toBe("ng");

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onChange).toHaveBeenLastCalledWith("ng");

    fireEvent.change(input, { target: { value: "nguyễn" } });
    expect(inputValue()).toBe("nguyễn");

    rerender(<HubSearchField value="ng" onChange={onChange} debounceMs={100} placeholder="Search…" />);
    expect(inputValue()).toBe("nguyễn");
  });

  it("accepts external clear while debounced", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <HubSearchField value="hello" onChange={onChange} debounceMs={100} placeholder="Search…" />,
    );
    expect(inputValue()).toBe("hello");

    rerender(<HubSearchField value="" onChange={onChange} debounceMs={100} placeholder="Search…" />);
    expect(inputValue()).toBe("");
  });

  it("does not treat a lagging empty parent value as clear after flush", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <HubSearchField value="" onChange={onChange} debounceMs={100} placeholder="Search…" />,
    );
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "ng" } });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onChange).toHaveBeenLastCalledWith("ng");
    expect(inputValue()).toBe("ng");

    // Parent still feeding transition-lagged "" — must not wipe draft.
    rerender(<HubSearchField value="" onChange={onChange} debounceMs={100} placeholder="Search…" />);
    expect(inputValue()).toBe("ng");
  });

  it("swaps the loupe for a spinning RefreshCw when queryPending", () => {
    const { container, rerender } = render(
      <HubSearchField value="c1k" onChange={vi.fn()} queryPending placeholder="Search…" />,
    );
    const pending = container.querySelector(".hub-search-field__glyph");
    expect(pending?.className).toMatch(/hub-search-field__glyph--pending/);
    expect(pending?.className).not.toMatch(/animate-spin/);
    expect(pending?.querySelector(".animate-spin")).toBeTruthy();
    expect(pending?.querySelector(".lucide-refresh-cw")).toBeTruthy();

    rerender(<HubSearchField value="c1k" onChange={vi.fn()} placeholder="Search…" />);
    const idle = container.querySelector(".hub-search-field__glyph");
    expect(idle?.className).not.toMatch(/hub-search-field__glyph--pending/);
    expect(idle?.querySelector(".animate-spin")).toBeNull();
    expect(idle?.querySelector(".lucide-search")).toBeTruthy();
  });

  it("spins RefreshCw while local debounce draft is ahead of value", () => {
    const { container } = render(
      <HubSearchField value="" onChange={vi.fn()} debounceMs={100} placeholder="Search…" />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "x1" } });
    const pending = container.querySelector(".hub-search-field__glyph");
    expect(pending?.className).toMatch(/hub-search-field__glyph--pending/);
    expect(pending?.querySelector(".lucide-refresh-cw")).toBeTruthy();
    expect(pending?.querySelector(".animate-spin")).toBeTruthy();
  });

  it("does not flush parent onChange while IME is composing", () => {
    const onChange = vi.fn();
    render(<HubSearchField value="" onChange={onChange} debounceMs={100} placeholder="Search…" />);
    const input = screen.getByRole("searchbox");

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "uw" } });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input, { currentTarget: { value: "ư" }, target: { value: "ư" } });
    expect(onChange).toHaveBeenCalledWith("ư");
  });
});
