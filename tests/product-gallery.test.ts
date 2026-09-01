import assert from "node:assert/strict";
import test from "node:test";

import { galleryImages, nextGalleryIndex } from "../src/lib/product-gallery.ts";

test("gallery retains every legitimate source image once", () => {
  const images = galleryImages([
    { url: "https://images.example/bag-front.jpg" },
    { url: "https://images.example/bag-side.jpg" },
    { url: "https://images.example/bag-front.jpg" },
    { url: null },
  ]);
  assert.deepEqual(
    images.map((image) => image.url),
    ["https://images.example/bag-front.jpg", "https://images.example/bag-side.jpg"],
  );
});

test("gallery next and previous controls wrap for mobile and keyboard navigation", () => {
  assert.equal(nextGalleryIndex(0, 8, -1), 7);
  assert.equal(nextGalleryIndex(7, 8, 1), 0);
});
