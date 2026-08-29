import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HubDirectoryFieldQueryPendingProvider } from "./HubDirectoryFieldQueryPending";
import { HubDirectoryQueryPendingChip } from "./HubDirectoryQueryPendingChip";
import { HubSearchField } from "./HubSearchField";

afterEach(() => {
  cleanup();
});

describe("HubDirectoryQueryPendingChip", () => {
  it("hides when idle with no query", () => {
    const { container } = render(<HubDirectoryQueryPendingChip visible={false} query="" />);
    expect(container.querySelector("[data-hub-directory-query-pending-chip]")).toBeNull();
  });

  it("shows Searching… when query is active", () => {
    render(<HubDirectoryQueryPendingChip visible query="x1e3" />);
    expect(screen.getByRole("status").getAttribute("data-hub-directory-query-pending-chip")).toBe(
      "search",
    );
    expect(screen.getByText("Searching…")).toBeTruthy();
    expect(screen.getByText("Searching…").closest("span")?.className).not.toMatch(/animate-spin/);
  });

  it("shows Filtering… when pending with empty query", () => {
    render(<HubDirectoryQueryPendingChip visible query="  " />);
    expect(screen.getByRole("status").getAttribute("data-hub-directory-query-pending-chip")).toBe(
      "filter",
    );
    expect(screen.getByText("Filtering…")).toBeTruthy();
    expect(screen.getByRole("status").querySelector(".lucide-refresh-cw")).toBeTruthy();
    expect(screen.getByRole("status").querySelector(".animate-spin")).toBeTruthy();
  });

  it("shows muted Filtered when idle with query", () => {
    render(<HubDirectoryQueryPendingChip queryPending={false} query="x1e3" />);
    const chip = screen.getByRole("status");
    expect(chip.getAttribute("data-hub-directory-query-pending-chip")).toBe("filtered");
    expect(screen.getByText("Filtered")).toBeTruthy();
    expect(chip.querySelector(".hub-search-field__glyph--pending")).toBeNull();
    expect(chip.querySelector(".lucide-search")).toBeTruthy();
    expect(chip.querySelector(".lucide-refresh-cw")).toBeNull();
  });

  it("shows muted Filtered when idle with facets only", () => {
    render(<HubDirectoryQueryPendingChip queryPending={false} query="" filterActive />);
    expect(screen.getByRole("status").getAttribute("data-hub-directory-query-pending-chip")).toBe(
      "filtered",
    );
    expect(screen.getByText("Filtered")).toBeTruthy();
  });

  it("hides when idle with no query and no facets", () => {
    const { container } = render(
      <HubDirectoryQueryPendingChip queryPending={false} query="" filterActive={false} />,
    );
    expect(container.querySelector("[data-hub-directory-query-pending-chip]")).toBeNull();
  });

  it("shows Searching… while HubSearchField draft is ahead of value", () => {
    render(
      <HubDirectoryFieldQueryPendingProvider>
        <HubSearchField value="" onChange={vi.fn()} debounceMs={100} placeholder="Search…" />
        <HubDirectoryQueryPendingChip queryPending={false} query="" />
      </HubDirectoryFieldQueryPendingProvider>,
    );
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "x1" } });
    expect(screen.getByRole("status").getAttribute("data-hub-directory-query-pending-chip")).toBe(
      "search",
    );
    expect(screen.getByText("Searching…")).toBeTruthy();
  });
});
