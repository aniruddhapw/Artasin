"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import {
  aboutPainting,
  budgetChoices,
  findPaintings,
  similarTo,
  styleChoices,
  type HelperMatches
} from "@/lib/galleryHelper";
import type { GalleryPainting } from "./types";

/** Where the conversation is. Each step is one thing the helper says, with answers to tap. */
export type HelperStep =
  | { kind: "home" }
  | { kind: "style" }
  | { kind: "budget"; style: string | null }
  | { kind: "results"; matches: HelperMatches; intro: string }
  | { kind: "about"; index: number };

interface HelperPanelProps {
  paintings: readonly GalleryPainting[];
  /** The painting the visitor is looking at, if any. */
  current: number | null;
  step: HelperStep;
  onStep: (step: HelperStep) => void;
  /** Walk the visitor to these paintings, starting with the first. */
  onGo: (indices: number[]) => void;
  onDesk: () => void;
  onClose: () => void;
}

/**
 * The Artasin helper's side of the conversation, without AI: the visitor taps
 * answers and the helper narrows the collection (lib/galleryHelper.ts) or
 * tells them about a painting from its listing and the artist's profile.
 */
export function HelperPanel({ paintings, current, step, onStep, onGo, onDesk, onClose }: HelperPanelProps) {
  const [surprised, setSurprised] = useState(0);
  // A few to suggest, from different artists, picked once per visit so they
  // don't reshuffle every time the panel opens.
  const [suggestionPool] = useState(() => pickSuggestions(paintings, 4));
  const suggestions = suggestionPool.filter((index) => index !== current).slice(0, 3);

  function surprise() {
    // Anything but the painting already in front of them.
    const choices = paintings.map((_, index) => index).filter((index) => index !== current);
    const pick = choices[Math.floor(Math.random() * choices.length)];
    if (pick !== undefined) {
      setSurprised((count) => count + 1);
      onGo([pick]);
    }
  }

  function showResults(matches: HelperMatches, intro: string) {
    onStep({ kind: "results", matches, intro });
  }

  return (
    <aside aria-label="Artasin helper" className="walk-helper">
      <header className="walk-helper-head">
        <span aria-hidden="true" className="walk-helper-avatar">
          A
        </span>
        <div>
          <p className="walk-eyebrow">Artasin helper</p>
          {step.kind !== "home" ? (
            <button className="walk-helper-back" onClick={() => onStep({ kind: "home" })} type="button">
              &larr; Start again
            </button>
          ) : (
            <p className="walk-helper-name">Aarav, your virtual curator</p>
          )}
        </div>
        <button aria-label="Close the helper" className="walk-helper-close" onClick={onClose} type="button">
          &times;
        </button>
      </header>

      <div aria-live="polite" className="walk-helper-body">
        {step.kind === "home" ? (
          <>
            <div className="walk-helper-hero">
              <h2>{surprised ? "Shall I find you another?" : "Discover art you love"}</h2>
              <p>I can guide you around, tell you about any painting, or take you straight to it.</p>
              {paintings.length > 1 ? (
                <button className="walk-helper-tour" onClick={() => onGo(paintings.map((_, index) => index))} type="button">
                  Take me on a tour of all {paintings.length}
                  <Icon name="arrowRight" size={16} />
                </button>
              ) : null}
            </div>
            <div className="walk-helper-choices">
              <button onClick={() => onStep({ kind: "style" })} type="button">
                Help me find a painting
              </button>
              {current !== null && paintings[current] ? (
                <button onClick={() => onStep({ kind: "about", index: current })} type="button">
                  Tell me about this painting
                </button>
              ) : null}
              <button onClick={surprise} type="button">
                Surprise me
              </button>
              <button onClick={onDesk} type="button">
                I&apos;d like something made for me
              </button>
            </div>
            {suggestions.length ? (
              <>
                <h3 className="walk-helper-section">Suggested for you</h3>
                <ul className="walk-helper-results">
                  {suggestions.map((index) => {
                    const painting = paintings[index];
                    return painting ? <PaintingCard key={painting.id} onGo={() => onGo([index])} painting={painting} /> : null;
                  })}
                </ul>
              </>
            ) : null}
          </>
        ) : null}

        {step.kind === "style" ? (
          <>
            <p className="walk-helper-say">What kind of painting are you looking for?</p>
            <div className="walk-helper-choices">
              {styleChoices(paintings).map((choice) => (
                <button key={choice.id} onClick={() => onStep({ kind: "budget", style: choice.id })} type="button">
                  {choice.label} <small>{choice.count}</small>
                </button>
              ))}
              <button onClick={() => onStep({ kind: "budget", style: null })} type="button">
                Any style
              </button>
            </div>
          </>
        ) : null}

        {step.kind === "budget" ? (
          <>
            <p className="walk-helper-say">
              {step.style ? `${step.style}, lovely. ` : ""}And roughly what would you like to spend?
            </p>
            <div className="walk-helper-choices">
              {budgetChoices(paintings, step.style).map((choice) => (
                <button
                  key={choice.id}
                  onClick={() =>
                    showResults(
                      findPaintings(paintings, { style: step.style, budget: choice.id }),
                      step.style ? `${step.style} paintings, ${choice.label.toLowerCase()}` : `Paintings ${choice.label.toLowerCase()}`
                    )
                  }
                  type="button"
                >
                  {choice.label} <small>{choice.count}</small>
                </button>
              ))}
              <button
                onClick={() =>
                  showResults(findPaintings(paintings, { style: step.style }), step.style ? `${step.style} paintings` : "Paintings")
                }
                type="button"
              >
                Any budget
              </button>
            </div>
          </>
        ) : null}

        {step.kind === "results" ? (
          <Results matches={step.matches} intro={step.intro} onGo={onGo} paintings={paintings} />
        ) : null}

        {step.kind === "about" ? (
          <About
            index={step.index}
            onMoreByArtist={(slug, name) =>
              showResults(findPaintings(paintings, { artistSlug: slug, exclude: step.index }), `More by ${name}`)
            }
            onSimilar={() => showResults(similarTo(paintings, step.index), "Paintings like this one")}
            paintings={paintings}
          />
        ) : null}
      </div>
    </aside>
  );
}

function Results({
  paintings,
  matches,
  intro,
  onGo
}: {
  paintings: readonly GalleryPainting[];
  matches: HelperMatches;
  intro: string;
  onGo: (indices: number[]) => void;
}) {
  if (!matches.indices.length) {
    return <p className="walk-helper-say">I couldn&apos;t find anything else on the walls just now. Try another search?</p>;
  }
  const relaxed = matches.relaxed.length
    ? `Nothing matched exactly, so I've looked beyond your ${matches.relaxed.join(" and ")}. These are the closest:`
    : null;
  const count = matches.indices.length;
  return (
    <>
      <p className="walk-helper-say">
        {relaxed ?? `${intro}: I found ${count === 1 ? "one for you" : `${count} for you`}. Shall I take you to them?`}
      </p>
      {count > 1 ? (
        <button className="walk-helper-tour" onClick={() => onGo(matches.indices)} type="button">
          Take me on a tour of all {count}
          <Icon name="arrowRight" size={16} />
        </button>
      ) : null}
      <ul className="walk-helper-results">
        {matches.indices.map((index, position) => {
          const painting = paintings[index];
          return painting ? (
            <PaintingCard key={painting.id} onGo={() => onGo(matches.indices.slice(position))} painting={painting} />
          ) : null;
        })}
      </ul>
    </>
  );
}

/** A painting the helper offers: its picture, the facts on its label, and a way there. */
function PaintingCard({ painting, onGo }: { painting: GalleryPainting; onGo: () => void }) {
  const size = [painting.dimensions, painting.price].filter(Boolean).join(" | ");
  return (
    <li className="walk-helper-card">
      <img alt={`${painting.title} by ${painting.artistName}`} loading="lazy" src={painting.thumbUrl} />
      <div>
        <strong>{painting.title}</strong>
        <small>{painting.artistName}</small>
        {painting.style ? <small>{painting.style}</small> : null}
        {painting.medium ? <small>{painting.medium}</small> : null}
        {size ? <small>{size}</small> : null}
      </div>
      <button onClick={onGo} type="button">
        Take me there
        <Icon name="arrowRight" size={14} />
      </button>
    </li>
  );
}

/**
 * Up to `count` paintings to suggest, each by a different artist where the
 * collection allows, in a random order.
 */
function pickSuggestions(paintings: readonly GalleryPainting[], count: number): number[] {
  const order = paintings.map((_, index) => index).sort(() => Math.random() - 0.5);
  const picked: number[] = [];
  const artists = new Set<string>();
  for (const index of order) {
    const painting = paintings[index];
    if (painting && !artists.has(painting.artistSlug)) {
      artists.add(painting.artistSlug);
      picked.push(index);
    }
    if (picked.length === count) {
      return picked;
    }
  }
  // Fewer artists than suggestions: fill up with more of their work.
  return [...picked, ...order.filter((index) => !picked.includes(index))].slice(0, count);
}

function About({
  paintings,
  index,
  onMoreByArtist,
  onSimilar
}: {
  paintings: readonly GalleryPainting[];
  index: number;
  onMoreByArtist: (slug: string, name: string) => void;
  onSimilar: () => void;
}) {
  const painting = paintings[index];
  if (!painting) {
    return null;
  }
  const story = aboutPainting(painting);
  const otherByArtist = paintings.some((other, otherIndex) => otherIndex !== index && other.artistSlug === painting.artistSlug);
  return (
    <>
      <p className="walk-helper-say">
        This is <strong>{painting.title}</strong> by {painting.artistName}. {story.details}
      </p>
      {story.description ? <p className="walk-helper-say walk-helper-quote">{story.description}</p> : null}
      <p className="walk-helper-say">
        {story.artist ? `About the artist — ${story.artist}` : `${painting.artistName} hasn't written about themselves yet, but their page shows all their work.`}
      </p>
      <div className="walk-helper-choices">
        {otherByArtist ? (
          <button onClick={() => onMoreByArtist(painting.artistSlug, painting.artistName)} type="button">
            More by {painting.artistName}
          </button>
        ) : null}
        <button onClick={onSimilar} type="button">
          Find similar paintings
        </button>
        <Link href={`/artwork/${painting.slug}`}>View this artwork</Link>
        <Link href={`/artist/${painting.artistSlug}`}>Visit the artist&apos;s page</Link>
      </div>
    </>
  );
}
