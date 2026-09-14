import { describe, expect, it } from "vite-plus/test";
import { Jimp } from "../src/jimp.ts";
import { searchAppStore } from "../src/icon.ts";

describe("App Store search", () => {
  it("URL-encodes the search and uses 512px artwork", async () => {
    const png = await new Jimp({ width: 8, height: 8, color: "#123456" }).getBuffer("image/png");
    const urls: string[] = [];

    const result = await searchAppStore("A&B / test", "gb", async (url) => {
      urls.push(url);

      if (urls.length === 1) {
        return new Response(
          JSON.stringify({
            results: [
              {
                trackName: "Found",
                artworkUrl512: "https://art/512",
                artworkUrl100: "https://art/100",
              },
            ],
          }),
        );
      }

      return new Response(png);
    });

    expect(result?.width).toBe(result?.height);
    expect(result?.width).toBeGreaterThan(100);
    expect(urls[0]).toContain("term=A%26B%20%2F%20test");
    expect(urls[0]).toContain("country=gb");
    expect(urls[1]).toBe("https://art/512");
  });

  it("falls back on HTTP failures and malformed responses", async () => {
    const failed = await searchAppStore(
      "missing",
      "us",
      async () => new Response("unavailable", { status: 503 }),
    );

    const malformed = await searchAppStore(
      "missing",
      "us",
      async () => new Response(JSON.stringify({ unexpected: true })),
    );

    expect(failed).toBeNull();
    expect(malformed).toBeNull();
  });

  it("returns null when search has no results or artwork", async () => {
    const noResults = await searchAppStore(
      "missing",
      "us",
      async () => new Response(JSON.stringify({ results: [] })),
    );

    const noArtwork = await searchAppStore(
      "missing",
      "us",
      async () => new Response(JSON.stringify({ results: [{ trackName: "No icon" }] })),
    );

    expect(noResults).toBeNull();
    expect(noArtwork).toBeNull();
  });
});
