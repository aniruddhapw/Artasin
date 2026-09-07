"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";

export function NavUserMenu({ user }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!user) {
    return (
      <Link aria-label="Sign in" href="/login">
        <Icon name="user" />
      </Link>
    );
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="user-menu">
      <button
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Icon name="user" />
      </button>
      {open ? (
        <div className="user-menu-panel">
          <p className="user-menu-name">
            {user.firstName} {user.lastName}
          </p>
          <p className="user-menu-email">{user.email}</p>
          <div className="user-menu-links">
            {user.role === "ARTIST" ? (
              <>
                <Link href="/studio">Studio Dashboard</Link>
                <Link href="/studio/artworks">Manage Artworks</Link>
                <Link href="/studio/commissions">Commission Requests</Link>
                <Link href="/studio/profile">Studio Profile</Link>
              </>
            ) : null}
            {user.role === "BUYER" ? (
              <>
                <Link href="/orders">My Orders</Link>
                <Link href="/commissions">My Commissions</Link>
              </>
            ) : null}
            {user.role === "ADMIN" ? <Link href="/admin">Admin Dashboard</Link> : null}
            <Link href="/account">Account Settings</Link>
          </div>
          <button disabled={isSigningOut} onClick={handleSignOut} type="button">
            {isSigningOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
