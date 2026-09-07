"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

export function NavSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/gallery?q=${encodeURIComponent(trimmed)}` : "/gallery");
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-label="Search"
        className="nav-search"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Icon name="search" />
      </button>
      {open ? (
        <div className="nav-search-panel">
          <form onSubmit={handleSubmit}>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search artworks and artists..."
              ref={inputRef}
              type="search"
              value={query}
            />
            <button className="small-outline" type="submit">
              Search
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
